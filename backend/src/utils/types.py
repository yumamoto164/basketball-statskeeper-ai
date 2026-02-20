from pydantic import BaseModel
from typing import List, Literal, Optional

class Player(BaseModel):
    name: str
    number: str

class TeamData(BaseModel):
    team_name: str
    players: List[Player]

class Request(BaseModel):
    audio_file: str  # Base64-encoded audio file as string
    home_team_data: TeamData
    away_team_data: TeamData

class ParsedEvent(BaseModel):
    decision: Literal["shot", "non_shot", "unclear"]
    player_name: Optional[str] = None
    player_number: Optional[str] = None  # jersey number, e.g. "10", when mentioned instead of name
    team: Optional[Literal["home", "away"]] = None
    shot_type: Optional[Literal["freeThrow", "twoPointer", "threePointer"]] = None
    made: Optional[bool] = None
    stat_type: Optional[
        Literal[
            "assists",
            "offensiveRebounds",
            "defensiveRebounds",
            "steals",
            "blocks",
            "turnovers",
            "fouls",
        ]
    ] = None