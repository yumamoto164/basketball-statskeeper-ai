import os
import logging
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from langchain_openai import ChatOpenAI
from src.utils.prompts import SEGMENTATION_PROMPT_TEMPLATE
from src.utils.types import ParsedEvent, TranscriptSegments
from src.tools import set_agent_state
from src.utils.process_segment import process_segment

logger = logging.getLogger(__name__)


def process_transcript(
    transcript: str,
    home_team_data,
    away_team_data,
) -> dict:
    """
    Process a transcript string and extract basketball statistics.
    Shared logic used by both endpoint handlers (skipping audio/transcription).

    Two-phase pipeline:
    1. Segment: split transcript into self-contained single-event descriptions (resolves pronouns).
    2. Extract: for each segment, extract a single ParsedEvent and format the result (parallelized).
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not configured")

    set_agent_state({"home_team_data": home_team_data, "away_team_data": away_team_data})

    model = ChatOpenAI(model="gpt-4o-mini", api_key=api_key, temperature=0)

    # --- Phase 1: Segment ---
    segmenter = model.with_structured_output(TranscriptSegments.model_json_schema())
    segments = TranscriptSegments.model_validate(
        segmenter.invoke(SEGMENTATION_PROMPT_TEMPLATE.format(transcript=transcript))
    ).segments
    logger.info(f"Segmented into {len(segments)} event(s): {segments}")

    # --- Phase 2: Extract + process each segment (parallelized) ---
    home_roster = ", ".join([f"{p.name} (#{p.number})" for p in home_team_data.players])
    away_roster = ", ".join([f"{p.name} (#{p.number})" for p in away_team_data.players])
    shared_numbers = {p.number for p in home_team_data.players} & {p.number for p in away_team_data.players}
    shared_numbers_note = (
        f"- Jersey numbers {sorted(shared_numbers)} appear on both teams. "
        "If a player is identified only by one of these numbers and the team "
        "cannot be clearly determined from the transcript (e.g. no team name "
        "or home/away mentioned), set decision=\"unclear\"."
    ) if shared_numbers else ""
    extractor = model.with_structured_output(ParsedEvent.model_json_schema())

    _process = partial(
        process_segment,
        extractor=extractor,
        home_roster=home_roster,
        away_roster=away_roster,
        home_team_name=home_team_data.team_name,
        away_team_name=away_team_data.team_name,
        shared_numbers_note=shared_numbers_note,
    )
    with ThreadPoolExecutor() as executor:
        raw_results = executor.map(_process, segments)

    results = [r for r in raw_results if r is not None]

    return {"response": results}
