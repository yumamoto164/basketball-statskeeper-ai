from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError
from langchain_openai import ChatOpenAI
import os
import base64
import logging
import time
from dotenv import load_dotenv
from src.utils.prompts import EXTRACTION_PROMPT_TEMPLATE
from src.utils.types import ParsedEvent, Request
from src.utils.sse_utils import _encode_sse, _normalize_api_response
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

@app.post("/stats-from-audio")
async def stats_from_audio(request: Request):
    """
    Process audio file and extract basketball statistics.
    
    Args:
        request: Request containing base64-encoded audio and team data
        
    Returns:
        JSON response with extracted statistics or error message
    """
    request_start_time = time.perf_counter()
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
        
        # Initialize the model for deterministic extraction
        try:
            model = ChatOpenAI(
                model="gpt-4o-mini",
                api_key=api_key,
                temperature=0
            )
            extractor = model.with_structured_output(ParsedEvent.model_json_schema())
        except Exception as e:
            logger.error(f"Failed to initialize LLM extractor: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initialize LLM extractor: {str(e)}"
            )
        
        # 1) Deterministic first step: speech_to_text
        try:
            stt_start = time.perf_counter()
            stt_result = speech_to_text.invoke({})
            stt_latency = time.perf_counter() - stt_start
            logger.info(
                f"[latency] stage=speech_to_text_end latency_seconds={stt_latency:.3f}"
            )
        except Exception as e:
            logger.error(f"Speech-to-text processing failed: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to transcribe audio: {str(e)}"
            )

        transcript = stt_result.get("transcript") if isinstance(stt_result, dict) else None
        if not transcript:
            raise HTTPException(
                status_code=500,
                detail="Speech-to-text returned empty transcript"
            )

        # 2) Deterministic middle step: one structured LLM extraction call
        try:
            llm_extract_start = time.perf_counter()
            home_roster = ", ".join([f"{p.name} (#{p.number})" for p in request.home_team_data.players])
            away_roster = ", ".join([f"{p.name} (#{p.number})" for p in request.away_team_data.players])
            home_numbers = {p.number for p in request.home_team_data.players}
            away_numbers = {p.number for p in request.away_team_data.players}
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
                
            extraction_prompt = EXTRACTION_PROMPT_TEMPLATE.format(
                transcript=transcript,
                home_roster=home_roster,
                away_roster=away_roster,
                home_team_name=request.home_team_data.team_name,
                away_team_name=request.away_team_data.team_name,
                shared_numbers_note=shared_numbers_note,
            )
            parsed_event = ParsedEvent.model_validate(extractor.invoke(extraction_prompt))
            llm_extract_latency = time.perf_counter() - llm_extract_start
            logger.info(
                f"[latency] agent_iteration_end iteration=1 latency_seconds={llm_extract_latency:.3f}"
            )
        except Exception as e:
            logger.error(
                f"[latency] agent_iteration_error iteration=1 error={str(e)}"
            )
            raise HTTPException(
                status_code=500,
                detail=f"Failed to extract stat event from transcript: {str(e)}"
            )

        # Deterministic guard: shared jersey number with no team context in transcript → unclear
        if parsed_event.player_number and parsed_event.player_number in shared_numbers:
            transcript_lower = transcript.lower()
            team_context_present = (
                request.home_team_data.team_name.lower() in transcript_lower
                or request.away_team_data.team_name.lower() in transcript_lower
                or "home" in transcript_lower
                or "away" in transcript_lower
            )
            if not team_context_present:
                logger.info("Ambiguous jersey number with no team context → unclear team")
                return {"response": "unclear which team"}

        if parsed_event.decision == "unclear" or (not parsed_event.player_name and not parsed_event.player_number) or not parsed_event.team:
            total_request_latency = time.perf_counter() - request_start_time
            logger.info(
                f"[latency] request_end latency_seconds={total_request_latency:.3f}"
            )
            return {"response": "unclear stat"}

        # 3) Deterministic player resolution
        try:
            player_lookup = get_player_index.invoke(
                {"player_name": parsed_event.player_name, "player_number": parsed_event.player_number, "team": parsed_event.team}
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to resolve player index: {str(e)}"
            )

        if not isinstance(player_lookup, dict) or "player_index" not in player_lookup:
            total_request_latency = time.perf_counter() - request_start_time
            logger.info(
                f"[latency] request_end latency_seconds={total_request_latency:.3f}"
            )
            return {"response": "unclear stat"}

        player_index = int(player_lookup["player_index"])

        # 4) Deterministic final step: exactly one formatter tool
        try:
            if parsed_event.decision == "shot":
                if parsed_event.shot_type is None or parsed_event.made is None:
                    formatted = "unclear stat"
                else:
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
                    formatted = "unclear stat"
                else:
                    formatted = format_non_shot_data.invoke(
                        {
                            "team": parsed_event.team,
                            "player_index": player_index,
                            "stat_type": parsed_event.stat_type,
                            "delta": 1,
                        }
                    )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to format stat response: {str(e)}"
            )

        total_request_latency = time.perf_counter() - request_start_time
        logger.info(
            f"[latency] request_end latency_seconds={total_request_latency:.3f}"
        )
        return {"response": formatted}
        
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


