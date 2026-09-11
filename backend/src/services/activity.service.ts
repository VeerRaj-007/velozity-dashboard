import { prisma } from "../config/prisma";
import { getIO } from "../sockets";
import { TaskStatus } from "@prisma/client";

interface RecordActivityInput {
  taskId: string;
  userId: string; // who made the change
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
}

export async function recordActivity(input: RecordActivityInput) {
  const [activity, task, actor] = await Promise.all([
    prisma.taskActivity.create({
      data: {
        taskId: input.taskId,
        userId: input.userId,
        fromStatus: input.fromStatus ?? undefined,
        toStatus: input.toStatus,
      },
    }),
    prisma.task.findUniqueOrThrow({
      where: { id: input.taskId },
      include: { project: true, assignee: true },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: input.userId } }),
  ]);

  const event = {
    id: activity.id,
    taskId: task.id,
    taskTitle: task.title,
    projectId: task.projectId,
    projectName: task.project.name,
    actorId: actor.id,
    actorName: actor.name,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    createdAt: activity.createdAt,
    // Pre-formatted label matching the required feed string shape; the
    // "X mins ago" portion is relative and rendered client-side from createdAt.
    label: `${actor.name} moved "${task.title}" ${input.fromStatus ? `from ${input.fromStatus} ` : ""}\u2192 ${input.toStatus}`,
  };

  const io = getIO();
  io.to("global").emit("activity:new", event);
  io.to(`project:${task.projectId}`).emit("activity:new", event);
  if (task.assigneeId)
    io.to(`user:${task.assigneeId}`).emit("activity:new", event);

  await maybeNotify(task, input.toStatus, actor.name);

  return activity;
}

async function maybeNotify(
  task: {
    id: string;
    title: string;
    projectId: string;
    assigneeId: string | null;
    project: { managerId: string };
  },
  toStatus: TaskStatus,
  actorName: string,
) {
  const notifications: { userId: string; message: string; taskId: string }[] =
    [];

  if (toStatus === "IN_REVIEW") {
    notifications.push({
      userId: task.project.managerId,
      message: `${actorName} moved "${task.title}" to In Review`,
      taskId: task.id,
    });
  }

  if (notifications.length === 0) return;

  const created = await prisma.$transaction(
    notifications.map((n) => prisma.notification.create({ data: n })),
  );

  const io = getIO();
  for (const n of created) {
    io.to(`user:${n.userId}`).emit("notification:new", n);
  }
}

export async function notifyAssignment(
  taskId: string,
  assigneeId: string,
  taskTitle: string,
) {
  const notification = await prisma.notification.create({
    data: {
      userId: assigneeId,
      message: `You were assigned to "${taskTitle}"`,
      taskId,
    },
  });
  getIO().to(`user:${assigneeId}`).emit("notification:new", notification);
}
