import pytest
from src.tools import get_player_index, set_agent_state


@pytest.fixture(autouse=True)
def setup_state(home_team, away_team):
    set_agent_state({"home_team_data": home_team, "away_team_data": away_team})


def test_jersey_number_exact_match():
    result = get_player_index.invoke({"team": "home", "player_number": "3"})
    assert result["player_index"] == 1
    assert result["matched_name"] == "Anthony Davis"


def test_fuzzy_name_match():
    result = get_player_index.invoke({"team": "away", "player_name": "Steph Curry"})
    assert result["player_index"] == 0


def test_jersey_takes_priority_over_wrong_name():
    result = get_player_index.invoke({"team": "home", "player_number": "3", "player_name": "LeBron James"})
    assert result["player_index"] == 1  # #3 = Anthony Davis, not LeBron


def test_unknown_player_returns_string():
    result = get_player_index.invoke({"team": "home", "player_name": "ZZZZZ Unknown"})
    assert isinstance(result, str)
