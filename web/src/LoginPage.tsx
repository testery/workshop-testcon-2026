import { useEffect } from "react";

export default function LoginPage() {
  useEffect(() => {
    if (window.location.pathname !== "/login") {
      window.history.replaceState(null, "", "/login");
    }
  }, []);

  const signIn = () => {
    window.location.href = "/api/auth/login";
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        margin: 0,
        fontFamily: "sans-serif",
        background: "#f3f4f6",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "2.5rem",
          borderRadius: 8,
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          textAlign: "center",
          minWidth: 340,
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Sign In</h1>
        <p style={{ color: "#6b7280", marginTop: 0 }}>
          You need to sign in to continue.
        </p>
        <button
          onClick={signIn}
          style={{
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 4,
            padding: "0.6rem 1.4rem",
            fontSize: "1rem",
            cursor: "pointer",
            marginTop: "1rem",
          }}
        >
          <i className="fa-solid fa-right-to-bracket" style={{ marginRight: 8 }} />
          Sign In
        </button>
      </div>
    </div>
  );
}
