import { TaskList } from "../components/TaskList";
import { ActivityFeed } from "../components/ActivityFeed";
import { useSocket } from "../hooks/useSocket";

export function DeveloperDashboard() {
  const socketRef = useSocket();
  return (
    <div>
      <h2>My Tasks</h2>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        <TaskList canUpdateStatus={true} />
        <ActivityFeed socket={socketRef.current} />
      </div>
    </div>
  );
}
