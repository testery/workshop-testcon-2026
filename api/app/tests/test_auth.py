import pytest


@pytest.mark.django_db
def test_unauthenticated_request_rejected(anonymous_client):
    response = anonymous_client.get("/api/items/")
    assert response.status_code in (401, 403)


@pytest.mark.django_db
def test_health_is_public(anonymous_client):
    response = anonymous_client.get("/api/health/")
    assert response.status_code in (200, 503)


def test_auth_me_reports_unauthenticated(anonymous_client):
    response = anonymous_client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json() == {"authenticated": False}
