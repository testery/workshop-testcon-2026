import { useEffect, useRef, useState } from "react";
import {
  createEmployee,
  deleteEmployee,
  listEmployees,
  updateEmployee,
  type Employee,
} from "./employeesApi";
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

type FormState = {
  first_name: string;
  last_name: string;
  age: string;
  supervisor: string;
};

const emptyForm: FormState = { first_name: "", last_name: "", age: "", supervisor: "" };

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const viewer = useEntityViewer();

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  // Handlers that await a save call refresh() later; read page/search from refs so they
  // reload what is on screen now, not what was there when the save started.
  const pageRef = useRef(page);
  const searchRef = useRef(search);
  pageRef.current = page;
  searchRef.current = search;
  // Only the latest list request may update the table; older responses are dropped.
  const requestSeq = useRef(0);

  const refresh = (opts?: { page?: number; search?: string }) => {
    const p = opts?.page ?? pageRef.current;
    const s = opts?.search ?? searchRef.current;
    const seq = ++requestSeq.current;
    listEmployees({ page: p, search: s || undefined })
      .then((resp) => {
        if (seq !== requestSeq.current) return;
        setEmployees(resp.results);
        setCount(resp.count);
      })
      .catch((e) => {
        if (seq === requestSeq.current) setError(String(e));
      });
  };

  const loadSupervisorOptions = async () => {
    try {
      const all: Employee[] = [];
      let p = 1;
      while (true) {
        const resp = await listEmployees({ page: p });
        all.push(...resp.results);
        if (!resp.next) break;
        p += 1;
      }
      setAllEmployees(all);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    refresh({ page, search });
    loadSupervisorOptions();
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

  const toPayload = (f: FormState) => ({
    first_name: f.first_name.trim(),
    last_name: f.last_name.trim(),
    age: Number(f.age),
    supervisor: f.supervisor ? Number(f.supervisor) : null,
  });

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.first_name.trim() || !form.last_name.trim() || !form.age) return;
    try {
      await createEmployee(toPayload(form));
      setForm(emptyForm);
      refresh();
      loadSupervisorOptions();
    } catch (e) {
      setError(String(e));
    }
  };

  const onDelete = async (id: number) => {
    await deleteEmployee(id);
    refresh();
    loadSupervisorOptions();
  };

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditForm({
      first_name: emp.first_name,
      last_name: emp.last_name,
      age: String(emp.age),
      supervisor: emp.supervisor ? String(emp.supervisor) : "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const saveEdit = async (id: number) => {
    setError(null);
    try {
      await updateEmployee(id, toPayload(editForm));
      cancelEdit();
      refresh();
      loadSupervisorOptions();
    } catch (e) {
      setError(String(e));
    }
  };

  if (viewer.view.mode === "detail") {
    const { id, label } = viewer.view;
    return (
      <EntityDetailPage
        entityType="employee"
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
        entityType="employee"
        entityId={viewer.view.id}
        entityName={viewer.view.label}
        onBack={viewer.openList}
      />
    );
  }

  return (
    <>
      <h1 style={{ marginTop: 0 }}>Employees</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form
        onSubmit={onAdd}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 80px 1fr auto",
          gap: "0.5rem",
          marginBottom: "1rem",
          alignItems: "center",
        }}
      >
        <input
          value={form.first_name}
          onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          placeholder="First name"
          style={{ padding: "0.4rem" }}
        />
        <input
          value={form.last_name}
          onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          placeholder="Last name"
          style={{ padding: "0.4rem" }}
        />
        <input
          type="number"
          min={0}
          value={form.age}
          onChange={(e) => setForm({ ...form, age: e.target.value })}
          placeholder="Age"
          style={{ padding: "0.4rem" }}
        />
        <select
          value={form.supervisor}
          onChange={(e) => setForm({ ...form, supervisor: e.target.value })}
          style={{ padding: "0.4rem" }}
        >
          <option value="">— No supervisor —</option>
          {allEmployees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.first_name} {e.last_name}
            </option>
          ))}
        </select>
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
          placeholder="Filter by name"
          style={{ flex: 1, padding: "0.4rem" }}
        />
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
            <th style={thStyle}>First</th>
            <th style={thStyle}>Last</th>
            <th style={thStyle}>Age</th>
            <th style={thStyle}>Supervisor</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
              {editingId === emp.id ? (
                <>
                  <td style={tdStyle}>
                    <input
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      style={{ width: "100%", padding: "0.3rem" }}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      style={{ width: "100%", padding: "0.3rem" }}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="number"
                      min={0}
                      value={editForm.age}
                      onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                      style={{ width: "100%", padding: "0.3rem" }}
                    />
                  </td>
                  <td style={tdStyle}>
                    <select
                      value={editForm.supervisor}
                      onChange={(e) => setEditForm({ ...editForm, supervisor: e.target.value })}
                      style={{ width: "100%", padding: "0.3rem" }}
                    >
                      <option value="">— None —</option>
                      {allEmployees
                        .filter((e) => e.id !== emp.id)
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.first_name} {e.last_name}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td style={{ ...tdStyle, display: "flex", gap: "0.4rem" }}>
                    <button onClick={() => saveEdit(emp.id)} style={primaryBtnStyle}>
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
                  <td style={tdStyle}>{emp.first_name}</td>
                  <td style={tdStyle}>{emp.last_name}</td>
                  <td style={tdStyle}>{emp.age}</td>
                  <td style={tdStyle}>{emp.supervisor_name ?? "—"}</td>
                  <td style={{ ...tdStyle, display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button onClick={() => viewer.openDetail(emp.id, `${emp.first_name} ${emp.last_name}`)} style={secondaryBtnStyle}>
                      <i className="fa-solid fa-eye" style={{ marginRight: 6 }} />
                      View
                    </button>
                    <button onClick={() => startEdit(emp)} style={secondaryBtnStyle}>
                      <i className="fa-solid fa-pen" style={{ marginRight: 6 }} />
                      Edit
                    </button>
                    <button onClick={() => viewer.openAudit(emp.id, `${emp.first_name} ${emp.last_name}`)} style={secondaryBtnStyle}>
                      <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: 6 }} />
                      View Audit Trail
                    </button>
                    <button onClick={() => onDelete(emp.id)} style={dangerBtnStyle}>
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
