import { useEffect, useState } from "react";
import { createItem, deleteItem, listItems, updateItem, type Item } from "./api";
import EntityAuditPage from "./EntityAuditPage";
import EntityDetailPage from "./EntityDetailPage";
import { useEntityViewer } from "./entityViewer";
import {
  dangerBtnStyle,
  primaryBtnStyle,
  secondaryBtnStyle,
} from "./styles";

const PAGE_SIZE = 10;

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const viewer = useEntityViewer();

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const refresh = (opts?: { page?: number; search?: string }) => {
    const p = opts?.page ?? page;
    const s = opts?.search ?? search;
    listItems({ page: p, search: s || undefined })
      .then((resp) => {
        setItems(resp.results);
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
    if (!name.trim()) return;
    await createItem(name.trim());
    setName("");
    refresh({ page, search });
  };

  const onDelete = async (id: number) => {
    await deleteItem(id);
    refresh({ page, search });
  };

  const startEdit = (item: Item) => {
    setEditingId(item.id);
    setEditName(item.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const saveEdit = async (id: number) => {
    if (!editName.trim()) return;
    await updateItem(id, editName.trim());
    cancelEdit();
    refresh({ page, search });
  };

  if (viewer.view.mode === "detail") {
    const { id, label } = viewer.view;
    return (
      <EntityDetailPage
        entityType="item"
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
        entityType="item"
        entityId={viewer.view.id}
        entityName={viewer.view.label}
        onBack={viewer.openList}
      />
    );
  }

  return (
    <>
      <h1 style={{ marginTop: 0 }}>Items</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={onAdd} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New item name"
          style={{ flex: 1, padding: "0.4rem" }}
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
          placeholder="Filter items"
          style={{ flex: 1, padding: "0.4rem" }}
        />
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((item) => (
          <li
            key={item.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.5rem",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            {editingId === item.id ? (
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit(item.id);
                  if (e.key === "Escape") cancelEdit();
                }}
                style={{ flex: 1, padding: "0.3rem", marginRight: "0.5rem" }}
              />
            ) : (
              <span>{item.name}</span>
            )}
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {editingId === item.id ? (
                <>
                  <button onClick={() => saveEdit(item.id)} style={primaryBtnStyle}>
                    <i className="fa-solid fa-check" style={{ marginRight: 6 }} />
                    Save
                  </button>
                  <button onClick={cancelEdit} style={secondaryBtnStyle}>
                    <i className="fa-solid fa-xmark" style={{ marginRight: 6 }} />
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => viewer.openDetail(item.id, item.name)} style={secondaryBtnStyle}>
                    <i className="fa-solid fa-eye" style={{ marginRight: 6 }} />
                    View
                  </button>
                  <button onClick={() => startEdit(item)} style={secondaryBtnStyle}>
                    <i className="fa-solid fa-pen" style={{ marginRight: 6 }} />
                    Edit
                  </button>
                  <button onClick={() => viewer.openAudit(item.id, item.name)} style={secondaryBtnStyle}>
                    <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: 6 }} />
                    View Audit Trail
                  </button>
                  <button onClick={() => onDelete(item.id)} style={dangerBtnStyle}>
                    <i className="fa-solid fa-trash" style={{ marginRight: 6 }} />
                    Delete
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      <Pager page={page} totalPages={totalPages} count={count} pageSize={PAGE_SIZE} onChange={setPage} />
    </>
  );
}

function Pager({
  page,
  totalPages,
  count,
  pageSize,
  onChange,
}: {
  page: number;
  totalPages: number;
  count: number;
  pageSize: number;
  onChange: (n: number) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: "1rem",
      }}
    >
      <span style={{ color: "#6b7280" }}>
        {count === 0
          ? "No results"
          : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, count)} of ${count}`}
      </span>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1} style={secondaryBtnStyle}>
          <i className="fa-solid fa-chevron-left" style={{ marginRight: 6 }} />
          Prev
        </button>
        <span>
          Page {page} / {totalPages}
        </span>
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          style={secondaryBtnStyle}
        >
          Next
          <i className="fa-solid fa-chevron-right" style={{ marginLeft: 6 }} />
        </button>
      </div>
    </div>
  );
}

export { Pager };
