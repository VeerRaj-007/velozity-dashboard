import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { Role } from "@prisma/client";

export interface AuthedRequest extends Request {
  user?: { id: string; role: Role };
}

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(
      new AppError(401, "UNAUTHENTICATED", "Missing or malformed access token"),
    );
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(
      new AppError(401, "UNAUTHENTICATED", "Access token invalid or expired"),
    );
  }
}
