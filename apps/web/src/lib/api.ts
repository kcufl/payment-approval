import { z } from "zod";
import { ExpenseRequestSchema, UserRoleSchema, UserSchema } from "@payment/shared";

const ListResponseSchema = z.object({
  items: z.array(ExpenseRequestSchema),
});

export type ExpenseRequestListResponse = z.infer<typeof ListResponseSchema>;

function getApiBaseUrl() {
  return process.env.API_BASE_URL ?? "http://localhost:3001";
}

async function apiFetch(path: string, init?: RequestInit, token?: string | null) {
  const headers = new Headers(init?.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  return fetch(`${getApiBaseUrl()}${path}`, { ...init, headers, cache: "no-store" });
}

export async function listExpenseRequests(token: string): Promise<ExpenseRequestListResponse> {
  const res = await fetch(`${getApiBaseUrl()}/expense-requests`, {
    cache: "no-store",
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return ListResponseSchema.parse(json);
}

const NotificationSchema = z.object({
  id: z.string().uuid(),
  toRole: UserRoleSchema,
  message: z.string(),
  expenseRequestId: z.string().uuid(),
  createdAt: z.string().datetime(),
  read: z.boolean(),
});

const NotificationListSchema = z.object({
  items: z.array(NotificationSchema),
});

export type NotificationListResponse = z.infer<typeof NotificationListSchema>;

export async function listMyNotifications(token: string): Promise<NotificationListResponse> {
  const res = await apiFetch("/notifications/my", undefined, token);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return NotificationListSchema.parse(json);
}

export type MeResponse = z.infer<typeof UserSchema>;

export async function getMe(token: string): Promise<MeResponse> {
  const res = await apiFetch("/auth/me", undefined, token);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return UserSchema.parse(await res.json());
}

const AdminUserListSchema = z.object({
  items: z.array(UserSchema),
});

export async function adminListUsers(token: string) {
  const res = await apiFetch("/admin/users", undefined, token);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return AdminUserListSchema.parse(await res.json());
}


