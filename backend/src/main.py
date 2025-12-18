from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
from langchain.agents import create_agent, AgentState
from langchain_openai import ChatOpenAI
import os
import base64
import json
import logging
from dotenv import load_dotenv
from typing import List
from src.tools import speech_to_text, format_shot_data, format_non_shot_data, get_player_index, set_agent_state

load_dotenv()

# Configure logging - console only
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()  # Console only
    ]
)
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
    You are a basketball stats interpretation agent. Your job is to convert audio descriptions of basketball plays into structured stat data.

    CRITICAL WORKFLOW (follow these steps in order):
    1. Convert audio to text using speech_to_text() tool (no parameters needed - audio is automatically available).
    2. From the transcript, identify:
       - The player's name mentioned in the play
       - Which team they belong to (home or away)
       - Use the state's "home_team_data" and "away_team_data" to match player names
       - Each team data contains a list of players with names and numbers
       - Match the player name from transcript to players in home_team_data.players or away_team_data.players. There should be only one match.
    3. Determine the stat type:
       - Is it a SHOT (made/missed field goal or free throw)?
       - Or is it a NON-SHOT stat (rebound, assist, steal, block, turnover, foul)?
    4. Get the player index using get_player_index(player_name, team).
       - This MUST be called before formatting any stat
       - Use the player name from step 2 and the team (home/away)
    5. Call EXACTLY ONE formatter tool:
       - For shots: use format_shot_data
       - For non-shots: use format_non_shot_data
    6. If the stat is ambiguous or unclear, respond with "unclear stat" and do NOT call any formatter.

    SHOT CLASSIFICATION:
    - Shot types must be one of: 'free_throw', 'two_point_shot', 'three_point_shot'
    - "three", "three-pointer", "three-point shot" → 'three_point_shot'
    - "two", "two-pointer", "two-point shot", "layup", "dunk", "jumper", "field goal" → 'two_point_shot'
    - "free throw", "foul shot" → 'free_throw'
    - Determine if shot was "made" (true) or "missed" (false) from keywords like "hits", "makes", "scores" vs "misses", "missed"

    NON-SHOT STAT TYPES:
    - "assist", "assists" → 'assists'
    - "offensive rebound", "offensive board" → 'offensiveRebounds'
    - "defensive rebound", "defensive board" → 'defensiveRebounds'
    - "steal", "steals" → 'steals'
    - "block", "blocks", "blocked shot" → 'blocks'
    - "turnover", "turnovers", "loses the ball" → 'turnovers'
    - "foul", "fouls", "personal foul" → 'fouls'

    EXAMPLES:
    Shot examples:
    - "Mike hits a three" → format_shot_data(team='home', player_index=X, shot_type='three_point_shot', made=True)
    - "Sarah misses a layup" → format_shot_data(team='away', player_index=Y, shot_type='two_point_shot', made=False)
    - "John makes a free throw" → format_shot_data(team='home', player_index=Z, shot_type='free_throw', made=True)
    
    Non-shot examples:
    - "Tom gets a rebound" → format_non_shot_data(team='home', player_index=X, stat_type='defensiveRebounds')
    - "Lisa with the assist" → format_non_shot_data(team='away', player_index=Y, stat_type='assists')
    - "Chris steals the ball" → format_non_shot_data(team='home', player_index=Z, stat_type='steals')

    IMPORTANT RULES:
    - ALWAYS call get_player_index before calling format_shot_data or format_non_shot_data
    - Use the player_index returned by get_player_index in the formatter tools
    - If you cannot determine the player, team, or stat type clearly, respond with "unclear stat"
    - Do NOT guess or make assumptions about ambiguous plays
    - End immediately after calling a formatter tool or determining the stat is unclear
