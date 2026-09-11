import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthedRequest } from "../middleware/auth";
import { AppError } from "../utils/AppError";

export async function listProjects(req: AuthedRequest, res: Response) {
  const { role, id } = req.user!;

  const where =
    role === "ADMIN"
      ? {}
      : role === "PM"
        ? { managerId: id }
        : { tasks: { some: { assigneeId: id } } };

  const projects = await prisma.project.findMany({
    where,
    include: {
      client: true,
      manager: { select: { id: true, name: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(projects);
}

export async function createProject(req: AuthedRequest, res: Response) {
  const { name, description, clientId, managerId } = req.body;
  const { role, id } = req.user!;

  const resolvedManagerId = role === "PM" ? id : managerId;
  if (!resolvedManagerId)
    throw new AppError(400, "VALIDATION_ERROR", "managerId is required");

  const project = await prisma.project.create({
    data: { name, description, clientId, managerId: resolvedManagerId },
  });
  res.status(201).json(project);
}

export async function getProject(req: AuthedRequest, res: Response) {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: { client: true, manager: { select: { id: true, name: true } } },
  });
  if (!project) throw new AppError(404, "NOT_FOUND", "Project not found");
  await assertProjectAccess(req.user!, project);
  res.json(project);
}

export async function assertProjectAccess(
  user: { id: string; role: string },
  project: { managerId: string; id: string },
) {
  if (user.role === "ADMIN") return;
  if (user.role === "PM") {
    if (project.managerId !== user.id)
      throw new AppError(403, "FORBIDDEN", "Not your project");
    return;
  }
  const task = await prisma.task.findFirst({
    where: { projectId: project.id, assigneeId: user.id },
  });
  if (!task) throw new AppError(403, "FORBIDDEN", "No access to this project");
}
