import { useEffect, useState } from "react";
import {
  deleteOrder,
  getOrder,
  listProducts,
  updateOrder,
  type Order,
  type Product,
} from "./commerceApi";
import { dangerBtnStyle, primaryBtnStyle, secondaryBtnStyle } from "./styles";

type LineDraft = { product: string; quantity: string; unit_price: string };

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

export default function OrderDetailPage({
  orderId,
  onBack,
}: {
  orderId: number;
  onBack: () => void;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getOrder(orderId)
      .then((o) => {
        setOrder(o);
        setLines(
          o.items.map((it) => ({
            product: String(it.product),
            quantity: String(it.quantity),
            unit_price: it.unit_price,
          })),
        );
      })
      .catch((e) => setError(String(e)));
    loadAllProducts().then(setProducts).catch(() => {});
  }, [orderId]);

  const updateLine = (i: number, patch: Partial<LineDraft>) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () =>
    setLines([...lines, { product: "", quantity: "1", unit_price: "" }]);
  const removeLine = (i: number) =>
    setLines(lines.filter((_, idx) => idx !== i));

  const onProductPick = (i: number, productId: string) => {
    const p = products.find((p) => String(p.id) === productId);
    updateLine(i, { product: productId, unit_price: p ? p.price : "" });
  };

  const onSave = async () => {
    if (!order) return;
    setError(null);
    const valid = lines.filter((l) => l.product && l.quantity && l.unit_price);
    if (valid.length === 0) {
      setError("Order needs at least one item");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateOrder(order.id, {
        items: valid.map((l) => ({
          product: Number(l.product),
          quantity: Number(l.quantity),
          unit_price: l.unit_price,
        })),
      });
      setOrder(updated);
      setLines(
        updated.items.map((it) => ({
          product: String(it.product),
          quantity: String(it.quantity),
          unit_price: it.unit_price,
        })),
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const onCancel = async () => {
    if (!order) return;
    await deleteOrder(order.id);
    onBack();
  };

  if (!order) {
    return (
      <>
        <button onClick={onBack} style={secondaryBtnStyle}>
          <i className="fa-solid fa-arrow-left" style={{ marginRight: 6 }} />
          Back
        </button>
        {error ? <p style={{ color: "red" }}>{error}</p> : <p>Loading…</p>}
      </>
    );
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <button onClick={onBack} style={secondaryBtnStyle} aria-label="Back to orders">
          <i className="fa-solid fa-arrow-left" style={{ marginRight: 6 }} />
          Back
        </button>
        <h1 style={{ margin: 0 }}>Order #{order.id}</h1>
      </div>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "0.25rem 1rem", marginBottom: "1rem" }}>
        <dt style={{ fontWeight: 600 }}>Customer</dt>
        <dd data-testid="detail-customer" style={{ margin: 0 }}>{order.customer_name}</dd>
        <dt style={{ fontWeight: 600 }}>Created</dt>
        <dd style={{ margin: 0 }}>{new Date(order.created_at).toLocaleString()}</dd>
        <dt style={{ fontWeight: 600 }}>Total</dt>
        <dd data-testid="detail-total" style={{ margin: 0 }}>{order.total}</dd>
      </dl>

      <h2 style={{ marginTop: 0 }}>Items</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1rem" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
            <th style={thStyle}>Product</th>
            <th style={{ ...thStyle, width: 90 }}>Qty</th>
            <th style={{ ...thStyle, width: 120 }}>Unit price</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
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
        <button type="button" onClick={onSave} disabled={saving} style={primaryBtnStyle}>
          <i className="fa-solid fa-check" style={{ marginRight: 6 }} />
          Save changes
        </button>
        <button type="button" onClick={onCancel} style={dangerBtnStyle}>
          <i className="fa-solid fa-ban" style={{ marginRight: 6 }} />
          Cancel order
        </button>
      </div>
    </>
  );
}

const thStyle: React.CSSProperties = { padding: "0.5rem", fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: "0.5rem", verticalAlign: "middle" };
