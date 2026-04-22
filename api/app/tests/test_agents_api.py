import pytest

from app.models import Agent, ChatMessage, Session


@pytest.mark.django_db
def test_list_agents_empty(api_client):
    resp = api_client.get("/api/agents/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["count"] == 0
    assert body["results"] == []


@pytest.mark.django_db
def test_create_agent(api_client):
    resp = api_client.post(
        "/api/agents/",
        {"name": "Researcher", "description": "Looks things up"},
        format="json",
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Researcher"
    assert body["description"] == "Looks things up"
    assert Agent.objects.count() == 1


@pytest.mark.django_db
def test_search_agents(api_client):
    Agent.objects.create(name="Researcher", description="reads things")
    Agent.objects.create(name="Writer", description="writes things")
    body = api_client.get("/api/agents/?search=research").json()
    assert body["count"] == 1
    assert body["results"][0]["name"] == "Researcher"


@pytest.mark.django_db
def test_update_agent(api_client):
    agent = Agent.objects.create(name="Old", description="x")
    resp = api_client.patch(
        f"/api/agents/{agent.id}/", {"name": "New"}, format="json"
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "New"


@pytest.mark.django_db
def test_delete_agent(api_client):
    agent = Agent.objects.create(name="Tmp", description="")
    resp = api_client.delete(f"/api/agents/{agent.id}/")
    assert resp.status_code == 204
    assert Agent.objects.count() == 0


@pytest.mark.django_db
def test_create_session_starts_container(api_client):
    agent = Agent.objects.create(name="Researcher", description="r")
    resp = api_client.post(
        "/api/sessions/",
        {"title": "First chat", "agent": agent.id},
        format="json",
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "First chat"
    assert body["agent"] == agent.id
    assert body["agent_name"] == "Researcher"
    assert body["container_status"] == Session.STATUS_RUNNING
    assert body["container_id"].startswith("fake-")
    assert body["container_url"].startswith("http://fake/")


@pytest.mark.django_db
def test_session_create_marks_failed_when_runner_raises(api_client, fake_agent_runner):
    def boom(**kwargs):
        raise RuntimeError("docker is down")

    fake_agent_runner.start = boom  # type: ignore[assignment]

    agent = Agent.objects.create(name="Researcher", description="r")
    resp = api_client.post(
        "/api/sessions/",
        {"title": "Doomed", "agent": agent.id},
        format="json",
    )
    assert resp.status_code == 201
    session = Session.objects.get(pk=resp.json()["id"])
    assert session.container_status == Session.STATUS_FAILED


@pytest.mark.django_db
def test_list_sessions_filter_by_agent(api_client):
    a1 = Agent.objects.create(name="A1", description="")
    a2 = Agent.objects.create(name="A2", description="")
    api_client.post("/api/sessions/", {"title": "s1", "agent": a1.id}, format="json")
    api_client.post("/api/sessions/", {"title": "s2", "agent": a2.id}, format="json")

    body = api_client.get(f"/api/sessions/?agent={a1.id}").json()
    assert body["count"] == 1
    assert body["results"][0]["title"] == "s1"


@pytest.mark.django_db
def test_chat_round_trip(api_client):
    agent = Agent.objects.create(name="Bot", description="")
    create = api_client.post(
        "/api/sessions/", {"title": "Chat", "agent": agent.id}, format="json"
    ).json()
    sid = create["id"]

    resp = api_client.post(
        f"/api/sessions/{sid}/chat/",
        {"message": "Hello"},
        format="json",
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["role"] == "assistant"
    assert "echo: Hello" in body["content"]

    msgs = api_client.get(f"/api/sessions/{sid}/messages/").json()
    assert [m["role"] for m in msgs] == ["user", "assistant"]
    assert msgs[0]["content"] == "Hello"
    assert ChatMessage.objects.filter(session_id=sid).count() == 2


@pytest.mark.django_db
def test_chat_requires_message(api_client):
    agent = Agent.objects.create(name="Bot", description="")
    sid = api_client.post(
        "/api/sessions/", {"title": "Chat", "agent": agent.id}, format="json"
    ).json()["id"]
    resp = api_client.post(f"/api/sessions/{sid}/chat/", {"message": ""}, format="json")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_chat_blocked_when_container_not_running(api_client):
    agent = Agent.objects.create(name="Bot", description="")
    session = Session.objects.create(
        title="t", agent=agent, container_status=Session.STATUS_FAILED
    )
    resp = api_client.post(
        f"/api/sessions/{session.id}/chat/", {"message": "hi"}, format="json"
    )
    assert resp.status_code == 409


@pytest.mark.django_db
def test_delete_session_stops_container(api_client, fake_agent_runner):
    stopped = []
    original_stop = fake_agent_runner.stop

    def track_stop(container_id):
        stopped.append(container_id)
        original_stop(container_id)

    fake_agent_runner.stop = track_stop  # type: ignore[assignment]

    agent = Agent.objects.create(name="Bot", description="")
    sid = api_client.post(
        "/api/sessions/", {"title": "Chat", "agent": agent.id}, format="json"
    ).json()["id"]

    resp = api_client.delete(f"/api/sessions/{sid}/")
    assert resp.status_code == 204
    assert len(stopped) == 1
    assert stopped[0].startswith("fake-")
