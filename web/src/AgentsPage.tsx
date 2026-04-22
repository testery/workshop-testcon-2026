import { useEffect, useState } from "react";
import {
  createAgent,
  deleteAgent,
  listAgents,
  updateAgent,
  type Agent,
} from "./agentsApi";
import EntityAuditPage from "./EntityAuditPage";
import EntityDetailPage from "./EntityDetailPage";
import { useEntityViewer } from "./entityViewer";
import { Pager } from "./ItemsPage";
import {
  dangerBtnStyle,
  primaryBtnStyle,
  secondaryBtnStyle,
} from "./styles";

const PAGE_SIZE = 10;

type FormState = { name: string; description: string };
const emptyForm: FormState = { name: "", description: "" };

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const viewer = useEntityViewer();

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const refresh = (opts?: { page?: number; search?: string }) => {
    const p = opts?.page ?? page;
    const s = opts?.search ?? search;
    listAgents({ page: p, search: s || undefined })
      .then((resp) => {
        setAgents(resp.results);
        setCount(resp.count);
      })
      .catch((e) => setError(String(e)));
  };

  useEffect(() => {
    refresh({ page, search });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      refresh({ page: 1, search });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) return;
    try {
      await createAgent({ name: form.name.trim(), description: form.description });
      setForm(emptyForm);
      refresh({ page, search });
    } catch (e) {
      setError(String(e));
    }
  };

  const onDelete = async (id: number) => {
    await deleteAgent(id);
    refresh({ page, search });
  };

  const startEdit = (agent: Agent) => {
    setEditingId(agent.id);
    setEditForm({ name: agent.name, description: agent.description });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const saveEdit = async (id: number) => {
    setError(null);
    try {
      await updateAgent(id, {
        name: editForm.name.trim(),
        description: editForm.description,
      });
      cancelEdit();
      refresh({ page, search });
    } catch (e) {
      setError(String(e));
    }
  };

  if (viewer.view.mode === "detail") {
    const { id, label } = viewer.view;
    return (
      <EntityDetailPage
        entityType="agent"
        entityId={id}
        entityName={label}
        onBack={viewer.openList}
        onViewAudit={() => viewer.openAudit(id, label)}
      />
    );
  }
  if (viewer.view.mode === "audit") {
    return (
      <EntityAuditPage
        entityType="agent"
        entityId={viewer.view.id}
        entityName={viewer.view.label}
        onBack={viewer.openList}
      />
    );
  }

  return (
    <>
      <h1 style={{ marginTop: 0 }}>Agents</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form
        onSubmit={onAdd}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr auto",
          gap: "0.5rem",
          marginBottom: "1rem",
          alignItems: "center",
        }}
      >
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Agent name"
          style={{ padding: "0.4rem" }}
        />
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Description"
          style={{ padding: "0.4rem" }}
        />
        <button type="submit" style={primaryBtnStyle}>
          <i className="fa-solid fa-plus" style={{ marginRight: 6 }} />
          Add
        </button>
      </form>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", alignItems: "center" }}>
        <i className="fa-solid fa-magnifying-glass" style={{ color: "#6b7280" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter agents"
          style={{ flex: 1, padding: "0.4rem" }}
        />
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Description</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr key={agent.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
              {editingId === agent.id ? (
                <>
                  <td style={tdStyle}>
                    <input
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      style={{ width: "100%", padding: "0.3rem" }}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm({ ...editForm, description: e.target.value })
                      }
                      style={{ width: "100%", padding: "0.3rem" }}
                    />
                  </td>
                  <td style={{ ...tdStyle, display: "flex", gap: "0.4rem" }}>
                    <button onClick={() => saveEdit(agent.id)} style={primaryBtnStyle}>
                      <i className="fa-solid fa-check" style={{ marginRight: 6 }} />
                      Save
                    </button>
                    <button onClick={cancelEdit} style={secondaryBtnStyle}>
                      <i className="fa-solid fa-xmark" style={{ marginRight: 6 }} />
                      Cancel
                    </button>
                  </td>
                </>
              ) : (
                <>
                  <td style={tdStyle}>{agent.name}</td>
                  <td style={tdStyle}>{agent.description}</td>
                  <td style={{ ...tdStyle, display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button onClick={() => viewer.openDetail(agent.id, agent.name)} style={secondaryBtnStyle}>
                      <i className="fa-solid fa-eye" style={{ marginRight: 6 }} />
                      View
                    </button>
                    <button onClick={() => startEdit(agent)} style={secondaryBtnStyle}>
                      <i className="fa-solid fa-pen" style={{ marginRight: 6 }} />
                      Edit
                    </button>
                    <button onClick={() => viewer.openAudit(agent.id, agent.name)} style={secondaryBtnStyle}>
                      <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: 6 }} />
                      View Audit Trail
                    </button>
                    <button onClick={() => onDelete(agent.id)} style={dangerBtnStyle}>
                      <i className="fa-solid fa-trash" style={{ marginRight: 6 }} />
                      Delete
                    </button>
                  </td>
                </>
              )}
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
