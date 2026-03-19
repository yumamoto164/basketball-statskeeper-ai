# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Basketball Statskeeper AI — a monorepo web app for tracking basketball game statistics with AI-powered voice input. React/TypeScript frontend + Python FastAPI backend.

## Commands

### Development

```bash
npm run dev              # Run both frontend & backend concurrently
npm run dev:frontend     # Frontend only (http://localhost:5173)
npm run dev:backend      # Backend only (http://localhost:8000)
```

### Frontend

```bash
npm run build            # Build frontend (runs build:frontend workspace)
npm run lint --workspace=frontend  # ESLint
```

### Backend

```bash
cd backend && pip install -r requirements.txt  # Install Python deps
```

### Install Everything

```bash
npm run install:all      # npm install + frontend workspace
npm run install:backend  # pip install -r backend/requirements.txt
```

## Environment Variables

**Backend** (`backend/.env`):

- `OPENAI_API_KEY` — required for Whisper (transcription) and GPT-4o-mini (stat extraction)

**Frontend** (`frontend/.env`):

- `VITE_API_URL` — backend URL (default: `http://localhost:8000`)
- `VITE_USE_STREAMING_STATS` — enable SSE streaming (default: `true`)

## Architecture

### Backend (`backend/src/`)

FastAPI app with a two-phase LLM pipeline + fuzzy matching (no LangGraph agent graph at runtime):

1. **`main.py`** — Two endpoints: `POST /stats-from-audio` (JSON) and `POST /stats-from-audio/stream` (SSE). Both decode base64 audio, run transcription, call `process_transcript`, and return a list of formatted stat results.
2. **`utils/process_transcript.py`** — Pipeline orchestrator. Two-phase approach:
   - **Phase 1 (Segment):** One GPT-4o-mini call splits the transcript into self-contained single-event descriptions, resolving pronouns and implicit references (e.g. "he scores" → "Anthony Davis scores").
   - **Phase 2 (Extract):** Dispatches each segment to `process_segment` in parallel via `ThreadPoolExecutor`. Returns `{"response": [...]}` — always a list.
3. **`utils/process_segment.py`** — Handles extraction for a single segment. One GPT-4o-mini call extracts a `ParsedEvent` (structured output), rapidfuzz resolves the player name/number to a roster index, and the result is formatted. Returns a dict or `None` if the event is unclear/invalid.
4. **`tools.py`** — LangChain tools used as helper functions (not as agent tools):
   - `format_shot_data()` / `format_non_shot_data()` — formats a resolved event for the frontend
   - `get_player_index()` — rapidfuzz fuzzy matching against team roster
   - `set_agent_state()` — sets a module-level `_agent_state` dict shared between tools
5. **`utils/types.py`** — Pydantic models: `Player`, `TeamData`, `Request`, `ParsedEvent`, `TranscriptSegments`
6. **`utils/prompts.py`** — LLM prompts: `SEGMENTATION_PROMPT_TEMPLATE` (Phase 1) and `EXTRACTION_PROMPT_TEMPLATE` (Phase 2)
7. **`utils/sse_utils.py`** — SSE encoding helpers and `_normalize_api_response`

SSE progress events (streaming endpoint): `received → transcribing → transcribed → extracting → result`

### Frontend (`frontend/src/`)

React 19 + TypeScript + Vite. MUI for UI components.

- **`App.tsx`** — Root with `StatsContext` (React Context) providing home/away player arrays. Also wakes up the Render backend on mount via `/load-server`.
- **`types.ts`** — `Player` interface with all stat fields (points, shot breakdowns, assists, rebounds, steals, blocks, turnovers, fouls).
- **`components/StatKeeper.tsx`** — Main game orchestrator. Manages selected player, stat updates, and per-player shot undo stacks.
- **`components/AudioRecorder.tsx`** — Button that opens `AudioRecorderModal`.
- **`components/AudioRecorderModal.tsx`** — Recording UI. Calls `statsFromAudioService`, iterates over the returned array of results, and applies each stat update to the game state. Displays a summary of all events processed.
- **`utils/statsFromAudioService.ts`** — Service layer. Converts audio Blob to base64, calls `/stats-from-audio/stream` (with SSE) or `/stats-from-audio` fallback. Returns `StatsFromAudioResult[]` — always an array.

### Data Flow for Voice Input

```
User records audio
  → AudioRecorderModal (captures Blob)
  → statsFromAudioService (base64 encode, POST to backend)
  → backend: Whisper transcription
      → Phase 1: GPT-4o-mini segments transcript into individual events (resolves pronouns)
      → Phase 2: segments dispatched in parallel → each: GPT-4o-mini extracts ParsedEvent → rapidfuzz player match → format
  → SSE progress events → final result JSON (array of events)
  → AudioRecorderModal iterates results → StatKeeper updates each player's stats
```
