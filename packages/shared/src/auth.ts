import { z } from "zod";

export const UserRoleSchema = z.enum([
  "drafter", // 기안자(부장/담당)
  "chair", // 위원장
  "pastor", // 담임목사
  "financeChair", // 재정위원장
  "financeStaff", // 재정부 담당(실제 결제)
  "admin", // 관리자
]);

export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().trim().min(1).max(100),
  role: UserRoleSchema,
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

export const UserWithPasswordHashSchema = UserSchema.extend({
  passwordHash: z.string().min(1),
});

export type UserWithPasswordHash = z.infer<typeof UserWithPasswordHashSchema>;

export const CreateUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(100),
  role: UserRoleSchema,
  password: z.string().min(8).max(200),
});

export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;

export const JwtPayloadSchema = z.object({
  sub: z.string().uuid(),
  role: UserRoleSchema,
  name: z.string(),
  email: z.string().email(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

