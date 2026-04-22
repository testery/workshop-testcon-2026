import { useEffect, useState } from "react";
import { listAllActions, type AuditAction } from "./commerceApi";
import { Pager } from "./ItemsPage";

const PAGE_SIZE = 10;

const ENTITY_FILTERS = [
  "",
  "item",
  "employee",
  "customer",
  "product",
  "order",
  "agent",
  "session",
];

export default function GlobalAuditPage() {
  const [actions, setActions] = useState<AuditAction[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  useEffect(() => {
    listAllActions({ page, entity_type: entityType || undefined })
      .then((resp) => {
        setActions(resp.results);
        setCount(resp.count);
      })
      .catch((e) => setError(String(e)));
  }, [page, entityType]);

  return (
    <>
      <h1 style={{ marginTop: 0 }}>Audit Log</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1rem",
          alignItems: "center",
        }}
      >
        <label style={{ fontWeight: 600 }}>Filter by entity:</label>
        <select
          value={entityType}
          onChange={(e) => {
            setPage(1);
            setEntityType(e.target.value);
          }}
          style={{ padding: "0.4rem" }}
        >
          {ENTITY_FILTERS.map((t) => (
            <option key={t} value={t}>
              {t === "" ? "All entities" : t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
            <th style={thStyle}>When</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Entity</th>
            <th style={thStyle}>Action ID</th>
            <th style={thStyle}>Changes</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((a) => (
            <tr key={a.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={tdStyle}>{new Date(a.createdAt).toLocaleString()}</td>
              <td style={tdStyle}>
                <code>{a.type}</code>
              </td>
              <td style={tdStyle}>
                {a.entityType ? (
                  <>
                    {a.entityType}
                    {a.entityId !== null && (
                      <span style={{ color: "#6b7280" }}> #{a.entityId}</span>
                    )}
                  </>
                ) : (
                  <span style={{ color: "#9ca3af" }}>—</span>
                )}
              </td>
              <td style={{ ...tdStyle, fontFamily: "monospace", color: "#4b5563" }}>
                {a.id}
              </td>
              <td style={tdStyle}>
                <PayloadDiff payload={a.payload} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager
        page={page}
        totalPages={totalPages}
        count={count}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />
    </>
  );
}

function PayloadDiff({ payload }: { payload: Record<string, unknown> }) {
  const keys = Object.keys(payload);
  if (keys.length === 0)
    return <span style={{ color: "#6b7280" }}>(no changes recorded)</span>;

  const fields = new Set<string>();
  for (const k of keys) {
    if (k.startsWith("old")) fields.add(k.slice(3));
    else if (k.startsWith("new")) fields.add(k.slice(3));
  }

  return (
    <ul style={{ margin: 0, paddingLeft: "1rem" }}>
      {Array.from(fields).map((f) => {
        const oldV = payload[`old${f}`];
        const newV = payload[`new${f}`];
        const hasOld = `old${f}` in payload;
        const hasNew = `new${f}` in payload;
        return (
          <li key={f}>
            <strong>{f.charAt(0).toLowerCase() + f.slice(1)}</strong>:{" "}
            {hasOld && <code style={{ color: "#b91c1c" }}>{formatValue(oldV)}</code>}
            {hasOld && hasNew && <span> → </span>}
            {hasNew && <code style={{ color: "#047857" }}>{formatValue(newV)}</code>}
          </li>
        );
      })}
    </ul>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

const thStyle: React.CSSProperties = { padding: "0.5rem", fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: "0.5rem", verticalAlign: "top" };
