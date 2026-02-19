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

FastAPI app with a deterministic pipeline (single LLM call + fuzzy matching, no LangGraph agent graph at runtime):

1. **`main.py`** — Two endpoints: `POST /stats-from-audio` (JSON) and `POST /stats-from-audio/stream` (SSE). Both decode base64 audio, run transcription, extract stats, resolve player names, and return formatted results.
2. **`tools.py`** — LangChain tools used as helper functions (not as agent tools):
   - `speech_to_text()` — OpenAI Whisper API
   - `format_shot_data()` / `format_non_shot_data()` — GPT-4o-mini structured output
   - `get_player_index()` — rapidfuzz fuzzy matching against team roster
   - `set_agent_state()` — sets a module-level `_agent_state` dict shared between tools
3. **`utils/types.py`** — Pydantic models: `Player`, `TeamData`, `Request`, `ParsedEvent`
4. **`utils/prompts.py`** — LLM system prompts for stat extraction
5. **`utils/sse_utils.py`** — SSE encoding/decoding helpers

SSE progress events (streaming endpoint): `received → transcribing → transcribed → extracting → resolving_player → formatting → result`

### Frontend (`frontend/src/`)

React 19 + TypeScript + Vite. MUI for UI components.

- **`App.tsx`** — Root with `StatsContext` (React Context) providing home/away player arrays. Also wakes up the Render backend on mount via `/load-server`.
- **`types.ts`** — `Player` interface with all stat fields (points, shot breakdowns, assists, rebounds, steals, blocks, turnovers, fouls).
- **`components/StatKeeper.tsx`** — Main game orchestrator. Manages selected player, stat updates, and per-player shot undo stacks.
- **`components/AudioRecorder.tsx`** — Button that opens `AudioRecorderModal`.
- **`components/AudioRecorderModal.tsx`** — Recording UI using `react-voice-visualizer`. Currently incomplete — needs to call `statsFromAudioService` and push result back into game state.
- **`utils/statsFromAudioService.ts`** — Service layer. Converts audio Blob to base64, calls `/stats-from-audio/stream` (with SSE) or `/stats-from-audio` fallback. Returns typed `ShotResult | NonShotResult`.

### Data Flow for Voice Input

```
User records audio
  → AudioRecorderModal (captures Blob)
  → statsFromAudioService (base64 encode, POST to backend)
  → backend: Whisper transcription → GPT-4o-mini extraction → rapidfuzz player match
  → SSE progress events → final result JSON
  → StatKeeper updates player stats
```
