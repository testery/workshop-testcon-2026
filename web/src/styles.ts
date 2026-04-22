import type { CSSProperties } from "react";

export const menuItemStyle: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "0.5rem 0.75rem",
  background: "transparent",
  border: "none",
  cursor: "pointer",
};

export const sideLinkStyle: CSSProperties = {
  textDecoration: "none",
  color: "#111827",
  padding: "0.4rem 0.5rem",
  borderRadius: 4,
  display: "flex",
  alignItems: "center",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  font: "inherit",
};

export const sideLinkActiveStyle: CSSProperties = {
  ...sideLinkStyle,
  background: "#e5e7eb",
  fontWeight: 600,
};

export const iconStyle: CSSProperties = {
  marginRight: 8,
  width: 16,
  textAlign: "center",
};

export const primaryBtnStyle: CSSProperties = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 4,
  padding: "0.4rem 0.8rem",
  cursor: "pointer",
};

export const secondaryBtnStyle: CSSProperties = {
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  borderRadius: 4,
  padding: "0.3rem 0.6rem",
  cursor: "pointer",
};

export const dangerBtnStyle: CSSProperties = {
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: 4,
  padding: "0.3rem 0.6rem",
  cursor: "pointer",
};
