import pytest
from fastapi.testclient import TestClient
from src.main import app
from tests.fixtures.team_data import make_home_team, make_away_team


@pytest.fixture(scope="session")
def home_team():
    return make_home_team()


@pytest.fixture(scope="session")
def away_team():
    return make_away_team()


@pytest.fixture(scope="session")
def client():
    return TestClient(app)
