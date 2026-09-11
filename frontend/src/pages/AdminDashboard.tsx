import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ActivityFeed } from "../components/ActivityFeed";
import { TaskList } from "../components/TaskList";
import { useSocket } from "../hooks/useSocket";

export function AdminDashboard() {
  const socketRef = useSocket();
  const [stats, setStats] = useState<any>(null);
  const [online, setOnline] = useState(0);

  useEffect(() => {
    api.get("/dashboard/admin").then((res) => setStats(res.data));
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.on("presence:count", setOnline);
    return () => {
      socket.off("presence:count", setOnline);
    };
  }, [socketRef.current]);

  return (
    <div>
      <h2>Admin Dashboard</h2>
      {stats && (
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <Stat label="Total Projects" value={stats.totalProjects} />
          <Stat label="Overdue Tasks" value={stats.overdueCount} />
          <Stat label="Users Online Now" value={online} />
          {Object.entries(stats.tasksByStatus || {}).map(([k, v]) => (
            <Stat key={k} label={k} value={v as number} />
          ))}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        <TaskList canUpdateStatus={false} />
        <ActivityFeed socket={socketRef.current} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, minWidth: 100 }}>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#888" }}>{label}</div>
    </div>
  );
}
