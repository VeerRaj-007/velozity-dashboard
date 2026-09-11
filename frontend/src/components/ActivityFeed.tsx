import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { api } from "../api/client";
import { ActivityEvent } from "../types";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ActivityFeed({
  projectId,
  socket,
}: {
  projectId?: string;
  socket: Socket | null;
}) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    api
      .get("/tasks/activity/feed", { params: projectId ? { projectId } : {} })
      .then((res) => setEvents(res.data));
  }, [projectId]);

  useEffect(() => {
    if (!socket) return;
    if (projectId) socket.emit("join_project", projectId);

    function onActivity(event: ActivityEvent) {
      if (projectId && event.projectId !== projectId) return;
      setEvents((prev) =>
        prev.some((e) => e.id === event.id)
          ? prev
          : [event, ...prev].slice(0, 50),
      );
    }

    socket.on("activity:new", onActivity);
    return () => {
      socket.off("activity:new", onActivity);
      if (projectId) socket.emit("leave_project", projectId);
    };
  }, [socket, projectId]);

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>Activity Feed</h3>
      {events.length === 0 && <p style={{ color: "#888" }}>No activity yet.</p>}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {events.map((e) => (
          <li
            key={e.id}
            style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}
          >
            <div>{e.label}</div>
            <div style={{ fontSize: 12, color: "#888" }}>
              {e.projectName} · {timeAgo(e.createdAt)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
