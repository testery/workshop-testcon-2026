import type { Paginated } from "./api";

export type CustomerProfile = { phone: string; address: string };

export type Customer = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  profile: CustomerProfile | null;
  created_at: string;
};

export type CustomerInput = {
  first_name: string;
  last_name: string;
  email: string;
  profile?: CustomerProfile;
};

export type Product = {
  id: number;
  name: string;
  price: string;
  created_at: string;
};

export type ProductInput = { name: string; price: string };

export type OrderItem = {
  id?: number;
  product: number;
  product_name?: string;
  quantity: number;
  unit_price: string;
};

export type Order = {
  id: number;
  customer: number;
  customer_name: string;
  items: OrderItem[];
  total: string;
  created_at: string;
};

export type OrderInput = {
  customer: number;
  items: { product: number; quantity: number; unit_price: string }[];
};

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${url} -> ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

const qs = (opts: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(opts)) if (v !== undefined && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const listCustomers = (opts: { page?: number; search?: string } = {}) =>
  jsonFetch<Paginated<Customer>>(`/api/customers/${qs(opts)}`);
export const createCustomer = (input: CustomerInput) =>
  jsonFetch<Customer>("/api/customers/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
export const updateCustomer = (id: number, input: Partial<CustomerInput>) =>
  jsonFetch<Customer>(`/api/customers/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
export const deleteCustomer = (id: number) =>
  jsonFetch<void>(`/api/customers/${id}/`, { method: "DELETE" });

export const listProducts = (opts: { page?: number; search?: string } = {}) =>
  jsonFetch<Paginated<Product>>(`/api/products/${qs(opts)}`);
export const createProduct = (input: ProductInput) =>
  jsonFetch<Product>("/api/products/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
export const updateProduct = (id: number, input: Partial<ProductInput>) =>
  jsonFetch<Product>(`/api/products/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
export const deleteProduct = (id: number) =>
  jsonFetch<void>(`/api/products/${id}/`, { method: "DELETE" });

export const listOrders = (opts: { page?: number; customer?: number } = {}) =>
  jsonFetch<Paginated<Order>>(`/api/orders/${qs(opts)}`);
export const getOrder = (id: number) => jsonFetch<Order>(`/api/orders/${id}/`);
export const createOrder = (input: OrderInput) =>
  jsonFetch<Order>("/api/orders/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
export const updateOrder = (id: number, input: Partial<OrderInput>) =>
  jsonFetch<Order>(`/api/orders/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
export const deleteOrder = (id: number) =>
  jsonFetch<void>(`/api/orders/${id}/`, { method: "DELETE" });

export type AuditEntry = { event: string; timestamp: string };

export type AuditAction = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: string;
  entityType: string;
  entityId: number | null;
  createdAt: string;
  audit: AuditEntry[];
};

export const listEntityAuditActions = (entityType: string, entityId: number) =>
  jsonFetch<Paginated<AuditAction>>(
    `/api/actions/${qs({ entity_type: entityType, entity_id: entityId })}`,
  );

export const listAllActions = (opts: { page?: number; entity_type?: string } = {}) =>
  jsonFetch<Paginated<AuditAction>>(`/api/actions/${qs(opts)}`);
