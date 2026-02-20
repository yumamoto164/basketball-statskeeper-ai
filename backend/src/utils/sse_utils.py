import json
from typing import Any

def _encode_sse(data: dict, event: str = "message") -> str:
    """Encode a payload as an SSE frame."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _normalize_api_response(raw_response: Any):
    """Normalize backend formatter response for frontend consumption."""
    if raw_response and isinstance(raw_response, dict):
        if raw_response.get("category") == "shot":
            return raw_response
        if raw_response.get("category") == "non-shot":
            return raw_response
    if raw_response in ("unclear stat", "unclear which team"):
        return raw_response
    return "unclear stat"