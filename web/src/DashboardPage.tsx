import { useEffect, useState } from "react";
import { listEmployees } from "./employeesApi";

export default function DashboardPage() {
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEmployees({ page: 1 })
      .then((resp) => setEmployeeCount(resp.count))
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
      <div
        style={{
          display: "inline-block",
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 6,
          padding: "1rem 1.5rem",
          minWidth: 200,
        }}
      >
        <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>Employees</div>
        <div
          data-testid="employee-count"
          style={{ fontSize: "2rem", fontWeight: "bold" }}
        >
          {employeeCount ?? "—"}
        </div>
      </div>
    </div>
  );
}
