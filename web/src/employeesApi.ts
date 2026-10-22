import type { Paginated } from "./api";

export type Employee = {
  id: number;
  first_name: string;
  last_name: string;
  age: number;
  supervisor: number | null;
  supervisor_name: string | null;
  hire_date: string;
  created_at: string;
};

export type EmployeeInput = {
  first_name: string;
  last_name: string;
  age: number;
  supervisor: number | null;
  // YYYY-MM-DD. Left out on create, the API sets today.
  hire_date?: string;
};

export async function listEmployees(
  opts: { page?: number; search?: string } = {},
): Promise<Paginated<Employee>> {
  const params = new URLSearchParams();
  if (opts.page) params.set("page", String(opts.page));
  if (opts.search) params.set("search", opts.search);
  const qs = params.toString();
  const res = await fetch(`/api/employees/${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Failed to load employees: ${res.status}`);
  return res.json();
}

export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  const res = await fetch("/api/employees/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to create employee: ${res.status}`);
  return res.json();
}

export async function updateEmployee(
  id: number,
  input: Partial<EmployeeInput>,
): Promise<Employee> {
  const res = await fetch(`/api/employees/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to update employee: ${res.status}`);
  return res.json();
}

export async function deleteEmployee(id: number): Promise<void> {
  const res = await fetch(`/api/employees/${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete employee: ${res.status}`);
}
