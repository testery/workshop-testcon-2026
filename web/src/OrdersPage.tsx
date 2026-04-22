import { useEffect, useState } from "react";
import {
  createOrder,
  deleteOrder,
  listCustomers,
  listOrders,
  listProducts,
  type Customer,
  type Order,
  type Product,
} from "./commerceApi";
import EntityAuditPage from "./EntityAuditPage";
import { useEntityViewer } from "./entityViewer";
import { Pager } from "./ItemsPage";
import OrderDetailPage from "./OrderDetailPage";
import { dangerBtnStyle, primaryBtnStyle, secondaryBtnStyle } from "./styles";

const PAGE_SIZE = 10;

async function loadAllCustomers(): Promise<Customer[]> {
  const all: Customer[] = [];
  let page = 1;
  while (true) {
    const resp = await listCustomers({ page });
    all.push(...resp.results);
    if (!resp.next) break;
    page += 1;
  }
  return all;
}

async function loadAllProducts(): Promise<Product[]> {
  const all: Product[] = [];
  let page = 1;
  while (true) {
    const resp = await listProducts({ page });
    all.push(...resp.results);
    if (!resp.next) break;
    page += 1;
  }
  return all;
}

type LineDraft = { product: string; quantity: string; unit_price: string };
const emptyLine: LineDraft = { product: "", quantity: "1", unit_price: "" };

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine]);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const viewer = useEntityViewer();

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const refresh = (p = page) => {
    listOrders({ page: p })
      .then((resp) => {
        setOrders(resp.results);
        setCount(resp.count);
      })
      .catch((e) => setError(String(e)));
  };

  useEffect(() => {
    refresh(page);
    loadAllCustomers().then(setCustomers).catch(() => {});
    loadAllProducts().then(setProducts).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const addLine = () => setLines([...lines, { ...emptyLine }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, patch: Partial<LineDraft>) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const onProductPick = (i: number, productId: string) => {
    const p = products.find((p) => String(p.id) === productId);
    updateLine(i, { product: productId, unit_price: p ? p.price : "" });
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!customerId) {
      setError("Pick a customer");
      return;
    }
    const valid = lines.filter((l) => l.product && l.quantity && l.unit_price);
    if (valid.length === 0) {
      setError("Add at least one line item");
      return;
    }
    try {
      await createOrder({
        customer: Number(customerId),
        items: valid.map((l) => ({
          product: Number(l.product),
          quantity: Number(l.quantity),
          unit_price: l.unit_price,
        })),
      });
      setCustomerId("");
      setLines([emptyLine]);
      refresh(1);
      setPage(1);
    } catch (e) {
      setError(String(e));
    }
  };

  const onDelete = async (id: number) => {
    await deleteOrder(id);
    refresh(page);
  };

  if (selectedId !== null) {
    return (
      <OrderDetailPage
        orderId={selectedId}
        onBack={() => {
          setSelectedId(null);
          refresh(page);
        }}
      />
    );
  }
  if (viewer.view.mode === "audit") {
    return (
      <EntityAuditPage
        entityType="order"
        entityId={viewer.view.id}
        entityName={viewer.view.label}
        onBack={viewer.openList}
      />
    );
  }

  return (
    <>
      <h1 style={{ marginTop: 0 }}>Orders</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <form
        onSubmit={onCreate}
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 6,
          padding: "1rem",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", alignItems: "center" }}>
          <label style={{ minWidth: 100 }}>Customer</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            style={{ flex: 1, padding: "0.4rem" }}
          >
            <option value="">— Select a customer —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name} ({c.email})
              </option>
            ))}
          </select>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "0.5rem" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={thStyle}>Product</th>
              <th style={{ ...thStyle, width: 90 }}>Qty</th>
              <th style={{ ...thStyle, width: 120 }}>Unit price</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td style={tdStyle}>
                  <select
                    value={l.product}
                    onChange={(e) => onProductPick(i, e.target.value)}
                    style={{ width: "100%", padding: "0.3rem" }}
                  >
                    <option value="">— Select a product —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={tdStyle}>
                  <input
                    type="number"
                    min={1}
                    value={l.quantity}
                    onChange={(e) => updateLine(i, { quantity: e.target.value })}
                    style={{ width: "100%", padding: "0.3rem" }}
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    value={l.unit_price}
                    onChange={(e) => updateLine(i, { unit_price: e.target.value })}
                    style={{ width: "100%", padding: "0.3rem" }}
                  />
                </td>
                <td style={tdStyle}>
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    disabled={lines.length === 1}
                    style={secondaryBtnStyle}
                  >
                    <i className="fa-solid fa-minus" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" onClick={addLine} style={secondaryBtnStyle}>
            <i className="fa-solid fa-plus" style={{ marginRight: 6 }} />
            Add line
          </button>
          <button type="submit" style={primaryBtnStyle}>
            <i className="fa-solid fa-check" style={{ marginRight: 6 }} />
            Create order
          </button>
        </div>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
            <th style={thStyle}>Order</th>
            <th style={thStyle}>Customer</th>
            <th style={thStyle}>Items</th>
            <th style={thStyle}>Total</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={tdStyle}>#{o.id}</td>
              <td style={tdStyle}>{o.customer_name}</td>
              <td style={tdStyle}>
                {o.items
                  .map((it) => `${it.quantity}× ${it.product_name}`)
                  .join(", ")}
              </td>
              <td style={tdStyle}>{o.total}</td>
              <td style={{ ...tdStyle, display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                <button onClick={() => setSelectedId(o.id)} style={secondaryBtnStyle}>
                  <i className="fa-solid fa-eye" style={{ marginRight: 6 }} />
                  View
                </button>
                <button onClick={() => viewer.openAudit(o.id, `Order #${o.id}`)} style={secondaryBtnStyle}>
                  <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: 6 }} />
                  View Audit Trail
                </button>
                <button onClick={() => onDelete(o.id)} style={dangerBtnStyle}>
                  <i className="fa-solid fa-trash" style={{ marginRight: 6 }} />
                  Delete
                </button>
              </td>
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
