# `/stats-from-audio` Streaming Rollout

## What was added

The service now supports a streaming endpoint in addition to the existing JSON endpoint:

- `POST /stats-from-audio` (existing, non-streaming fallback)
- `POST /stats-from-audio/stream` (new, SSE progress + final result)

This keeps backward compatibility while enabling incremental UI updates.

## Protocol choice (phase 1)

For first rollout, the implementation uses **minimal SSE JSON events** over `POST`.

Why:

- Works with current FastAPI + Vite stack immediately.
- No additional server deployment required.
- Easy to migrate later to richer AG-UI conventions if needed.

## Event format

Response media type: `text/event-stream`

SSE frames include:

- `event: progress` with `data: { type, stage, message, transcript? }`
- `event: result` with `data: { type, response }`
- `event: error` with `data: { type, status_code, detail }`

Example `progress` stages:

- `received`
- `transcribing`
- `transcribed`
- `extracting`
- `resolving_player`
- `formatting`

## Final result contract

The `result` event payload matches the existing response contract:

- Shot:
  - `category`, `team`, `player_index`, `shot_type`, `made`
- Non-shot:
  - `category`, `team`, `player_index`, `stat`, `delta`
- Unclear:
  - `"unclear stat"`

## Frontend behavior

`frontend/src/utils/statsFromAudioService.ts` now:

- tries streaming first via `POST /stats-from-audio/stream`
- emits progress to the caller callback
- falls back to `POST /stats-from-audio` on streaming failure

`frontend/src/components/AudioRecorder.tsx` now renders live processing messages from stream events.

## Rollout/feature flag

Frontend supports an environment switch:

- `VITE_USE_STREAMING_STATS=true` (default behavior)
- `VITE_USE_STREAMING_STATS=false` (force old non-streaming flow)

This allows controlled rollout without backend redeploy changes.
