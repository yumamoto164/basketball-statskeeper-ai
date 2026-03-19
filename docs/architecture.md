# Backend Architecture

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Frontend)                         │
│              React + TypeScript (statsFromAudioService)          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ POST base64 audio + team rosters
                           │
              ┌────────────┴─────────────┐
              │                          │
              ▼                          ▼
   /stats-from-audio             /stats-from-audio/stream
   (JSON response)               (SSE streaming response)
              │                          │
              └────────────┬─────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        main.py (FastAPI)                         │
│                                                                  │
│  1. decode_audio()        ← base64 → bytes                       │
│  2. set_agent_state()     ← stores team rosters in module global │
│  3. transcribe_audio()    ─────────────────────────────────────► │
│  4. process_transcript()  ← shared pipeline logic                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  utils/audio.py                                  │
│                                                                  │
│  transcribe_audio()                                              │
│    └─► OpenAI Whisper API (whisper-1)  →  transcript string      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ transcript
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│      utils/process_transcript.py — Phase 1: Segmentation         │
│                                                                  │
│  GPT-4o-mini  (structured output → TranscriptSegments)           │
│  Splits transcript into self-contained single-event strings,     │
│  resolving pronouns and implicit references.                     │
│  e.g. "LeBron passes, he scores" →                               │
│       ["LeBron James gets an assist",                            │
│        "Anthony Davis scores a two-pointer"]                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ list of segments
                           │
                           │  ┌─────────────────────────────────┐
                           │  │  repeat for each segment:       │
                           ▼  ▼                                 │
┌─────────────────────────────────────────────────────────────────┐
│      utils/process_transcript.py — Phase 2: LLM Extraction       │
│                                                                  │
│  GPT-4o-mini  (structured output → ParsedEvent)                  │
│  Fields: decision, team, player_name, player_number,             │
│          shot_type, made, stat_type                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │ ParsedEvent
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│      utils/process_transcript.py — Phase 2: Clarity Check        │
│                                                                  │
│  If decision="unclear" or missing player/team → skip event       │
└──────────────────────────┬──────────────────────────────────────┘
                           │ validated ParsedEvent
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│      utils/process_transcript.py — Phase 2: Player Resolution    │
│                                                                  │
│  get_player_index()  (tools.py)                                  │
│    ├─► Jersey number exact match        (priority 1)             │
│    └─► rapidfuzz fuzzy name match       (priority 2, cutoff=60)  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ player_index
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│      utils/process_transcript.py — Phase 2: Format Output        │
│                                                                  │
│  ├─► format_shot_data()     → {category, team, player_index,     │
│  │                              shot_type, made}                 │
│  └─► format_non_shot_data() → {category, team, player_index,     │
│                                 stat, delta}                     │
│                                                    │             │
│                                   append to results list         │
└─────────────────────────────────────────────────────────────────┘
                           │  (loop ends)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Response to Client                            │
│                                                                  │
│  JSON: { "response": [ <event>, <event>, ... ] }                 │
│  SSE:  progress events → final result event                      │
│        received → transcribing → transcribed → extracting → result│
└─────────────────────────────────────────────────────────────────┘
```

## Key Architectural Notes

- **Two-phase LLM pipeline, not an agent graph** — Phase 1 segments the transcript into self-contained event descriptions (resolving pronouns). Phase 2 runs one structured extraction per segment. No LangGraph or tool-calling loop.
- **Multiple LLM calls** — one GPT-4o-mini call for segmentation, then one per segment for extraction. Total calls = 1 + N where N is the number of events in the transcript.
- **Response is always a list** — `process_transcript()` returns `{"response": [...]}` with 0 or more events. Single-event transcripts return a one-element list.
- **Module-level shared state** — `_agent_state` dict in `tools.py` is a global that stores team roster data, accessed by tools at call time.
- **Two endpoints, one pipeline** — both `/stats-from-audio` and `/stats-from-audio/stream` share the same `process_transcript()` logic; the streaming one wraps it with SSE progress events.

## SSE Progress Events (streaming endpoint)

`received → transcribing → transcribed → extracting → result`
