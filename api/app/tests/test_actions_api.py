import pytest

from app.models import Action, AuditEvent


EMAIL_CHANGE_BODY = {
    "type": "USER_EMAIL_CHANGE",
    "payload": {"oldEmail": "old@example.com", "newEmail": "new@example.com"},
}


@pytest.mark.django_db
def test_create_action_returns_id_and_status(api_client):
    response = api_client.post(
        "/api/actions/", EMAIL_CHANGE_BODY, format="json",
        HTTP_IDEMPOTENCY_KEY="abc-123",
    )
    assert response.status_code == 201
    body = response.json()
    assert set(body.keys()) == {"id", "status"}
    assert body["id"].startswith("act_")
    assert body["status"] == "ACCEPTED"
    assert Action.objects.count() == 1
    audit = list(Action.objects.get().audit.values_list("event", flat=True))
    assert audit == [AuditEvent.EVENT_ACTION_CREATED]


@pytest.mark.django_db
def test_idempotent_replay_returns_same_response(api_client):
    first = api_client.post(
        "/api/actions/", EMAIL_CHANGE_BODY, format="json",
        HTTP_IDEMPOTENCY_KEY="abc-123",
    )
    assert first.status_code == 201
    second = api_client.post(
        "/api/actions/", EMAIL_CHANGE_BODY, format="json",
        HTTP_IDEMPOTENCY_KEY="abc-123",
    )
    assert second.status_code == 200
    assert second.json() == first.json()
    assert Action.objects.count() == 1
    audit = list(Action.objects.get().audit.values_list("event", flat=True))
    assert audit == [
        AuditEvent.EVENT_ACTION_CREATED,
        AuditEvent.EVENT_IDEMPOTENCY_REPLAY,
    ]


@pytest.mark.django_db
def test_idempotency_conflict_returns_409(api_client):
    first = api_client.post(
        "/api/actions/", EMAIL_CHANGE_BODY, format="json",
        HTTP_IDEMPOTENCY_KEY="abc-123",
    )
    assert first.status_code == 201

    conflict = api_client.post(
        "/api/actions/",
        {
            "type": "USER_EMAIL_CHANGE",
            "payload": {"oldEmail": "old@example.com", "newEmail": "different@example.com"},
        },
        format="json",
        HTTP_IDEMPOTENCY_KEY="abc-123",
    )
    assert conflict.status_code == 409
    assert "error" in conflict.json()
    assert Action.objects.count() == 1
    audit = list(Action.objects.get().audit.values_list("event", flat=True))
    assert audit == [
        AuditEvent.EVENT_ACTION_CREATED,
        AuditEvent.EVENT_IDEMPOTENCY_CONFLICT,
    ]


@pytest.mark.django_db
def test_get_action_returns_audit_history(api_client):
    created = api_client.post(
        "/api/actions/", EMAIL_CHANGE_BODY, format="json",
        HTTP_IDEMPOTENCY_KEY="abc-123",
    ).json()
    api_client.post(
        "/api/actions/", EMAIL_CHANGE_BODY, format="json",
        HTTP_IDEMPOTENCY_KEY="abc-123",
    )

    response = api_client.get(f"/api/actions/{created['id']}/")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == created["id"]
    assert body["type"] == "USER_EMAIL_CHANGE"
    assert body["payload"] == EMAIL_CHANGE_BODY["payload"]
    assert body["status"] == "ACCEPTED"
    assert "createdAt" in body
    events = [entry["event"] for entry in body["audit"]]
    assert events == [
        AuditEvent.EVENT_ACTION_CREATED,
        AuditEvent.EVENT_IDEMPOTENCY_REPLAY,
    ]
    for entry in body["audit"]:
        assert "timestamp" in entry


@pytest.mark.django_db
def test_get_unknown_action_returns_404(api_client):
    response = api_client.get("/api/actions/act_doesnotexist/")
    assert response.status_code == 404


@pytest.mark.django_db
def test_missing_idempotency_key_returns_400(api_client):
    response = api_client.post("/api/actions/", EMAIL_CHANGE_BODY, format="json")
    assert response.status_code == 400
    assert Action.objects.count() == 0


@pytest.mark.django_db
def test_invalid_body_returns_400(api_client):
    no_type = api_client.post(
        "/api/actions/", {"payload": {"oldX": 1, "newX": 2}}, format="json",
        HTTP_IDEMPOTENCY_KEY="key-1",
    )
    assert no_type.status_code == 400

    bad_payload = api_client.post(
        "/api/actions/", {"type": "X", "payload": "not-an-object"}, format="json",
        HTTP_IDEMPOTENCY_KEY="key-2",
    )
    assert bad_payload.status_code == 400

    blank_type = api_client.post(
        "/api/actions/", {"type": "   ", "payload": {}}, format="json",
        HTTP_IDEMPOTENCY_KEY="key-3",
    )
    assert blank_type.status_code == 400

    assert Action.objects.count() == 0
