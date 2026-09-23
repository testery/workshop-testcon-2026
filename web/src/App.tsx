import { useEffect, useRef, useState } from "react";
import ItemsPage from "./ItemsPage";
import EmployeesPage from "./EmployeesPage";
import CustomersPage from "./CustomersPage";
import ProductsPage from "./ProductsPage";
import OrdersPage from "./OrdersPage";
import GlobalAuditPage from "./GlobalAuditPage";
import LoginPage from "./LoginPage";
import DashboardPage from "./DashboardPage";
import {
  iconStyle,
  menuItemStyle,
  sideLinkActiveStyle,
  sideLinkStyle,
} from "./styles";

type View =
  | "dashboard"
  | "items"
  | "employees"
  | "customers"
  | "products"
  | "orders"
  | "audit"
  | "settings";

type AuthUser = { name?: string; email?: string; picture?: string };

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setUser(d.authenticated ? d.user : null))
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const signOut = () => {
    window.location.href = "/api/auth/logout";
  };

  const navBtn = (v: View) => (view === v ? sideLinkActiveStyle : sideLinkStyle);

  if (!authChecked) return null;
  if (!user) return <LoginPage />;

  return (
    <div
      style={{
        fontFamily: "sans-serif",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        margin: 0,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 1rem",
          height: 56,
          background: "#1f2937",
          color: "white",
        }}
      >
        <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>Example Webapp</div>
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              background: "transparent",
              color: "white",
              border: "1px solid #4b5563",
              borderRadius: 4,
              padding: "0.4rem 0.8rem",
              cursor: "pointer",
            }}
          >
            <i className="fa-solid fa-user" style={{ marginRight: 6 }} />
            {user.name || user.email || "Signed in"}
            <i className="fa-solid fa-caret-down" style={{ marginLeft: 6 }} />
          </button>
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "100%",
                marginTop: 4,
                background: "white",
                color: "black",
                border: "1px solid #d1d5db",
                borderRadius: 4,
                minWidth: 140,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                zIndex: 10,
              }}
            >
              <button
                onClick={() => {
                  setView("audit");
                  setMenuOpen(false);
                }}
                style={menuItemStyle}
              >
                <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: 8 }} />
                Audit Log
              </button>
              <div style={{ borderTop: "1px solid #e5e7eb" }} />
              <button onClick={signOut} style={menuItemStyle}>
                <i className="fa-solid fa-right-from-bracket" style={{ marginRight: 8 }} />
                Logout
              </button>
            </div>
          )}
        </div>
      </header>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <aside
          style={{
            width: 200,
            background: "#f3f4f6",
            borderRight: "1px solid #e5e7eb",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          <button onClick={() => setView("dashboard")} style={navBtn("dashboard")}>
            <i className="fa-solid fa-gauge" style={iconStyle} />
            Dashboard
          </button>
          <button onClick={() => setView("items")} style={navBtn("items")}>
            <i className="fa-solid fa-list" style={iconStyle} />
            Items
          </button>
          <button onClick={() => setView("employees")} style={navBtn("employees")}>
            <i className="fa-solid fa-users" style={iconStyle} />
            Employees
          </button>
          <button onClick={() => setView("customers")} style={navBtn("customers")}>
            <i className="fa-solid fa-user-tie" style={iconStyle} />
            Customers
          </button>
          <button onClick={() => setView("products")} style={navBtn("products")}>
            <i className="fa-solid fa-box" style={iconStyle} />
            Products
          </button>
          <button onClick={() => setView("orders")} style={navBtn("orders")}>
            <i className="fa-solid fa-receipt" style={iconStyle} />
            Orders
          </button>
          <button onClick={() => setView("settings")} style={navBtn("settings")}>
            <i className="fa-solid fa-gear" style={iconStyle} />
            Settings
          </button>
        </aside>
        <main style={{ flex: 1, padding: "1.5rem", overflow: "auto" }}>
          {view === "items" && <ItemsPage />}
          {view === "employees" && <EmployeesPage />}
          {view === "customers" && <CustomersPage />}
          {view === "products" && <ProductsPage />}
          {view === "orders" && <OrdersPage />}
          {view === "audit" && <GlobalAuditPage />}
          {view === "dashboard" && <DashboardPage />}
          {view === "settings" && <h1 style={{ marginTop: 0 }}>Settings</h1>}
        </main>
      </div>
    </div>
  );
}
