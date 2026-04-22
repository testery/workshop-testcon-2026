export type Item = {
  id: number;
  name: string;
  created_at: string;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export async function listItems(
  opts: { page?: number; search?: string } = {},
): Promise<Paginated<Item>> {
  const params = new URLSearchParams();
  if (opts.page) params.set("page", String(opts.page));
  if (opts.search) params.set("search", opts.search);
  const qs = params.toString();
  const res = await fetch(`/api/items/${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Failed to load items: ${res.status}`);
  return res.json();
}

export async function createItem(name: string): Promise<Item> {
  const res = await fetch("/api/items/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Failed to create item: ${res.status}`);
  return res.json();
}

export async function updateItem(id: number, name: string): Promise<Item> {
  const res = await fetch(`/api/items/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Failed to update item: ${res.status}`);
  return res.json();
}

export async function deleteItem(id: number): Promise<void> {
  const res = await fetch(`/api/items/${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete item: ${res.status}`);
}