@app.post("/stats-from-audio/stream")
async def stats_from_audio_stream(request: Request):
    """Stream processing progress and final result as SSE events."""
    request_start_time = time.perf_counter()

    async def event_generator():
        try:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise HTTPException(
                    status_code=500,
                    detail="OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.",
                )

            yield _encode_sse(
                {"type": "progress", "stage": "received", "message": "Request received"},
                event="progress",
            )

            try:
                audio_bytes = base64.b64decode(request.audio_file)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid base64 audio encoding: {str(e)}")

            if len(audio_bytes) == 0:
                raise HTTPException(status_code=400, detail="Audio file is empty")

            set_agent_state(
                {
                    "home_team_data": request.home_team_data,
                    "away_team_data": request.away_team_data,
                    "audio_bytes": audio_bytes,
                }
            )

            model = ChatOpenAI(model="gpt-4o-mini", api_key=api_key, temperature=0)
            extractor = model.with_structured_output(ParsedEvent.model_json_schema())

            yield _encode_sse(
                {"type": "progress", "stage": "transcribing", "message": "Transcribing audio"},
                event="progress",
            )

            stt_start = time.perf_counter()
            stt_result = speech_to_text.invoke({})
            stt_latency = time.perf_counter() - stt_start
            logger.info(f"[latency] stream_stage=speech_to_text_end latency_seconds={stt_latency:.3f}")

            transcript = stt_result.get("transcript") if isinstance(stt_result, dict) else None
            if not transcript:
                raise HTTPException(status_code=500, detail="Speech-to-text returned empty transcript")

            yield _encode_sse(
                {
                    "type": "progress",
                    "stage": "transcribed",
                    "message": "Audio transcription complete",
                    "transcript": str(transcript),
                },
                event="progress",
            )

            yield _encode_sse(
                {"type": "progress", "stage": "extracting", "message": "Extracting structured stat event"},
                event="progress",
            )

            llm_extract_start = time.perf_counter()
            home_roster = ", ".join([f"{p.name} (#{p.number})" for p in request.home_team_data.players])
            away_roster = ", ".join([f"{p.name} (#{p.number})" for p in request.away_team_data.players])
            home_numbers = {p.number for p in request.home_team_data.players}
            away_numbers = {p.number for p in request.away_team_data.players}
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
            extraction_prompt = EXTRACTION_PROMPT_TEMPLATE.format(
                transcript=transcript,
                home_roster=home_roster,
                away_roster=away_roster,
                home_team_name=request.home_team_data.team_name,
                away_team_name=request.away_team_data.team_name,
                shared_numbers_note=shared_numbers_note,
            )
            parsed_event = ParsedEvent.model_validate(extractor.invoke(extraction_prompt))
            llm_extract_latency = time.perf_counter() - llm_extract_start
            logger.info(f"[latency] stream_agent_iteration_end iteration=1 latency_seconds={llm_extract_latency:.3f}")

            # Deterministic guard: shared jersey number with no team context in transcript → unclear
            if parsed_event.player_number and parsed_event.player_number in shared_numbers:
                transcript_lower = transcript.lower()
                team_context_present = (
                    request.home_team_data.team_name.lower() in transcript_lower
                    or request.away_team_data.team_name.lower() in transcript_lower
                    or "home" in transcript_lower
                    or "away" in transcript_lower
                )
                if not team_context_present:
                    logger.info("Ambiguous jersey number with no team context → unclear team")
                    total_request_latency = time.perf_counter() - request_start_time
                    logger.info(f"[latency] stream_request_end latency_seconds={total_request_latency:.3f}")
                    yield _encode_sse({"type": "result", "response": "unclear which team"}, event="result")
                    return

            if parsed_event.decision == "unclear" or (not parsed_event.player_name and not parsed_event.player_number) or not parsed_event.team:
                total_request_latency = time.perf_counter() - request_start_time
                logger.info(f"[latency] stream_request_end latency_seconds={total_request_latency:.3f}")
                yield _encode_sse(
                    {"type": "result", "response": "unclear stat"},
                    event="result",
                )
                return

            yield _encode_sse(
                {"type": "progress", "stage": "resolving_player", "message": "Resolving player index"},
                event="progress",
            )

            player_lookup = get_player_index.invoke(
                {"player_name": parsed_event.player_name, "player_number": parsed_event.player_number, "team": parsed_event.team}
            )
            if not isinstance(player_lookup, dict) or "player_index" not in player_lookup:
                total_request_latency = time.perf_counter() - request_start_time
                logger.info(f"[latency] stream_request_end latency_seconds={total_request_latency:.3f}")
                yield _encode_sse({"type": "result", "response": "unclear stat"}, event="result")
                return

            player_index = int(player_lookup["player_index"])
            yield _encode_sse(
                {"type": "progress", "stage": "formatting", "message": "Formatting stat output"},
                event="progress",
            )

            if parsed_event.decision == "shot":
                if parsed_event.shot_type is None or parsed_event.made is None:
                    formatted = "unclear stat"
                else:
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
                    formatted = "unclear stat"
                else:
                    formatted = format_non_shot_data.invoke(
                        {
                            "team": parsed_event.team,
                            "player_index": player_index,
                            "stat_type": parsed_event.stat_type,
                            "delta": 1,
                        }
                    )

            normalized = _normalize_api_response(formatted)
            total_request_latency = time.perf_counter() - request_start_time
            logger.info(f"[latency] stream_request_end latency_seconds={total_request_latency:.3f}")
            yield _encode_sse({"type": "result", "response": normalized}, event="result")
        except HTTPException as e:
            yield _encode_sse(
                {"type": "error", "status_code": e.status_code, "detail": e.detail},
                event="error",
            )
        except Exception as e:
            logger.error(f"Unexpected stream error in stats_from_audio_stream: {str(e)}", exc_info=True)
            yield _encode_sse(
                {"type": "error", "status_code": 500, "detail": f"An unexpected error occurred: {str(e)}"},
                event="error",
            )

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Basketball Stats Keeper AI",
        "version": "1.0.0"
    }

@app.get("/load-server")
async def load_server():
    """Endpoint to wake up the server (Render free tier)."""
    return {"status": "ok"}
