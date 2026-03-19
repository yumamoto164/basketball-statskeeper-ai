import os
import logging
from langchain_openai import ChatOpenAI
from src.utils.prompts import SEGMENTATION_PROMPT_TEMPLATE, EXTRACTION_PROMPT_TEMPLATE
from src.utils.types import ParsedEvent, TranscriptSegments
from src.tools import format_shot_data, format_non_shot_data, get_player_index, set_agent_state

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
    2. Extract: for each segment, extract a single ParsedEvent and format the result.
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

    # --- Shared extraction context ---
    home_roster = ", ".join([f"{p.name} (#{p.number})" for p in home_team_data.players])
    away_roster = ", ".join([f"{p.name} (#{p.number})" for p in away_team_data.players])
    home_numbers = {p.number for p in home_team_data.players}
    away_numbers = {p.number for p in away_team_data.players}
    shared_numbers = home_numbers & away_numbers
    if shared_numbers:
        shared_numbers_note = (
            f"- Jersey numbers {sorted(shared_numbers)} appear on both teams. "
            "If a player is identified only by one of these numbers and the team "
            "cannot be clearly determined from the transcript (e.g. no team name "
            "or home/away mentioned), set decision=\"unclear\"."
        )
    else:
        shared_numbers_note = ""

    extractor = model.with_structured_output(ParsedEvent.model_json_schema())

    # --- Phase 2: Extract + process each segment ---
    results = []

    for segment in segments:
        extraction_prompt = EXTRACTION_PROMPT_TEMPLATE.format(
            transcript=segment,
            home_roster=home_roster,
            away_roster=away_roster,
            home_team_name=home_team_data.team_name,
            away_team_name=away_team_data.team_name,
            shared_numbers_note=shared_numbers_note,
        )
        parsed_event = ParsedEvent.model_validate(extractor.invoke(extraction_prompt))

        if parsed_event.decision == "unclear" or (not parsed_event.player_name and not parsed_event.player_number) or not parsed_event.team:
            continue

        player_lookup = get_player_index.invoke(
            {"player_name": parsed_event.player_name, "player_number": parsed_event.player_number, "team": parsed_event.team}
        )
        if not isinstance(player_lookup, dict) or "player_index" not in player_lookup:
            continue

        player_index = int(player_lookup["player_index"])

        if parsed_event.decision == "shot":
            if parsed_event.shot_type is None or parsed_event.made is None:
                continue
            formatted = format_shot_data.invoke(
                {
                    "team": parsed_event.team,
                    "player_index": player_index,
                    "shot_type": parsed_event.shot_type,
                    "made": parsed_event.made,
                }
            )
        else:
            if parsed_event.stat_type is None:
                continue
            formatted = format_non_shot_data.invoke(
                {
                    "team": parsed_event.team,
                    "player_index": player_index,
                    "stat_type": parsed_event.stat_type,
                    "delta": 1,
                }
            )

        results.append(formatted)

    return {"response": results}
