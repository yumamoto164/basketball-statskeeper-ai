import pytest
from src.utils.process_transcript import process_transcript


@pytest.mark.parametrize("transcript, expected_events", [
    # Shot - name match
    (
        "LeBron made a three pointer for the Lakers",
        [{"category": "shot", "team": "home", "player_index": 0, "shot_type": "threePointer", "made": True}],
    ),
    # Shot - missed
    (
        "Anthony Davis missed a free throw",
        [{"category": "shot", "team": "home", "player_index": 1, "shot_type": "freeThrow", "made": False}],
    ),
    # Shot - fuzzy name
    (
        "Steph Curry hit a two pointer for the Warriors",
        [{"category": "shot", "team": "away", "player_index": 0, "shot_type": "twoPointer", "made": True}],
    ),
    # Shot - jersey number match
    (
        "Lakers number 6 made a three",
        [{"category": "shot", "team": "home", "player_index": 0, "shot_type": "threePointer", "made": True}],
    ),
    # Non-shot - assist
    (
        "LeBron had an assist",
        [{"category": "non-shot", "team": "home", "player_index": 0, "stat": "assists", "delta": 1}],
    ),
    # Non-shot - steal
    (
        "Draymond Green got a steal for the Warriors",
        [{"category": "non-shot", "team": "away", "player_index": 2, "stat": "steals", "delta": 1}],
    ),
    # Ambiguous shared jersey, no team context and there are two players on opposite teams that are #23 → empty list
    (
        "number 23 made a shot",
        [],
    ),
    # Ambiguous jersey, no team context but player and team can be inferred -> record stat
    (
        "number 22 makes a three",
        [{"category": "shot", "team": "away", "player_index": 3, "shot_type": "threePointer", "made": True}]
    ),
    # No player info → empty list
    (
        "nice play out there",
        [],
    ),
])
def test_process_transcript(transcript, expected_events, home_team, away_team):
    result = process_transcript(transcript, home_team, away_team)
    assert "response" in result
    assert isinstance(result["response"], list)
    assert len(result["response"]) == len(expected_events)
    for i, expected in enumerate(expected_events):
        assert result["response"][i] == expected



@pytest.mark.parametrize("transcript, expected_events", [
    # Pass + score: assist for LeBron, 2-pointer made for Anthony Davis
    (
        "LeBron passes to Anthony Davis, Anthony Davis scores a two-pointer for the Lakers",
        [
            {"category": "non-shot", "team": "home", "player_index": 0, "stat": "assists", "delta": 1},
            {"category": "shot", "team": "home", "player_index": 1, "shot_type": "twoPointer", "made": True},
        ],
    ),
    # Miss + offensive rebound + score
    (
        "Steph Curry missed a three, Draymond Green got the offensive rebound, Draymond scored a two-pointer for the Warriors",
        [
            {"category": "shot", "team": "away", "player_index": 0, "shot_type": "threePointer", "made": False},
            {"category": "non-shot", "team": "away", "player_index": 2, "stat": "offensiveRebounds", "delta": 1},
            {"category": "shot", "team": "away", "player_index": 2, "shot_type": "twoPointer", "made": True},
        ],
    ),
])

def test_process_transcript_multi_event(transcript, expected_events, home_team, away_team):
    pass
    result = process_transcript(transcript, home_team, away_team)
    assert "response" in result
    assert isinstance(result["response"], list)
    assert len(result["response"]) == len(expected_events)
    for i, expected in enumerate(expected_events):
        assert result["response"][i] == expected