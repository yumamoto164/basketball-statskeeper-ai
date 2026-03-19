# Phase 2 Parallelization

## Context

The backend pipeline has two phases:

1. **Segment** — one LLM call splits the transcript into individual event descriptions
2. **Extract** — one LLM call per segment extracts a `ParsedEvent`, fuzzy-matches the player, and formats the result

Phase 2 was originally sequential (a `for` loop). It was changed to run segments in parallel using `ThreadPoolExecutor`.

## Why parallelize Phase 2

Each segment in Phase 2 is fully independent — no segment depends on the output of another. The dominant cost per segment is the round-trip to the OpenAI API (~500–1500ms). Running them sequentially means total Phase 2 time scales linearly:

```
sequential:  N segments × ~1000ms = N seconds
parallel:    ~1000ms regardless of N (bounded by the slowest segment)
```

For a typical voice recording covering 3–5 events, this turns a 3–5 second wait into roughly 1 second.

## Why `ThreadPoolExecutor` (not `asyncio`)

The OpenAI client used here is the synchronous LangChain wrapper (`ChatOpenAI`). Parallelizing sync I/O-bound work is the exact use case `ThreadPoolExecutor` is designed for — it offloads each blocking call to a thread, allowing them to run concurrently without rewriting the call sites to be async.

Using `asyncio` would require either switching to `AsyncChatOpenAI` throughout or wrapping sync calls in `asyncio.to_thread`, adding complexity for no benefit given the existing sync codebase.

## Tradeoffs

**Cost** — Parallel calls consume API quota faster. For 4 segments, all 4 LLM calls fire simultaneously rather than one at a time. In practice this is negligible for a low-traffic app, but worth knowing if usage scales.

**Error isolation** — A failure in one segment doesn't block others. `process_segment` returns `None` for invalid/unclear events, and the caller filters them out. An unhandled exception in a thread will propagate when `executor.map` iterates results, which is the correct behavior.

**Thread pool sizing** — `ThreadPoolExecutor()` with no argument defaults to `min(32, os.cpu_count() + 4)` threads. For typical transcript lengths (1–6 segments) this is more than sufficient and the pool is reused for the duration of the `with` block.
