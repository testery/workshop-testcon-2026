import { useEffect, useRef, useState } from "react";
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
  type Product,
} from "./commerceApi";
import EntityAuditPage from "./EntityAuditPage";
import EntityDetailPage from "./EntityDetailPage";
import { useEntityViewer } from "./entityViewer";
import { Pager } from "./ItemsPage";
import { dangerBtnStyle, primaryBtnStyle, secondaryBtnStyle } from "./styles";

const PAGE_SIZE = 10;

type FormState = { name: string; price: string };
const emptyForm: FormState = { name: "", price: "" };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
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
    listProducts({ page: p, search: s || undefined })
      .then((resp) => {
        if (seq !== requestSeq.current) return;
        setProducts(resp.results);
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

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.price.trim()) return;
    try {
      await createProduct({ name: form.name.trim(), price: form.price.trim() });
      setForm(emptyForm);
      refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  const onDelete = async (id: number) => {
    await deleteProduct(id);
    refresh();
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditForm({ name: p.name, price: p.price });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const saveEdit = async (id: number) => {
    setError(null);
    try {
      await updateProduct(id, { name: editForm.name.trim(), price: editForm.price.trim() });
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
        entityType="product"
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
        entityType="product"
        entityId={viewer.view.id}
        entityName={viewer.view.label}
        onBack={viewer.openList}
      />
    );
  }

  return (
    <>
      <h1 style={{ marginTop: 0 }}>Products</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form
        onSubmit={onAdd}
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr auto",
          gap: "0.5rem",
          marginBottom: "1rem",
          alignItems: "center",
        }}
      >
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Product name"
          style={{ padding: "0.4rem" }}
        />
        <input
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          placeholder="Price"
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
          placeholder="Filter products"
          style={{ flex: 1, padding: "0.4rem" }}
        />
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Price</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
              {editingId === p.id ? (
                <>
                  <td style={tdStyle}>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      style={{ width: "100%", padding: "0.3rem" }}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                      style={{ width: "100%", padding: "0.3rem" }}
                    />
                  </td>
                  <td style={{ ...tdStyle, display: "flex", gap: "0.4rem" }}>
                    <button onClick={() => saveEdit(p.id)} style={primaryBtnStyle}>
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
                  <td style={tdStyle}>{p.name}</td>
                  <td style={tdStyle}>{p.price}</td>
                  <td style={{ ...tdStyle, display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button onClick={() => viewer.openDetail(p.id, p.name)} style={secondaryBtnStyle}>
                      <i className="fa-solid fa-eye" style={{ marginRight: 6 }} />
                      View
                    </button>
                    <button onClick={() => startEdit(p)} style={secondaryBtnStyle}>
                      <i className="fa-solid fa-pen" style={{ marginRight: 6 }} />
                      Edit
                    </button>
                    <button onClick={() => viewer.openAudit(p.id, p.name)} style={secondaryBtnStyle}>
                      <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: 6 }} />
                      View Audit Trail
                    </button>
                    <button onClick={() => onDelete(p.id)} style={dangerBtnStyle}>
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
