import base64
import json
from unittest.mock import patch
from tests.fixtures.team_data import make_home_team, make_away_team


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_request_body(audio_b64: str):
    home = make_home_team()
    away = make_away_team()
    return {
        "audio_file": audio_b64,
        "home_team_data": home.model_dump(),
        "away_team_data": away.model_dump(),
    }


def _valid_empty_b64() -> str:
    return base64.b64encode(b"").decode()


def _parse_sse(body: str) -> list[dict]:
    """Parse SSE text/event-stream body into a list of event dicts."""
    events = []
    for block in body.strip().split("\n\n"):
        if not block.strip():
            continue
        event_type = None
        data = None
        for line in block.splitlines():
            if line.startswith("event:"):
                event_type = line[len("event:"):].strip()
            elif line.startswith("data:"):
                data = json.loads(line[len("data:"):].strip())
        if data is not None:
            events.append({"event": event_type, "data": data})
    return events


# ---------------------------------------------------------------------------
# Unit tests — no API key required
# ---------------------------------------------------------------------------

class TestHealthAndLoad:
    def test_health_check(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "healthy"

    def test_load_server(self, client):
        r = client.get("/load-server")
        assert r.status_code == 200
        assert r.json() == {"status": "ok"}


class TestInvalidAudio:
    def test_invalid_base64_returns_400(self, client):
        body = _make_request_body("not-valid-base64!!!")
        with patch("src.main.os.getenv", return_value="dummy-key"):
            r = client.post("/stats-from-audio", json=body)
        assert r.status_code == 400

    def test_empty_audio_returns_400(self, client):
        body = _make_request_body(_valid_empty_b64())
        with patch("src.main.os.getenv", return_value="dummy-key"):
            with patch(
                "src.main.decode_audio",
                side_effect=ValueError("Audio data is empty"),
            ):
                r = client.post("/stats-from-audio", json=body)
        assert r.status_code == 400


# ---------------------------------------------------------------------------
# Integration tests — require OPENAI_API_KEY
# ---------------------------------------------------------------------------

FAKE_TRANSCRIPT = "LeBron made a three pointer for the Lakers"
FAKE_AUDIO = base64.b64encode(b"\x00" * 16).decode()


class TestStatsFromAudio:
    def test_json_endpoint(self, client):
        body = _make_request_body(FAKE_AUDIO)
        with patch("src.main.decode_audio", return_value=b"\x00" * 16):
            with patch("src.main.transcribe_audio", return_value=FAKE_TRANSCRIPT):
                r = client.post("/stats-from-audio", json=body)
        assert r.status_code == 200
        data = r.json()
        assert "response" in data
        response = data["response"]
        assert isinstance(response, list)
        assert len(response) >= 1
        assert response[0]["category"] == "shot"
        assert response[0]["team"] == "home"
        assert response[0]["shot_type"] == "threePointer"
        assert response[0]["made"] is True

    def test_stream_endpoint_stage_sequence(self, client):
        body = _make_request_body(FAKE_AUDIO)
        with patch("src.main.decode_audio", return_value=b"\x00" * 16):
            with patch("src.main.transcribe_audio", return_value=FAKE_TRANSCRIPT):
                r = client.post("/stats-from-audio/stream", json=body)
        assert r.status_code == 200

        events = _parse_sse(r.text)
        stages = [
            e["data"]["stage"]
            for e in events
            if e["data"].get("type") == "progress"
        ]
        assert "transcribing" in stages
        assert "transcribed" in stages
        assert "extracting" in stages

        result_events = [e for e in events if e["data"].get("type") == "result"]
        assert len(result_events) == 1
        response = result_events[0]["data"]["response"]
        print('result_events', result_events)
        assert isinstance(response, list)
        assert len(response) >= 1
        assert response[0]["category"] == "shot"
