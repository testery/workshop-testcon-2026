"""Manages persistent agent containers backing each Session.

Mirrors the "persistent" pattern from the archetype-agent-patterns project:
each Session gets its own long-running container (built from
archetype-agent-patterns:latest, command `uvicorn patterns.p3_persistent...`)
that holds the conversation in process memory and exposes /chat/{user_id}.

Swappable via settings.AGENT_RUNNER_BACKEND so tests can use the in-memory
FakeAgentRunner without requiring Docker.
"""

from __future__ import annotations

import importlib
import logging
import os
from collections import defaultdict
from dataclasses import dataclass
from typing import Protocol

from django.conf import settings

logger = logging.getLogger(__name__)


@dataclass
class ContainerHandle:
    container_id: str
    url: str


class AgentRunner(Protocol):
    def start(self, session_id: int, agent_name: str, agent_description: str) -> ContainerHandle: ...
    def chat(self, container_id: str, url: str, user_id: str, message: str) -> str: ...
    def stop(self, container_id: str) -> None: ...


class DockerAgentRunner:
    """Spins up one archetype-agent-patterns p3_persistent container per session."""

    IMAGE = "archetype-agent-patterns:latest"
    INTERNAL_PORT = 8003

    def start(self, session_id: int, agent_name: str, agent_description: str) -> ContainerHandle:
        import docker

        env = {
            "AGENT_NAME": agent_name,
            "AGENT_DESCRIPTION": agent_description,
        }
        api_key = os.getenv("ANTHROPIC_API_KEY") or getattr(
            settings, "ANTHROPIC_API_KEY", ""
        )
        if not api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set — the persistent agent container "
                "needs it to call the Claude API."
            )
        env["ANTHROPIC_API_KEY"] = api_key

        client = docker.from_env()
        container = client.containers.run(
            self.IMAGE,
            command=[
                "uvicorn",
                "patterns.p3_persistent.__main__:app",
                "--host",
                "0.0.0.0",
                "--port",
                str(self.INTERNAL_PORT),
            ],
            detach=True,
            labels={
                "app": "example-webapp-session",
                "session_id": str(session_id),
                "agent_name": agent_name,
            },
            environment=env,
            ports={f"{self.INTERNAL_PORT}/tcp": None},
        )
        container.reload()
        host_port = (
            container.attrs["NetworkSettings"]["Ports"][f"{self.INTERNAL_PORT}/tcp"][0]["HostPort"]
        )
        url = f"http://localhost:{host_port}"
        return ContainerHandle(container_id=container.id, url=url)

    def chat(self, container_id: str, url: str, user_id: str, message: str) -> str:
        import requests

        resp = requests.post(
            f"{url}/chat/{user_id}",
            json={"message": message},
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()["reply"]

    def stop(self, container_id: str) -> None:
        import docker

        try:
            client = docker.from_env()
            c = client.containers.get(container_id)
            c.stop(timeout=5)
            c.remove()
        except Exception:
            logger.exception("Failed to stop container %s", container_id)


class FakeAgentRunner:
    """In-memory stand-in used by tests and when Docker is unavailable."""

    def __init__(self) -> None:
        self._counter = 0
        self._history: dict[str, list[str]] = defaultdict(list)

    def start(self, session_id: int, agent_name: str, agent_description: str) -> ContainerHandle:
        self._counter += 1
        cid = f"fake-{session_id}-{self._counter}"
        return ContainerHandle(container_id=cid, url=f"http://fake/{cid}")

    def chat(self, container_id: str, url: str, user_id: str, message: str) -> str:
        self._history[container_id].append(message)
        turn = len(self._history[container_id])
        return f"[fake reply #{turn}] echo: {message}"

    def stop(self, container_id: str) -> None:
        self._history.pop(container_id, None)


_runner: AgentRunner | None = None


def get_runner() -> AgentRunner:
    global _runner
    if _runner is None:
        path = getattr(
            settings, "AGENT_RUNNER_BACKEND", "app.agent_runner.DockerAgentRunner"
        )
        module_name, class_name = path.rsplit(".", 1)
        cls = getattr(importlib.import_module(module_name), class_name)
        _runner = cls()
    return _runner


def set_runner(runner: AgentRunner | None) -> None:
    """Test hook to override the runner."""
    global _runner
    _runner = runner
