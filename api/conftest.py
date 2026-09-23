import re
from pathlib import Path

import pytest
from django.db import connection
from rest_framework.test import APIClient

from config.auth import SessionUser

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "db" / "migrations"


def _version(path: Path) -> int:
    return int(re.match(r"V(\d+)__", path.name).group(1))


@pytest.fixture(scope="session")
def django_db_setup(django_db_setup, django_db_blocker):
    """The app tables are unmanaged, so the test database gets the Flyway SQL applied in order."""
    migrations = sorted(MIGRATIONS_DIR.glob("V*__*.sql"), key=_version)
    if not migrations:
        raise RuntimeError(
            f"No Flyway migrations found in {MIGRATIONS_DIR}. Run pytest from the repo (api/), "
            "or inside the api container, which mounts db/migrations at /db/migrations."
        )
    with django_db_blocker.unblock():
        with connection.cursor() as cursor:
            for path in migrations:
                cursor.execute(path.read_text(encoding="utf-8"))


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
