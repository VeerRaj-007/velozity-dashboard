import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthedRequest } from "../middleware/auth";
import { AppError } from "../utils/AppError";
import { TaskStatus, Priority } from "@prisma/client";

export async function adminDashboard(req: AuthedRequest, res: Response) {
  const [totalProjects, statusCounts, overdueCount] = await Promise.all([
    prisma.project.count(),
    prisma.task.groupBy({ by: ["status"], _count: true }),
    prisma.task.count({ where: { isOverdue: true } }),
  ]);
  res.json({
    totalProjects,
    tasksByStatus: Object.fromEntries(statusCounts.map((s: { status: TaskStatus; _count: number }) => [s.status, s._count])),
    overdueCount,
  });
}

export async function pmDashboard(req: AuthedRequest, res: Response) {
  const managerId = req.user!.id;
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [projects, priorityCounts, upcoming] = await Promise.all([
    prisma.project.findMany({ where: { managerId }, include: { _count: { select: { tasks: true } } } }),
    prisma.task.groupBy({ by: ["priority"], where: { project: { managerId } }, _count: true }),
    prisma.task.findMany({
      where: { project: { managerId }, dueDate: { lte: weekFromNow }, status: { not: "DONE" } },
      orderBy: { dueDate: "asc" },
      include: { assignee: { select: { name: true } } },
    }),
  ]);

  res.json({
    projects,
    tasksByPriority: Object.fromEntries(priorityCounts.map((p: { priority: Priority; _count: number }) => [p.priority, p._count])),
    upcomingDueThisWeek: upcoming,
  });
}

export async function developerDashboard(req: AuthedRequest, res: Response) {
  const assigneeId = req.user!.id;
  const tasks = await prisma.task.findMany({
    where: { assigneeId },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    include: { project: { select: { name: true } } },
  });
  res.json({ tasks });
}

export async function requireDashboardAccess(req: AuthedRequest, role: string) {
  if (req.user!.role !== role) throw new AppError(403, "FORBIDDEN", "Wrong dashboard for your role");
}
