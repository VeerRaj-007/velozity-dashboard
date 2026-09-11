import { Server as IOServer, Socket } from "socket.io";
import http from "http";
import { verifyAccessToken } from "../utils/jwt";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { Role } from "@prisma/client";

interface SocketUser {
  id: string;
  role: Role;
}

const onlineUsers = new Map<string, number>();

let io: IOServer;

export function initSockets(server: http.Server) {
  io = new IOServer(server, {
    cors: { origin: env.clientOrigin, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("unauthenticated"));
    try {
      const payload = verifyAccessToken(token);
      (socket as Socket & { user: SocketUser }).user = {
        id: payload.sub,
        role: payload.role,
      };
      next();
    } catch {
      next(new Error("unauthenticated"));
    }
  });

  io.on("connection", async (socket) => {
    const user = (socket as Socket & { user: SocketUser }).user;

    onlineUsers.set(user.id, (onlineUsers.get(user.id) || 0) + 1);
    broadcastPresence();

    if (user.role === "ADMIN") {
      socket.join("global");
    } else if (user.role === "PM") {
      const projects = await prisma.project.findMany({
        where: { managerId: user.id },
        select: { id: true },
      });
      projects.forEach((p: { id: string }) => socket.join(`project:${p.id}`));
    } else {
      // Developer: personal room for events on tasks assigned to them.
      socket.join(`user:${user.id}`);
    }

    socket.on("join_project", async (projectId: string) => {
      const allowed = await canAccessProject(user, projectId);
      if (allowed) socket.join(`project:${projectId}`);
    });

    socket.on("leave_project", (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on("disconnect", () => {
      const count = (onlineUsers.get(user.id) || 1) - 1;
      if (count <= 0) onlineUsers.delete(user.id);
      else onlineUsers.set(user.id, count);
      broadcastPresence();
    });
  });
}

async function canAccessProject(
  user: SocketUser,
  projectId: string,
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  if (user.role === "PM") {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    return project?.managerId === user.id;
  }
  const task = await prisma.task.findFirst({
    where: { projectId, assigneeId: user.id },
  });
  return !!task;
}

function broadcastPresence() {
  io.to("global").emit("presence:count", onlineUsers.size);
}

export function getIO(): IOServer {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}
