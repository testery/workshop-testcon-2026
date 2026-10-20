import { useEffect, useRef, useState } from "react";
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
  type Customer,
} from "./commerceApi";
import EntityAuditPage from "./EntityAuditPage";
import EntityDetailPage from "./EntityDetailPage";
import { useEntityViewer } from "./entityViewer";
import { Pager } from "./ItemsPage";
import { dangerBtnStyle, primaryBtnStyle, secondaryBtnStyle } from "./styles";

const PAGE_SIZE = 10;

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
};

const emptyForm: FormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
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
    listCustomers({ page: p, search: s || undefined })
      .then((resp) => {
        if (seq !== requestSeq.current) return;
        setCustomers(resp.results);
        setCount(resp.count);
      })
      .catch((e) => {
        if (seq === requestSeq.current) setError(String(e));
      });
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

  const toPayload = (f: FormState) => ({
    first_name: f.first_name.trim(),
    last_name: f.last_name.trim(),
    email: f.email.trim(),
    notes: f.notes.trim(),
    profile: { phone: f.phone.trim(), address: f.address.trim() },
  });

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) return;
    try {
      await createCustomer(toPayload(form));
      setForm(emptyForm);
      refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  const onDelete = async (id: number) => {
    await deleteCustomer(id);
    refresh();
  };

  const startEdit = (c: Customer) => {
    setEditingId(c.id);
    setEditForm({
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email,
      phone: c.profile?.phone ?? "",
      address: c.profile?.address ?? "",
      notes: c.notes,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const saveEdit = async (id: number) => {
    setError(null);
    try {
      await updateCustomer(id, toPayload(editForm));
      cancelEdit();
      refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  if (viewer.view.mode === "detail") {
    const { id, label } = viewer.view;
    return (
      <EntityDetailPage
        entityType="customer"
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
        entityType="customer"
        entityId={viewer.view.id}
        entityName={viewer.view.label}
        onBack={viewer.openList}
      />
    );
  }

  return (
    <>
      <h1 style={{ marginTop: 0 }}>Customers</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form
        onSubmit={onAdd}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1.2fr 1fr 1.2fr 1.2fr auto",
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
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="Email"
          style={{ padding: "0.4rem" }}
        />
        <input
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="Phone"
          style={{ padding: "0.4rem" }}
        />
        <input
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="Address"
          style={{ padding: "0.4rem" }}
        />
        <input
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Notes"
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
          placeholder="Filter customers"
          style={{ flex: 1, padding: "0.4rem" }}
        />
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
            <th style={thStyle}>First</th>
            <th style={thStyle}>Last</th>
            <th style={thStyle}>Email</th>
            <th style={thStyle}>Phone</th>
            <th style={thStyle}>Address</th>
            <th style={thStyle}>Notes</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
              {editingId === c.id ? (
                <>
                  {(["first_name", "last_name", "email", "phone", "address", "notes"] as const).map((k) => (
                    <td key={k} style={tdStyle}>
                      <input
                        value={editForm[k]}
                        onChange={(e) => setEditForm({ ...editForm, [k]: e.target.value })}
                        style={{ width: "100%", padding: "0.3rem" }}
                      />
                    </td>
                  ))}
                  <td style={{ ...tdStyle, display: "flex", gap: "0.4rem" }}>
                    <button onClick={() => saveEdit(c.id)} style={primaryBtnStyle}>
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
                  <td style={tdStyle}>{c.first_name}</td>
                  <td style={tdStyle}>{c.last_name}</td>
                  <td style={tdStyle}>{c.email}</td>
                  <td style={tdStyle}>{c.profile?.phone ?? "—"}</td>
                  <td style={tdStyle}>{c.profile?.address ?? "—"}</td>
                  <td style={tdStyle}>{c.notes || "—"}</td>
                  <td style={{ ...tdStyle, display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button onClick={() => viewer.openDetail(c.id, `${c.first_name} ${c.last_name}`)} style={secondaryBtnStyle}>
                      <i className="fa-solid fa-eye" style={{ marginRight: 6 }} />
                      View
                    </button>
                    <button onClick={() => startEdit(c)} style={secondaryBtnStyle}>
                      <i className="fa-solid fa-pen" style={{ marginRight: 6 }} />
                      Edit
                    </button>
                    <button onClick={() => viewer.openAudit(c.id, `${c.first_name} ${c.last_name}`)} style={secondaryBtnStyle}>
                      <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: 6 }} />
                      View Audit Trail
                    </button>
                    <button onClick={() => onDelete(c.id)} style={dangerBtnStyle}>
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
