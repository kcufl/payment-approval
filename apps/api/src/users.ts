import { promises as fs } from "node:fs";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  CreateUserInputSchema,
  type CreateUserInput,
  type User,
  UserRoleSchema,
  UserSchema,
  UserWithPasswordHashSchema,
  type UserWithPasswordHash,
} from "@payment/shared";

const UsersFileSchema = z.object({
  users: z.array(UserWithPasswordHashSchema),
});

type UsersFile = z.infer<typeof UsersFileSchema>;

const usersFileUrl = new URL("../data/users.json", import.meta.url);

const isoNow = () => new Date().toISOString();

export type PublicUser = User;

export function toPublicUser(u: UserWithPasswordHash): PublicUser {
  // strip password hash
  const { passwordHash: _passwordHash, ...rest } = u;
  return UserSchema.parse(rest);
}

async function readUsersFile(): Promise<UsersFile> {
  try {
    const raw = await fs.readFile(usersFileUrl, "utf8");
    return UsersFileSchema.parse(JSON.parse(raw));
  } catch (err) {
    // initialize if missing/invalid
    const init: UsersFile = { users: [] };
    await fs.mkdir(new URL("../data/", import.meta.url), { recursive: true });
    await fs.writeFile(usersFileUrl, JSON.stringify(init, null, 2), "utf8");
    return init;
  }
}

async function writeUsersFile(data: UsersFile): Promise<void> {
  await fs.writeFile(usersFileUrl, JSON.stringify(data, null, 2), "utf8");
}

export async function listUsers(): Promise<UserWithPasswordHash[]> {
  const data = await readUsersFile();
  return data.users;
}

export async function getUserById(id: string): Promise<UserWithPasswordHash | null> {
  const data = await readUsersFile();
  return data.users.find((u) => u.id === id) ?? null;
}

export async function findUserByEmail(email: string): Promise<UserWithPasswordHash | null> {
  const data = await readUsersFile();
  const normalized = email.trim().toLowerCase();
  return data.users.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  const parsed = CreateUserInputSchema.parse(input);
  const data = await readUsersFile();

  const exists = data.users.some(
    (u) => u.email.toLowerCase() === parsed.email.toLowerCase(),
  );
  if (exists) throw new Error("EMAIL_ALREADY_EXISTS");

  const now = isoNow();
  const user: UserWithPasswordHash = {
    id: crypto.randomUUID(),
    email: parsed.email.toLowerCase(),
    name: parsed.name,
    role: parsed.role,
    isActive: true,
    passwordHash: await bcrypt.hash(parsed.password, 10),
    createdAt: now,
    updatedAt: now,
  };

  data.users.push(user);
  await writeUsersFile(data);
  return toPublicUser(user);
}

export const UpdateUserInputSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  role: UserRoleSchema.optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).max(200).optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;

export async function updateUser(
  userId: string,
  patch: UpdateUserInput,
): Promise<PublicUser> {
  const parsed = UpdateUserInputSchema.parse(patch);
  const data = await readUsersFile();
  const idx = data.users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error("NOT_FOUND");

  const prev = data.users[idx];
  const next: UserWithPasswordHash = {
    ...prev,
    name: parsed.name ?? prev.name,
    role: parsed.role ?? prev.role,
    isActive: parsed.isActive ?? prev.isActive,
    passwordHash: parsed.password
      ? await bcrypt.hash(parsed.password, 10)
      : prev.passwordHash,
    updatedAt: isoNow(),
  };

  data.users[idx] = UserWithPasswordHashSchema.parse(next);
  await writeUsersFile(data);
  return toPublicUser(data.users[idx]);
}

export async function ensureDefaultAdmin(env: {
  adminEmail: string;
  adminPassword: string;
}): Promise<void> {
  const data = await readUsersFile();
  const hasAdmin = data.users.some((u) => u.role === "admin");
  if (hasAdmin) return;

  const now = isoNow();
  const admin: UserWithPasswordHash = {
    id: crypto.randomUUID(),
    email: env.adminEmail.toLowerCase(),
    name: "Administrator",
    role: "admin",
    isActive: true,
    passwordHash: await bcrypt.hash(env.adminPassword, 10),
    createdAt: now,
    updatedAt: now,
  };
  data.users.push(admin);
  await writeUsersFile(data);
}

