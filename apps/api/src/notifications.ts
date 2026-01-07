import { z } from "zod";
import { UserRoleSchema } from "@payment/shared";
import type { PublicUser } from "./users";
import { listUsers } from "./users";

const isoNow = () => new Date().toISOString();

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  toUserId: z.string().uuid().optional(),
  toRole: UserRoleSchema,
  message: z.string(),
  expenseRequestId: z.string().uuid(),
  createdAt: z.string().datetime(),
  read: z.boolean(),
});

export type Notification = z.infer<typeof NotificationSchema>;

const notificationStore = new Map<string, Notification>();

async function resolveRecipientUserId(role: z.infer<typeof UserRoleSchema>) {
  const users = await listUsers();
  const u = users.find((x) => x.isActive && x.role === role);
  return u?.id;
}

export async function pushNotification(input: Omit<Notification, "id" | "createdAt" | "read" | "toUserId"> & { toUserId?: string }) {
  const id = crypto.randomUUID();
  const createdAt = isoNow();
  const toUserId = input.toUserId ?? (await resolveRecipientUserId(input.toRole));
  const n: Notification = {
    id,
    createdAt,
    read: false,
    toUserId,
    ...input,
  };
  notificationStore.set(id, NotificationSchema.parse(n));
}

export function listNotificationsForUser(user: PublicUser) {
  return Array.from(notificationStore.values())
    .filter((n) => n.toUserId === user.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function listNotificationsForRole(role: z.infer<typeof UserRoleSchema>) {
  return Array.from(notificationStore.values())
    .filter((n) => n.toRole === role)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

