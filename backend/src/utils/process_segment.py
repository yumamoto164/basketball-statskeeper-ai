from src.utils.prompts import EXTRACTION_PROMPT_TEMPLATE
from src.utils.types import ParsedEvent
from src.tools import format_shot_data, format_non_shot_data, get_player_index

def process_segment(
    segment: str,
    extractor,
    home_roster: str,
    away_roster: str,
    home_team_name: str,
    away_team_name: str,
    shared_numbers_note: str,
) -> dict | None:
    extraction_prompt = EXTRACTION_PROMPT_TEMPLATE.format(
        transcript=segment,
        home_roster=home_roster,
        away_roster=away_roster,
        home_team_name=home_team_name,
        away_team_name=away_team_name,
        shared_numbers_note=shared_numbers_note,
    )
    parsed_event = ParsedEvent.model_validate(extractor.invoke(extraction_prompt))

    if parsed_event.decision == "unclear" or (not parsed_event.player_name and not parsed_event.player_number) or not parsed_event.team:
        return None

    player_lookup = get_player_index.invoke(
        {"player_name": parsed_event.player_name, "player_number": parsed_event.player_number, "team": parsed_event.team}
    )
    if not isinstance(player_lookup, dict) or "player_index" not in player_lookup:
        return None

    player_index = int(player_lookup["player_index"])

    if parsed_event.decision == "shot":
        if parsed_event.shot_type is None or parsed_event.made is None:
            return None
        return format_shot_data.invoke(
            {
                "team": parsed_event.team,
                "player_index": player_index,
                "shot_type": parsed_event.shot_type,
                "made": parsed_event.made,
            }
        )
    else:
        if parsed_event.stat_type is None:
            return None
        return format_non_shot_data.invoke(
            {
                "team": parsed_event.team,
                "player_index": player_index,
                "stat_type": parsed_event.stat_type,
                "delta": 1,
            }
        )