from src.utils.types import Player, TeamData


def make_home_team() -> TeamData:
    return TeamData(
        team_name="Lakers",
        players=[
            Player(name="LeBron James", number="23"),
            Player(name="Anthony Davis", number="3"),
            Player(name="Austin Reaves", number="15"),
        ]
    )


def make_away_team() -> TeamData:
    return TeamData(
        team_name="Warriors",
        players=[
            Player(name="Stephen Curry", number="30"),
            Player(name="Klay Thompson", number="11"),
            Player(name="Draymond Green", number="23"),  # shared with home #23
        ]
    )
