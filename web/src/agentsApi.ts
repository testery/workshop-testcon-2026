import type { Paginated } from "./api";

export type Agent = {
  id: number;
  name: string;
  description: string;
  created_at: string;
};

export type AgentInput = { name: string; description: string };

export type SessionStatus = "pending" | "running" | "failed" | "stopped";

export type Session = {
  id: number;
  title: string;
  agent: number;
  agent_name: string;
  container_id: string;
  container_url: string;
  container_status: SessionStatus;
  created_at: string;
};

export type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export async function listAgents(
  opts: { page?: number; search?: string } = {},
): Promise<Paginated<Agent>> {
  const params = new URLSearchParams();
  if (opts.page) params.set("page", String(opts.page));
  if (opts.search) params.set("search", opts.search);
  const qs = params.toString();
  const res = await fetch(`/api/agents/${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Failed to load agents: ${res.status}`);
  return res.json();
}

export async function createAgent(input: AgentInput): Promise<Agent> {
  const res = await fetch("/api/agents/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to create agent: ${res.status}`);
  return res.json();
}

export async function updateAgent(
  id: number,
  input: Partial<AgentInput>,
): Promise<Agent> {
  const res = await fetch(`/api/agents/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to update agent: ${res.status}`);
  return res.json();
}

export async function deleteAgent(id: number): Promise<void> {
  const res = await fetch(`/api/agents/${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete agent: ${res.status}`);
}

export async function listSessions(
  opts: { page?: number } = {},
): Promise<Paginated<Session>> {
  const params = new URLSearchParams();
  if (opts.page) params.set("page", String(opts.page));
  const qs = params.toString();
  const res = await fetch(`/api/sessions/${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Failed to load sessions: ${res.status}`);
  return res.json();
}

export async function getSession(id: number): Promise<Session> {
  const res = await fetch(`/api/sessions/${id}/`);
  if (!res.ok) throw new Error(`Failed to load session: ${res.status}`);
  return res.json();
}

export async function createSession(input: {
  title: string;
  agent: number;
}): Promise<Session> {
  const res = await fetch("/api/sessions/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
  return res.json();
}

export async function deleteSession(id: number): Promise<void> {
  const res = await fetch(`/api/sessions/${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete session: ${res.status}`);
}

export async function listSessionMessages(
  id: number,
): Promise<ChatMessage[]> {
  const res = await fetch(`/api/sessions/${id}/messages/`);
  if (!res.ok) throw new Error(`Failed to load messages: ${res.status}`);
  return res.json();
}

export async function sendSessionChat(
  id: number,
  message: string,
): Promise<ChatMessage> {
  const res = await fetch(`/api/sessions/${id}/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chat failed: ${res.status} ${text}`);
  }
  return res.json();
}
