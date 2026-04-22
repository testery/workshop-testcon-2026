import { useEffect, useState } from "react";
import { listEntityAuditActions, type AuditAction } from "./commerceApi";
import { secondaryBtnStyle } from "./styles";

export default function EntityAuditPage({
  entityType,
  entityId,
  entityName,
  onBack,
}: {
  entityType: string;
  entityId: number;
  entityName: string;
  onBack: () => void;
}) {
  const [actions, setActions] = useState<AuditAction[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEntityAuditActions(entityType, entityId)
      .then((resp) => setActions(resp.results))
      .catch((e) => setError(String(e)));
  }, [entityType, entityId]);

  const sorted = actions
    ? [...actions].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    : null;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <button onClick={onBack} style={secondaryBtnStyle} aria-label="Back">
          <i className="fa-solid fa-arrow-left" style={{ marginRight: 6 }} />
          Back
        </button>
        <h1 style={{ margin: 0 }}>Audit Trail — {entityName}</h1>
      </div>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {sorted === null && !error && <p>Loading…</p>}
      {sorted && sorted.length === 0 && <p>No audit records for this {entityType} yet.</p>}
      {sorted && sorted.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
              <th style={thStyle}>When</th>
              <th style={thStyle}>Event</th>
              <th style={thStyle}>Action ID</th>
              <th style={thStyle}>Changes</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => (
              <tr key={a.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={tdStyle}>{new Date(a.createdAt).toLocaleString()}</td>
                <td style={tdStyle}>
                  <code>{a.type}</code>
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
      )}
    </>
  );
}

function PayloadDiff({ payload }: { payload: Record<string, unknown> }) {
  const keys = Object.keys(payload);
  if (keys.length === 0) return <span style={{ color: "#6b7280" }}>(no changes recorded)</span>;

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
