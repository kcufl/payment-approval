import jwt, { type SignOptions } from "jsonwebtoken";
import { z } from "zod";
import type { Context, Next } from "hono";
import { JwtPayloadSchema, LoginInputSchema } from "@payment/shared";
import bcrypt from "bcryptjs";
import { findUserByEmail, toPublicUser } from "./users";

const EnvSchema = z.object({
  JWT_SECRET: z.string().min(16).default("dev-secret-please-change"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  ADMIN_EMAIL: z.string().email().default("admin@example.com"),
  ADMIN_PASSWORD: z.string().min(8).default("admin1234"),
});

export const env = EnvSchema.parse(process.env);

export function signToken(payload: {
  sub: string;
  role: string;
  name: string;
  email: string;
}) {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export async function loginWithEmailPassword(input: unknown) {
  const parsed = LoginInputSchema.parse(input);
  const user = await findUserByEmail(parsed.email);
  if (!user || !user.isActive) throw new Error("INVALID_CREDENTIALS");

  const ok = await bcrypt.compare(parsed.password, user.passwordHash);
  if (!ok) throw new Error("INVALID_CREDENTIALS");

  const token = signToken({
    sub: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  });
  return { token, user: toPublicUser(user) };
}

export function authRequired() {
  return async (c: Context, next: Next) => {
    const auth = c.req.header("authorization") ?? "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return c.json({ error: "UNAUTHORIZED" }, 401);

    try {
      const decoded = jwt.verify(m[1], env.JWT_SECRET);
      const payload = JwtPayloadSchema.parse(decoded);
      c.set("auth", payload);
      await next();
    } catch {
      return c.json({ error: "UNAUTHORIZED" }, 401);
    }
  };
}

export function getAuth(c: Context) {
  const payload = c.get("auth");
  return JwtPayloadSchema.parse(payload);
}

export function requireRole(c: Context, roles: string[]) {
  const auth = getAuth(c);
  if (auth.role === "admin") return auth; // admin bypass
  if (!roles.includes(auth.role)) throw new Error("FORBIDDEN");
  return auth;
}

