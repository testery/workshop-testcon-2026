import pytest
from rest_framework.test import APIClient

from app.agent_runner import FakeAgentRunner, set_runner
from config.auth import Auth0User


@pytest.fixture
def api_client():
    client = APIClient()
    client.force_authenticate(
        user=Auth0User({"sub": "auth0|test", "email": "test@example.com", "name": "Test User"})
    )
    return client


@pytest.fixture
def anonymous_client():
    return APIClient()


@pytest.fixture(autouse=True)
def fake_agent_runner():
    runner = FakeAgentRunner()
    set_runner(runner)
    yield runner
    set_runner(None)
