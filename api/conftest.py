import pytest
from rest_framework.test import APIClient

from config.auth import SessionUser


@pytest.fixture
def api_client():
    client = APIClient()
    client.force_authenticate(
        user=SessionUser({"sub": "demo|test", "email": "test@example.com", "name": "Test User"})
    )
    return client


@pytest.fixture
def anonymous_client():
    return APIClient()
