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
│  4. process_transcript()  ← shared pipeline logic               │
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
│         utils/process_transcript.py — Step 1: Build Prompt       │
│                                                                  │
│  Combine transcript + home/away rosters + shared jersey note     │
│  into EXTRACTION_PROMPT_TEMPLATE  (utils/prompts.py)             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ filled prompt
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│         utils/process_transcript.py — Step 2: LLM Extraction     │
│                                                                  │
│  GPT-4o-mini  (structured output → ParsedEvent)                  │
│  Fields: decision, team, player_name, player_number,             │
│          shot_type, made, stat_type                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │ ParsedEvent
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│         utils/process_transcript.py — Step 3: Ambiguity Guard    │
│                                                                  │
│  If player_number appears on both rosters and no team context    │
│  is present in the transcript → return "unclear which team"      │
│  If decision="unclear" or missing player/team → return           │
│  "unclear stat"                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ validated ParsedEvent
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│         utils/process_transcript.py — Step 4: Player Resolution  │
│                                                                  │
│  get_player_index()  (tools.py)                                  │
│    ├─► Jersey number exact match        (priority 1)             │
│    └─► rapidfuzz fuzzy name match       (priority 2, cutoff=60)  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ player_index
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│         utils/process_transcript.py — Step 5: Format Output      │
│                                                                  │
│  ├─► format_shot_data()     → {category, team, player_index,     │
│  │                              shot_type, made}                 │
│  └─► format_non_shot_data() → {category, team, player_index,     │
│                                 stat, delta}                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Response to Client                            │
│                                                                  │
│  JSON: { "response": <shot_data | non_shot_data | "unclear ..."> }│
│  SSE:  progress events → final result event                      │
│        received → transcribing → transcribed → extracting → result│
└─────────────────────────────────────────────────────────────────┘
```

## Key Architectural Notes

- **Deterministic pipeline, not an agent graph** — there's no LangGraph or tool-calling loop. The LangChain tools (`format_shot_data`, `format_non_shot_data`, `get_player_index`) are used as plain functions, invoked directly.
- **Single LLM call** — GPT-4o-mini does one structured extraction (`ParsedEvent`) from the transcript. No multi-turn or chained LLM calls.
- **Module-level shared state** — `_agent_state` dict in `tools.py` is a global that stores team roster data, accessed by tools at call time.
- **Two endpoints, one pipeline** — both `/stats-from-audio` and `/stats-from-audio/stream` share the same `process_transcript()` logic; the streaming one wraps it with SSE progress events.

## SSE Progress Events (streaming endpoint)

`received → transcribing → transcribed → extracting → result`
