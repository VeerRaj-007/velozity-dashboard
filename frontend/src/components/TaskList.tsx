import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { Task, TaskStatus, Priority } from "../types";

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function TaskList({ canUpdateStatus }: { canUpdateStatus: boolean }) {
  const [params, setParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const status = params.get("status") || "";
  const priority = params.get("priority") || "";
  const dueFrom = params.get("dueFrom") || "";
  const dueTo = params.get("dueTo") || "";

  useEffect(() => {
    setLoading(true);
    api
      .get("/tasks", { params: { status, priority, dueFrom, dueTo } })
      .then((res) => setTasks(res.data))
      .finally(() => setLoading(false));
  }, [status, priority, dueFrom, dueTo]);

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  async function updateStatus(taskId: string, newStatus: TaskStatus) {
    await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );
  }

  return (
    <div>
      <div
        style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}
      >
        <select
          value={status}
          onChange={(e) => updateFilter("status", e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => updateFilter("priority", e.target.value)}
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <label>
          Due from{" "}
          <input
            type="date"
            value={dueFrom}
            onChange={(e) => updateFilter("dueFrom", e.target.value)}
          />
        </label>
        <label>
          Due to{" "}
          <input
            type="date"
            value={dueTo}
            onChange={(e) => updateFilter("dueTo", e.target.value)}
          />
        </label>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table
          width="100%"
          cellPadding={6}
          style={{ borderCollapse: "collapse" }}
        >
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
              <th>Title</th>
              <th>Project</th>
              <th>Assignee</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr
                key={t.id}
                style={{
                  borderBottom: "1px solid #eee",
                  background: t.isOverdue ? "#fff3f3" : "white",
                }}
              >
                <td>{t.title}</td>
                <td>{t.project?.name}</td>
                <td>{t.assignee?.name || "-"}</td>
                <td>{t.priority}</td>
                <td>
                  {canUpdateStatus ? (
                    <select
                      value={t.status}
                      onChange={(e) =>
                        updateStatus(t.id, e.target.value as TaskStatus)
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    t.status
                  )}
                </td>
                <td>
                  {new Date(t.dueDate).toLocaleDateString()}{" "}
                  {t.isOverdue && (
                    <span style={{ color: "crimson" }}>Overdue</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
