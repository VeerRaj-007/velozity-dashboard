import { Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { AuthedRequest } from "./auth";
import { AppError } from "../utils/AppError";

export function requireRole(...roles: Role[]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user)
      return next(new AppError(401, "UNAUTHENTICATED", "Not authenticated"));
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          "FORBIDDEN",
          "You do not have access to this resource",
        ),
      );
    }
    next();
  };
}
