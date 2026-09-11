import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ActivityFeed } from "../components/ActivityFeed";
import { TaskList } from "../components/TaskList";
import { useSocket } from "../hooks/useSocket";
import { Project, Task } from "../types";

export function PMDashboard() {
  const socketRef = useSocket();
  const [data, setData] = useState<{ projects: Project[]; upcomingDueThisWeek: Task[] } | null>(null);
  const [activeProject, setActiveProject] = useState<string | undefined>(undefined);

  useEffect(() => {
    api.get("/dashboard/pm").then((res) => setData(res.data));
  }, []);

  return (
    <div>
      <h2>Project Manager Dashboard</h2>
      {data && (
        <>
          <h3>Your Projects</h3>
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            {data.projects.map((p) => (
              <div
                key={p.id}
                onClick={() => setActiveProject(p.id === activeProject ? undefined : p.id)}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: 12,
                  cursor: "pointer",
                  background: activeProject === p.id ? "#eef6ff" : "white",
                }}
              >
                <strong>{p.name}</strong>
                <div style={{ fontSize: 12, color: "#888" }}>{p._count?.tasks} tasks</div>
              </div>
            ))}
          </div>

          <h3>Due This Week</h3>
          <ul>
            {data.upcomingDueThisWeek.map((t) => (
              <li key={t.id}>
                {t.title} — {t.assignee?.name} — {new Date(t.dueDate).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginTop: 16 }}>
        <TaskList canUpdateStatus={true} />
        <ActivityFeed projectId={activeProject} socket={socketRef.current} />
      </div>
    </div>
  );
}
