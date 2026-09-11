export type Role = "ADMIN" | "PM" | "DEVELOPER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  clientId: string;
  managerId: string;
  client?: { name: string };
  manager?: { name: string };
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  assigneeId?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  isOverdue: boolean;
  project?: { id: string; name: string };
  assignee?: { id: string; name: string };
}

export interface ActivityEvent {
  id: string;
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectName: string;
  actorId: string;
  actorName: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  createdAt: string;
  label: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  message: string;
  taskId?: string;
  isRead: boolean;
  createdAt: string;
}
