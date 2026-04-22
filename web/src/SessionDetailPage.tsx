import { useEffect, useRef, useState } from "react";
import {
  getSession,
  listSessionMessages,
  sendSessionChat,
  type ChatMessage,
  type Session,
} from "./agentsApi";
import { primaryBtnStyle, secondaryBtnStyle } from "./styles";

export default function SessionDetailPage({
  sessionId,
  onBack,
}: {
  sessionId: number;
  onBack: () => void;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSession(sessionId).then(setSession).catch((e) => setError(String(e)));
    listSessionMessages(sessionId).then(setMessages).catch(() => {});
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const text = input.trim();
    if (!text || sending) return;
    const userMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);
    try {
      const reply = await sendSessionChat(sessionId, text);
      setMessages((m) => [...m, reply]);
    } catch (err) {
      setError(String(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <button onClick={onBack} style={secondaryBtnStyle}>
          <i className="fa-solid fa-arrow-left" style={{ marginRight: 6 }} />
          Back
        </button>
        <h1 style={{ margin: 0 }}>
          {session ? session.title : `Session #${sessionId}`}
        </h1>
        {session && (
          <span style={{ color: "#6b7280" }}>
            agent: <strong>{session.agent_name}</strong> · status:{" "}
            <StatusBadge status={session.container_status} />
          </span>
        )}
      </div>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div
        ref={scrollRef}
        data-testid="chat-window"
        style={{
          flex: 1,
          overflowY: "auto",
          border: "1px solid #e5e7eb",
          borderRadius: 6,
          padding: "1rem",
          background: "#f9fafb",
          minHeight: 200,
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: "#6b7280", margin: 0 }}>
            No messages yet — say hi to your agent.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            data-role={m.role}
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              margin: "0.4rem 0",
            }}
          >
            <div
              style={{
                background: m.role === "user" ? "#2563eb" : "white",
                color: m.role === "user" ? "white" : "#111827",
                border: m.role === "assistant" ? "1px solid #e5e7eb" : "none",
                borderRadius: 12,
                padding: "0.5rem 0.8rem",
                maxWidth: "70%",
                whiteSpace: "pre-wrap",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={onSend}
        style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          style={{ flex: 1, padding: "0.5rem" }}
          disabled={sending || (session?.container_status !== "running")}
        />
        <button
          type="submit"
          style={primaryBtnStyle}
          disabled={sending || !input.trim() || (session?.container_status !== "running")}
        >
          <i className="fa-solid fa-paper-plane" style={{ marginRight: 6 }} />
          Send
        </button>
      </form>
    </div>
  );
}

function StatusBadge({ status }: { status: Session["container_status"] }) {
  const color =
    status === "running" ? "#16a34a" : status === "failed" ? "#dc2626" : "#6b7280";
  return <span style={{ color, fontWeight: 600 }}>{status}</span>;
}
