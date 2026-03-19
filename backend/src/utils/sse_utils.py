import json
from typing import Any

def _encode_sse(data: dict, event: str = "message") -> str:
    """Encode a payload as an SSE frame."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _normalize_api_response(raw_response: Any):
    """Normalize backend formatter response for frontend consumption."""
    if isinstance(raw_response, list):
        return raw_response
    return []