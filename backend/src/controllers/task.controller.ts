import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthedRequest } from "../middleware/auth";
import { AppError } from "../utils/AppError";
import { assertProjectAccess } from "./project.controller";
import { recordActivity, notifyAssignment } from "../services/activity.service";
import { TaskStatus, Priority, Prisma } from "@prisma/client";

export async function listTasks(req: AuthedRequest, res: Response) {
  const { role, id } = req.user!;
  const { status, priority, dueFrom, dueTo, projectId } = req.query as Record<
    string,
    string | undefined
  >;

  const where: Prisma.TaskWhereInput = {};

  if (role === "PM") where.project = { managerId: id };
  else if (role === "DEVELOPER") where.assigneeId = id;

  if (projectId) where.projectId = projectId;
  if (status) where.status = status as TaskStatus;
  if (priority) where.priority = priority as Priority;
  if (dueFrom || dueTo) {
    where.dueDate = {
      ...(dueFrom ? { gte: new Date(dueFrom) } : {}),
      ...(dueTo ? { lte: new Date(dueTo) } : {}),
    };
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });
  res.json(tasks);
}

export async function createTask(req: AuthedRequest, res: Response) {
  const { title, description, projectId, assigneeId, priority, dueDate } =
    req.body;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError(404, "NOT_FOUND", "Project not found");
  await assertProjectAccess(req.user!, project);
  if (req.user!.role === "PM" && project.managerId !== req.user!.id) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "You can only add tasks to your own projects",
    );
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      projectId,
      assigneeId,
      priority,
      dueDate: new Date(dueDate),
    },
  });

  if (assigneeId) await notifyAssignment(task.id, assigneeId, task.title);

  res.status(201).json(task);
}

export async function updateTaskStatus(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  const { status } = req.body as { status: TaskStatus };
  const user = req.user!;

  const task = await prisma.task.findUnique({
    where: { id },
    include: { project: true },
  });
  if (!task) throw new AppError(404, "NOT_FOUND", "Task not found");

  if (user.role === "DEVELOPER" && task.assigneeId !== user.id) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "You can only update tasks assigned to you",
    );
  }
  if (user.role === "PM" && task.project.managerId !== user.id) {
    throw new AppError(403, "FORBIDDEN", "Not your project");
  }

  const previousStatus = task.status;
  const updated = await prisma.task.update({ where: { id }, data: { status } });

  await recordActivity({
    taskId: id,
    userId: user.id,
    fromStatus: previousStatus,
    toStatus: status,
  });

  res.json(updated);
}

export async function getActivityFeed(req: AuthedRequest, res: Response) {
  const { role, id } = req.user!;
  const projectId = req.query.projectId as string | undefined;

  const where: Prisma.TaskActivityWhereInput = {};
  if (projectId) {
    where.task = { projectId };
  } else if (role === "PM") {
    where.task = { project: { managerId: id } };
  } else if (role === "DEVELOPER") {
    where.task = { assigneeId: id };
  }

  const activity = await prisma.taskActivity.findMany({
    where,
    include: {
      task: { include: { project: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  res.json(
    activity.map((a: (typeof activity)[number]) => ({
      id: a.id,
      taskId: a.taskId,
      taskTitle: a.task.title,
      projectId: a.task.projectId,
      projectName: a.task.project.name,
      actorId: a.user.id,
      actorName: a.user.name,
      fromStatus: a.fromStatus,
      toStatus: a.toStatus,
      createdAt: a.createdAt,
      label: `${a.user.name} moved "${a.task.title}" ${a.fromStatus ? `from ${a.fromStatus} ` : ""}\u2192 ${a.toStatus}`,
    })),
  );
}
