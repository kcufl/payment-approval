import { z } from "zod";
import { ActorRoleSchema, ExpenseRequestSchema } from "@payment/shared";

const ListResponseSchema = z.object({
  items: z.array(ExpenseRequestSchema),
});

export type ExpenseRequestListResponse = z.infer<typeof ListResponseSchema>;

function getApiBaseUrl() {
  return process.env.API_BASE_URL ?? "http://localhost:3001";
}

export async function listExpenseRequests(): Promise<ExpenseRequestListResponse> {
  const res = await fetch(`${getApiBaseUrl()}/expense-requests`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return ListResponseSchema.parse(json);
}

const NotificationSchema = z.object({
  id: z.string().uuid(),
  toRole: ActorRoleSchema,
  message: z.string(),
  expenseRequestId: z.string().uuid(),
  createdAt: z.string().datetime(),
  read: z.boolean(),
});

const NotificationListSchema = z.object({
  items: z.array(NotificationSchema),
});

export type NotificationListResponse = z.infer<typeof NotificationListSchema>;

export async function listNotifications(role: z.infer<typeof ActorRoleSchema>): Promise<NotificationListResponse> {
  const res = await fetch(`${getApiBaseUrl()}/notifications?role=${encodeURIComponent(role)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return NotificationListSchema.parse(json);
}

