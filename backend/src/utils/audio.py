import base64
from src.tools import speech_to_text, set_agent_state


def decode_audio(audio_b64: str) -> bytes:
    """Base64-decode audio string → raw bytes. Raises ValueError if empty."""
    audio_bytes = base64.b64decode(audio_b64)
    if not audio_bytes:
        raise ValueError("Decoded audio is empty")
    return audio_bytes


def transcribe_audio(audio_bytes: bytes) -> str:
    """Set agent state with audio bytes and call Whisper. Returns transcript string."""
    set_agent_state({"audio_bytes": audio_bytes})
    result = speech_to_text.invoke({})
    transcript = result.get("transcript", "") if isinstance(result, dict) else ""
    if not transcript:
        raise ValueError("Transcription returned empty result")
    return transcript
