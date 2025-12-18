from typing import Any, Literal, Optional
from langchain.tools import tool
from langchain_openai import ChatOpenAI
from openai import OpenAI
from rapidfuzz import fuzz, process
import logging
from io import BytesIO

logger = logging.getLogger(__name__)


@tool
def speech_to_text() -> str:
    """
    Converts speech audio to text. 
    The audio file is automatically retrieved from the agent state.
    
    Returns:
        dict: Dictionary containing the transcribed text from the audio.
    """
    try:
        # Get audio bytes from global state
        global _agent_state
        audio_bytes = _agent_state.get("audio_bytes")
        
        if not audio_bytes:
            raise ValueError("Audio bytes not found in agent state. Make sure audio was provided in the request.")
        
        # Create a file-like object from bytes for OpenAI API
        audio_file = BytesIO(audio_bytes)
        audio_file.name = "audio.webm"
        audio_file.seek(0)
        
        client = OpenAI()
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="text"
        )
        logger.info(f"Transcript: {transcript}")
        return { "transcript": transcript }
    except Exception as e:
        logger.error(f"Speech-to-text failed: {str(e)}")
        raise


@tool
def format_shot_data(
    team: Literal['home', 'away'],
    player_index: int,
    shot_type: Literal['free_throw', 'two_point_shot', 'three_point_shot'],
    made: bool,
) -> dict:
    """
    Format structured JSON for shot-related data.
    """
    try:
        return {
            "category": "shot",
            "team": team,
            "player_index": player_index,
            "shot_type": shot_type,
            "made": made,
        }
    except Exception as e:
        logger.error(f"Error formatting shot data: {str(e)}")
        raise


@tool
def format_non_shot_data(
    team: Literal['home', 'away'],
    player_index: int,
    stat_type: Literal['assists', 'offensiveRebounds', 'defensiveRebounds', 'steals', 'blocks', 'turnovers', 'fouls'],
    delta: int = 1
) -> dict:
    """
    Format structured JSON for non-shot stats.
    """
    try:
        return {
            "category": "non-shot",
            "team": team,
            "player_index": player_index,
            "stat": stat_type,
            "delta": delta
        }
    except Exception as e:
        logger.error(f"Error formatting non-shot data: {str(e)}")
        raise

# Global state storage for tools (set by the agent)
_agent_state = {}

def set_agent_state(state: dict):
    """Set the agent state for tools to access."""
    global _agent_state
    _agent_state = state

@tool
def get_player_index(
    player_name: str, 
    team: Literal['home', 'away']
) -> dict:
    """
    Get the index of a player on a team using fuzzy matching. This should be called before calling the format_non_shot_data and format_shot_data tools.
    
    Uses the state's home_team_data and away_team_data to find the player.
    
    Args:
        player_name: The name of the player to find (can be partial or approximate)
        team: Either 'home' or 'away' to specify which team to search
    
    Returns:
        dict: Dictionary containing the player_index (0-based) of the matched player
    """
    try:
        global _agent_state
        
        # Get team data from state
        team_data_key = 'home_team_data' if team == 'home' else 'away_team_data'
        team_data = _agent_state.get(team_data_key)
        
        if not team_data:
            raise ValueError(f"{team}_team_data not found in state. Make sure state is set.")
        
        # Handle both dict and Pydantic model formats
        if hasattr(team_data, 'players'):
            players = team_data.players
        elif isinstance(team_data, dict):
            players = team_data.get('players', [])
        else:
            raise ValueError(f"Invalid format for {team}_team_data.")
        
        if not players:
            raise ValueError(f"No players found in {team}_team_data.")
        
        # Create a list of player names for fuzzy matching
        player_names = []
        for player in players:
            if hasattr(player, 'name'):
                player_names.append(player.name)
            elif isinstance(player, dict):
                player_names.append(player.get('name', ''))
            else:
                player_names.append(str(player))
        
        # Use fuzzy matching to find the best match
        result = process.extractOne(
            player_name,
            player_names,
            scorer=fuzz.WRatio,
            score_cutoff=60
        )
        
        if not result:
            logger.warning(f"Player '{player_name}' not found in {team} team")
            return (f"Could not find matching player for '{player_name}' in {team} team")
        
        matched_name, score, index = result
        logger.info(f"Matched '{player_name}' → '{matched_name}' (index: {index})")
        
        return {
            "player_index": index,
            "matched_name": matched_name,
            "confidence_score": score
        }
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"Error in get_player_index: {str(e)}")
        raise

