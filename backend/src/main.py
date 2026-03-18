from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError
import os
import logging
import time
from dotenv import load_dotenv
from src.utils.types import Request
from src.utils.sse_utils import _encode_sse, _normalize_api_response
from src.utils.audio import decode_audio, transcribe_audio
from src.utils.process_transcript import process_transcript
from src.tools import set_agent_state

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
        if not os.getenv("OPENAI_API_KEY"):
            logger.error("OPENAI_API_KEY not found")
            raise HTTPException(
                status_code=500,
                detail="OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
            )

        try:
            audio_bytes = decode_audio(request.audio_file)
        except Exception as e:
            logger.error(f"Failed to decode base64 audio: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid base64 audio encoding: {str(e)}")

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

        try:
            stt_start = time.perf_counter()
            transcript = transcribe_audio(audio_bytes)
            stt_latency = time.perf_counter() - stt_start
            logger.info(f"[latency] stage=speech_to_text_end latency_seconds={stt_latency:.3f}")
        except Exception as e:
            logger.error(f"Speech-to-text processing failed: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to transcribe audio: {str(e)}")

        try:
            result = process_transcript(transcript, request.home_team_data, request.away_team_data)
        except Exception as e:
            logger.error(f"Failed to process transcript: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to process transcript: {str(e)}")

        total_request_latency = time.perf_counter() - request_start_time
        logger.info(f"[latency] request_end latency_seconds={total_request_latency:.3f}")
        return result

    except HTTPException:
        raise
    except ValidationError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=422, detail=f"Invalid request data: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in stats_from_audio: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


@app.post("/stats-from-audio/stream")
async def stats_from_audio_stream(request: Request):
    """Stream processing progress and final result as SSE events."""
    request_start_time = time.perf_counter()

    async def event_generator():
        try:
            if not os.getenv("OPENAI_API_KEY"):
                raise HTTPException(
                    status_code=500,
                    detail="OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.",
                )

            yield _encode_sse(
                {"type": "progress", "stage": "received", "message": "Request received"},
                event="progress",
            )

            try:
                audio_bytes = decode_audio(request.audio_file)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid base64 audio encoding: {str(e)}")

            set_agent_state({
                "home_team_data": request.home_team_data,
                "away_team_data": request.away_team_data,
            })

            yield _encode_sse(
                {"type": "progress", "stage": "transcribing", "message": "Transcribing audio"},
                event="progress",
            )

            stt_start = time.perf_counter()
            transcript = transcribe_audio(audio_bytes)
            stt_latency = time.perf_counter() - stt_start
            logger.info(f"[latency] stream_stage=speech_to_text_end latency_seconds={stt_latency:.3f}")

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

            result = process_transcript(transcript, request.home_team_data, request.away_team_data)

            normalized = _normalize_api_response(result["response"])
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
