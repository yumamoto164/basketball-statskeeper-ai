from src.utils.types import Player, TeamData


def make_home_team() -> TeamData:
    return TeamData(
        team_name="LA Lakers",
        players=[
            Player(name="Lebron James", number="6"),
            Player(name="Anthony Davis", number="3"),
            Player(name="Austin Reaves", number="15"),
            Player(name="D'Angelo Russell", number="1"),
            Player(name="Rui Hachimura", number="28"),
            Player(name="Jarred Vanderbilt", number="2"),
            Player(name="Gabe Vincent", number="7"),
            Player(name="Taurean Prince", number="12"),
            Player(name="Max Christie", number="10"),
            Player(name="Jaxson Hayes", number="11"),
            Player(name="Michael Jordan", number="23")
        ]
    )


def make_away_team() -> TeamData:
    return TeamData(
        team_name="Golden State Warriors",
        players=[
            Player(name="Stephen Curry", number="30"),
            Player(name="Klay Thompson", number="11"),
            Player(name="Draymond Green", number="23"),
            Player(name="Andrew Wiggins", number="22"),
            Player(name="Kevon Looney", number="5"),
            Player(name="Chris Paul", number="3"),
            Player(name="Jonathan Kuminga", number="00"),
            Player(name="Gary Payton II", number="8"),
            Player(name="Moses Moody", number="4"),
            Player(name="Dario Saric", number="20"),
        ]
    )
