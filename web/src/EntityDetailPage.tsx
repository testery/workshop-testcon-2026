import { Fragment, useEffect, useState, type ReactNode } from "react";
import { primaryBtnStyle, secondaryBtnStyle } from "./styles";

export default function EntityDetailPage({
  entityType,
  entityId,
  entityName,
  onBack,
  onViewAudit,
}: {
  entityType: string;
  entityId: number;
  entityName: string;
  onBack: () => void;
  onViewAudit: () => void;
}) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/${entityType}s/${entityId}/`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load: ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(String(e)));
  }, [entityType, entityId]);

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <button onClick={onBack} style={secondaryBtnStyle} aria-label="Back">
          <i className="fa-solid fa-arrow-left" style={{ marginRight: 6 }} />
          Back
        </button>
        <h1 style={{ margin: 0, flex: 1 }}>{entityName}</h1>
        <button onClick={onViewAudit} style={primaryBtnStyle}>
          <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: 6 }} />
          View Audit Trail
        </button>
      </div>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!data && !error && <p>Loading…</p>}
      {data && <FieldList data={data} />}
    </>
  );
}

function FieldList({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  return (
    <dl
      style={{
        display: "grid",
        gridTemplateColumns: "max-content 1fr",
        columnGap: "1.5rem",
        rowGap: "0.5rem",
        margin: 0,
      }}
    >
      {entries.map(([k, v]) => (
        <Fragment key={k}>
          <dt style={{ fontWeight: 600, color: "#374151" }}>{humanize(k)}</dt>
          <dd style={{ margin: 0 }}>{renderValue(v)}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

function renderValue(v: unknown): ReactNode {
  if (v === null || v === undefined) return <em style={{ color: "#9ca3af" }}>—</em>;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") {
    return (
      <pre
        style={{
          margin: 0,
          background: "#f3f4f6",
          padding: "0.5rem",
          borderRadius: 4,
          fontSize: "0.85rem",
          overflow: "auto",
        }}
      >
        {JSON.stringify(v, null, 2)}
      </pre>
    );
  }
  return String(v);
}

function humanize(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
