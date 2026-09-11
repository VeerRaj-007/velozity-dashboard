import { Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { AuthedRequest } from "../middleware/auth";
import { env } from "../config/env";

const REFRESH_COOKIE = "refreshToken";

const cookieOpts = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: "lax" as const,
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export async function login(req: AuthedRequest, res: Response) {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id });

  res.cookie(REFRESH_COOKIE, refreshToken, cookieOpts);
  res.json({
    accessToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

export async function refresh(req: AuthedRequest, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw new AppError(401, "UNAUTHENTICATED", "No refresh token");

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError(401, "UNAUTHENTICATED", "Refresh token invalid or expired");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new AppError(401, "UNAUTHENTICATED", "User no longer exists");

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  res.json({ accessToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}

export async function logout(_req: AuthedRequest, res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  res.json({ success: true });
}

export async function me(req: AuthedRequest, res: Response) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
}
