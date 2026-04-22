import { useEffect, useState } from "react";
import {
  createSession,
  deleteSession,
  listAgents,
  listSessions,
  type Agent,
  type Session,
} from "./agentsApi";
import EntityAuditPage from "./EntityAuditPage";
import { useEntityViewer } from "./entityViewer";
import { Pager } from "./ItemsPage";
import SessionDetailPage from "./SessionDetailPage";
import { dangerBtnStyle, primaryBtnStyle, secondaryBtnStyle } from "./styles";

const PAGE_SIZE = 10;

async function loadAllAgents(): Promise<Agent[]> {
  const all: Agent[] = [];
  let page = 1;
  while (true) {
    const resp = await listAgents({ page });
    all.push(...resp.results);
    if (!resp.next) break;
    page += 1;
  }
  return all;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [title, setTitle] = useState("");
  const [agentId, setAgentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const viewer = useEntityViewer();

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const refresh = (p = page) => {
    listSessions({ page: p })
      .then((resp) => {
        setSessions(resp.results);
        setCount(resp.count);
      })
      .catch((e) => setError(String(e)));
  };

  useEffect(() => {
    refresh(page);
    loadAllAgents().then(setAgents).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !agentId) {
      setError("Title and agent are required");
      return;
    }
    setCreating(true);
    try {
      const session = await createSession({
        title: title.trim(),
        agent: Number(agentId),
      });
      setTitle("");
      setAgentId("");
      setSelectedId(session.id);
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (id: number) => {
    await deleteSession(id);
    refresh(page);
  };

  if (selectedId !== null) {
    return (
      <SessionDetailPage
        sessionId={selectedId}
        onBack={() => {
          setSelectedId(null);
          refresh(page);
        }}
      />
    );
  }
  if (viewer.view.mode === "audit") {
    return (
      <EntityAuditPage
        entityType="session"
        entityId={viewer.view.id}
        entityName={viewer.view.label}
        onBack={viewer.openList}
      />
    );
  }

  return (
    <>
      <h1 style={{ marginTop: 0 }}>Sessions</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <form
        onSubmit={onCreate}
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 6,
          padding: "1rem",
          marginBottom: "1rem",
          display: "grid",
          gridTemplateColumns: "1fr 1fr auto",
          gap: "0.5rem",
          alignItems: "center",
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Session title"
          style={{ padding: "0.4rem" }}
        />
        <select
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          style={{ padding: "0.4rem" }}
        >
          <option value="">— Pick an agent —</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <button type="submit" style={primaryBtnStyle} disabled={creating}>
          <i className="fa-solid fa-rocket" style={{ marginRight: 6 }} />
          {creating ? "Starting..." : "Start session"}
        </button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
            <th style={thStyle}>Title</th>
            <th style={thStyle}>Agent</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Container</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={tdStyle}>{s.title}</td>
              <td style={tdStyle}>{s.agent_name}</td>
              <td style={tdStyle}>{s.container_status}</td>
              <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "0.85em" }}>
                {s.container_id ? s.container_id.slice(0, 12) : "—"}
              </td>
              <td style={{ ...tdStyle, display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                <button onClick={() => setSelectedId(s.id)} style={secondaryBtnStyle}>
                  <i className="fa-solid fa-comments" style={{ marginRight: 6 }} />
                  Open
                </button>
                <button onClick={() => viewer.openAudit(s.id, s.title)} style={secondaryBtnStyle}>
                  <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: 6 }} />
                  View Audit Trail
                </button>
                <button onClick={() => onDelete(s.id)} style={dangerBtnStyle}>
                  <i className="fa-solid fa-trash" style={{ marginRight: 6 }} />
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager page={page} totalPages={totalPages} count={count} pageSize={PAGE_SIZE} onChange={setPage} />
    </>
  );
}

const thStyle: React.CSSProperties = { padding: "0.5rem", fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: "0.5rem", verticalAlign: "middle" };