"""

app = FastAPI(title="Basketball Stats Keeper AI", version="1.0.0")

# Configure CORS - allow all origins (no security restrictions)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,  # Must be False when allow_origins=["*"]
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred. Please try again later.",
            "detail": str(exc) if os.getenv("DEBUG", "false").lower() == "true" else None
        }
    )

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

class CustomState(AgentState):
    home_team_data: TeamData = TeamData(team_name="", players=[])
    away_team_data: TeamData = TeamData(team_name="", players=[])
    audio_bytes: bytes = b""

@app.post("/stats-from-audio")
async def stats_from_audio(request: Request):
    """
    Process audio file and extract basketball statistics.
    
    Args:
        request: Request containing base64-encoded audio and team data
        
    Returns:
        JSON response with extracted statistics or error message
    """
    try:
        # Validate API key
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.error("OPENAI_API_KEY not found")
            raise HTTPException(
                status_code=500,
                detail="OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
            )
        
        # Decode base64 audio string to bytes
        try:
            audio_bytes = base64.b64decode(request.audio_file)
        except Exception as e:
            logger.error(f"Failed to decode base64 audio: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid base64 audio encoding: {str(e)}"
            )
        
        # Validate audio file size
        if len(audio_bytes) == 0:
            logger.error("Audio file is empty")
            raise HTTPException(
                status_code=400,
                detail="Audio file is empty"
            )
        
        # Set the agent state so tools can access it
        try:
            set_agent_state({
                "home_team_data": request.home_team_data,
                "away_team_data": request.away_team_data,
                "audio_bytes": audio_bytes,
            })
        except Exception as e:
            logger.error(f"Failed to set agent state: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initialize agent state: {str(e)}"
            )
        
        # Initialize the model and create agent
        try:
            model = ChatOpenAI(
                model="gpt-4o-mini",
                api_key=api_key,
                temperature=0
            )
            agent_graph = create_agent(
                model,
                [speech_to_text, format_shot_data, format_non_shot_data, get_player_index],
                system_prompt=SYSTEM_PROMPT,
                state_schema=CustomState,
            )
        except Exception as e:
            logger.error(f"Failed to initialize agent: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initialize agent: {str(e)}"
            )
        
        # Invoke the agent
        logger.info("Processing audio...")
        try:
            response = agent_graph.invoke(
                {
                    "messages": [{"role": "user", "content": "Process the audio file to extract basketball statistics."}],
                    "home_team_data": request.home_team_data,
                    "away_team_data": request.away_team_data,
                    "audio_bytes": audio_bytes,
                }
            )
        except Exception as e:
            logger.error(f"Agent processing failed: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process audio: {str(e)}"
            )
        
        # Extract response - look for formatter tool output
        if not response or "messages" not in response or len(response["messages"]) == 0:
            logger.error("Agent returned empty response")
            raise HTTPException(
                status_code=500,
                detail="Agent returned empty response"
            )
        
        formatter_tools = ["format_shot_data", "format_non_shot_data"]
        tool_result = None
        
        # Search messages in reverse for the last formatter tool result
        for message in reversed(response["messages"]):
            # Check if message has tool name attribute
            tool_name = getattr(message, 'name', None)
            
            if tool_name in formatter_tools:
                # Extract content
                content = getattr(message, 'content', None)
                
                if content:
                    # If content is already a dict, use it
                    if isinstance(content, dict):
                        tool_result = content
                        break
                    # If content is a string, try to parse as JSON
                    elif isinstance(content, str):
                        try:
                            tool_result = json.loads(content)
                            break
                        except json.JSONDecodeError:
                            continue
        
        # Return tool result or fallback to last message
        if tool_result:
            return {"response": tool_result}
        else:
            last_message = response["messages"][-1]
            return {"response": getattr(last_message, 'content', str(last_message))}
        
    except HTTPException:
        # Re-raise HTTP exceptions (they're already properly formatted)
        raise
    except ValidationError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=422,
            detail=f"Invalid request data: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error in stats_from_audio: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Basketball Stats Keeper AI",
        "version": "1.0.0"
    }
