import pytest
from src.main import process_transcript

pytestmark = pytest.mark.integration


@pytest.mark.parametrize("transcript, expected", [
    # Shot - name match
    (
        "LeBron made a three pointer for the Lakers",
        {"category": "shot", "team": "home", "player_index": 0, "shot_type": "threePointer", "made": True},
    ),
    # Shot - missed
    (
        "Anthony Davis missed a free throw",
        {"category": "shot", "team": "home", "player_index": 1, "shot_type": "freeThrow", "made": False},
    ),
    # Shot - fuzzy name
    (
        "Steph Curry hit a two pointer for the Warriors",
        {"category": "shot", "team": "away", "player_index": 0, "shot_type": "twoPointer", "made": True},
    ),
    # Shot - jersey number match
    (
        "Lakers number 15 made a three",
        {"category": "shot", "team": "home", "player_index": 2, "shot_type": "threePointer", "made": True},
    ),
    # Non-shot - assist
    (
        "LeBron had an assist",
        {"category": "non-shot", "team": "home", "player_index": 0, "stat": "assists", "delta": 1},
    ),
    # Non-shot - steal
    (
        "Draymond Green got a steal for the Warriors",
        {"category": "non-shot", "team": "away", "player_index": 2, "stat": "steals", "delta": 1},
    ),
    # Ambiguous shared jersey, no team context → unclear which team
    (
        "number 23 made a shot",
        {"response": "unclear which team"},
    ),
    # No player info → unclear stat
    (
        "nice play out there",
        {"response": "unclear stat"},
    ),
])
def test_process_transcript(transcript, expected, home_team, away_team):
    result = process_transcript(transcript, home_team, away_team)
    if "response" in expected:
        assert result == expected
    else:
        assert result["response"] == expected
