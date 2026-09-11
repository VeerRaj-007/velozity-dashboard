import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { api } from "../api/client";
import { AppNotification } from "../types";

export function NotificationBell({ socket }: { socket: Socket | null }) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.get("/notifications").then((res) => setItems(res.data));
  }, []);

  useEffect(() => {
    if (!socket) return;
    function onNotif(n: AppNotification) {
      setItems((prev) => [n, ...prev]);
    }
    socket.on("notification:new", onNotif);
    return () => {
      socket.off("notification:new", onNotif);
    };
  }, [socket]);

  const unread = items.filter((i) => !i.isRead).length;

  async function markOne(id: string) {
    await api.patch(`/notifications/${id}/read`);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isRead: true } : i)));
  }

  async function markAll() {
    await api.patch("/notifications/read-all");
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
  }

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} style={{ position: "relative" }}>
        🔔
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              background: "crimson",
              color: "white",
              borderRadius: "50%",
              fontSize: 11,
              padding: "1px 6px",
            }}
          >
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "110%",
            width: 320,
            maxHeight: 400,
            overflowY: "auto",
            background: "white",
            border: "1px solid #ddd",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", padding: 8, borderBottom: "1px solid #eee" }}>
            <strong>Notifications</strong>
            <button onClick={markAll} style={{ fontSize: 12 }}>
              Mark all read
            </button>
          </div>
          {items.length === 0 && <p style={{ padding: 8, color: "#888" }}>No notifications.</p>}
          {items.map((n) => (
            <div
              key={n.id}
              onClick={() => markOne(n.id)}
              style={{
                padding: 8,
                borderBottom: "1px solid #f0f0f0",
                background: n.isRead ? "white" : "#eef6ff",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {n.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
