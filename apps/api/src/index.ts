import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import {
  CreateUserInputSchema,
  CreateExpenseRequestInputSchema,
  CreatePaymentResolutionInputSchema,
  ExpenseRequestSchema,
  ExpenseRequestActionInputSchema,
  JwtPayloadSchema,
  MarkPaidInputSchema,
  PaymentResolutionSchema,
  RequestPaymentInputSchema,
  UserRoleSchema,
  type ExpenseRequest,
  type PaymentResolution,
} from "@payment/shared";
import { authRequired, env, getAuth, loginWithEmailPassword, requireRole } from "./auth";
import { ensureDefaultAdmin, listUsers, toPublicUser, createUser, updateUser, getUserById } from "./users";
import { listNotificationsForRole, listNotificationsForUser, pushNotification } from "./notifications";

const app = new Hono();

const isoNow = () => new Date().toISOString();

app.use(
  "*",
  cors({
    origin: ["http://localhost:3000"],
  }),
);

await ensureDefaultAdmin({ adminEmail: env.ADMIN_EMAIL, adminPassword: env.ADMIN_PASSWORD });

// In-memory store (초기 개발용). DB 연결 전까지 웹/앱 동일 기능 검증에 사용.
const store = new Map<string, PaymentResolution>();
const expenseRequestStore = new Map<string, ExpenseRequest>();

function logAction(
  req: ExpenseRequest,
  input: {
    byRole: z.infer<typeof UserRoleSchema>;
    type: ExpenseRequest["actionLogs"][number]["type"];
    note?: string;
  },
) {
  const now = isoNow();
  req.actionLogs = [
    ...(req.actionLogs ?? []),
    {
      id: crypto.randomUUID(),
      type: input.type,
      byRole: input.byRole as any,
      note: input.note,
      at: now,
    },
  ];
  req.updatedAt = now;
}

function seedIfEmpty() {
  if (store.size > 0) return;
  const id = crypto.randomUUID();
  const now = isoNow();
  store.set(id, {
    id,
    title: "샘플 지급결의서",
    purpose: "초기 화면/연동 확인용",
    amount: { currency: "KRW", amount: 150000 },
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });
}

function seedExpenseRequestIfEmpty() {
  if (expenseRequestStore.size > 0) return;
  const id = crypto.randomUUID();
  const now = isoNow();
  const currency = "KRW";
  const expenseItems = [
    {
      category: "지출예상",
      description: "식비",
      amount: { currency, amount: 120000 },
      note: "인원 10명",
    },
  ];
  const incomeItems = [
    {
      category: "수입예상",
      description: "회비",
      amount: { currency, amount: 50000 },
      note: "",
    },
  ];
  const expenseTotal = { currency, amount: 120000 };
  const incomeTotal = { currency, amount: 50000 };
  const supportRequestedAmount = { currency, amount: 70000 };

  expenseRequestStore.set(id, {
    id,
    departmentAndRequester: "청년부 / 홍길동",
    usagePeriod: "2026-01-01 ~ 2026-01-31",
    eventName: "청년부 수련회 준비",
    approvals: { manager: "", committeeChair: "", pastor: "" },
    expenseItems,
    incomeItems,
    expenseTotal,
    incomeTotal,
    supportRequestedAmount,
    status: "draft",
    receipts: [],
    workflow: {},
    actionLogs: [{ id: crypto.randomUUID(), type: "create", byRole: "drafter" as any, at: now }],
    createdAt: now,
    updatedAt: now,
  });
}

app.get("/health", (c) => c.json({ ok: true }));

app.post("/auth/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  try {
    return c.json(await loginWithEmailPassword(body));
  } catch {
    return c.json({ error: "INVALID_CREDENTIALS" }, 401);
  }
});

app.get("/auth/me", authRequired(), async (c) => {
  const auth = getAuth(c);
  const user = await getUserById(auth.sub);
  if (!user || !user.isActive) return c.json({ error: "UNAUTHORIZED" }, 401);
  return c.json(toPublicUser(user));
});

app.get("/admin/users", authRequired(), async (c) => {
  try {
    requireRole(c, ["admin"]);
    const users = await listUsers();
    return c.json({ items: users.map(toPublicUser) });
  } catch {
    return c.json({ error: "FORBIDDEN" }, 403);
  }
});

app.post("/admin/users", authRequired(), async (c) => {
  try {
    requireRole(c, ["admin"]);
    const body = await c.req.json().catch(() => null);
    const input = CreateUserInputSchema.safeParse(body);
    if (!input.success) return c.json({ error: "INVALID_INPUT", issues: input.error.issues }, 400);
    const user = await createUser(input.data);
    return c.json(user, 201);
  } catch (e) {
    if (String(e).includes("EMAIL_ALREADY_EXISTS")) return c.json({ error: "EMAIL_ALREADY_EXISTS" }, 409);
    return c.json({ error: "FORBIDDEN" }, 403);
  }
});

app.patch("/admin/users/:id", authRequired(), async (c) => {
  try {
    requireRole(c, ["admin"]);
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);
    const user = await updateUser(id, body ?? {});
    return c.json(user);
  } catch (e) {
    if (String(e).includes("NOT_FOUND")) return c.json({ error: "NOT_FOUND" }, 404);
    return c.json({ error: "FORBIDDEN" }, 403);
  }
});

app.get("/payment-resolutions", (c) => {
  seedIfEmpty();
  const items = Array.from(store.values()).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  );
  return c.json({ items });
});

app.post("/payment-resolutions", async (c) => {
  const body = await c.req.json().catch(() => null);
  const input = CreatePaymentResolutionInputSchema.safeParse(body);
  if (!input.success) {
    return c.json(
      { error: "INVALID_INPUT", issues: input.error.issues },
      400,
    );
  }

  const id = crypto.randomUUID();
  const now = isoNow();
  const created: PaymentResolution = {
    id,
    title: input.data.title,
    purpose: input.data.purpose,
    amount: input.data.amount,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };

  // 방어적 검증(공유 스키마와 실제 응답 불일치 방지)
  PaymentResolutionSchema.parse(created);

  store.set(id, created);
  return c.json(created, 201);
});

app.get("/expense-requests", authRequired(), (c) => {
  seedExpenseRequestIfEmpty();
  const items = Array.from(expenseRequestStore.values()).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  );
  return c.json({ items });
});

app.get("/expense-requests/:id", authRequired(), (c) => {
  const id = c.req.param("id");
  const item = expenseRequestStore.get(id);
  if (!item) return c.json({ error: "NOT_FOUND" }, 404);
  return c.json(item);
});

app.post("/expense-requests", authRequired(), async (c) => {
  try {
    requireRole(c, ["drafter"]);
  } catch {
    return c.json({ error: "FORBIDDEN" }, 403);
  }
  const body = await c.req.json().catch(() => null);
  const input = CreateExpenseRequestInputSchema.safeParse(body);
  if (!input.success) {
    return c.json(
      { error: "INVALID_INPUT", issues: input.error.issues },
      400,
    );
  }

  const currency =
    input.data.supportRequestedAmount?.currency ??
    input.data.expenseItems[0]?.amount.currency ??
    input.data.incomeItems[0]?.amount.currency ??
    "KRW";

  const expenseTotalAmount = input.data.expenseItems.reduce(
    (sum, it) => sum + it.amount.amount,
    0,
  );
  const incomeTotalAmount = input.data.incomeItems.reduce(
    (sum, it) => sum + it.amount.amount,
    0,
  );

  const computedSupport = Math.max(0, expenseTotalAmount - incomeTotalAmount);

  const supportRequestedAmount =
    input.data.supportRequestedAmount ?? ({ currency, amount: computedSupport } as const);

  const id = crypto.randomUUID();
  const now = isoNow();
  const created: ExpenseRequest = {
    id,
    departmentAndRequester: input.data.departmentAndRequester,
    usagePeriod: input.data.usagePeriod,
    eventName: input.data.eventName,
    approvals: input.data.approvals,
    expenseItems: input.data.expenseItems,
    incomeItems: input.data.incomeItems,
    expenseTotal: { currency, amount: expenseTotalAmount },
    incomeTotal: { currency, amount: incomeTotalAmount },
    supportRequestedAmount,
    status: "draft",
    receipts: [],
    workflow: {},
    actionLogs: [{ id: crypto.randomUUID(), type: "create", byRole: "drafter" as any, at: now }],
    createdAt: now,
    updatedAt: now,
  };

  ExpenseRequestSchema.parse(created);

  expenseRequestStore.set(id, created);
  return c.json(created, 201);
});

const RejectInputSchema = ExpenseRequestActionInputSchema.extend({
  reason: z.string().trim().min(1).max(2000),
});

function requireExpenseRequest(id: string) {
  const item = expenseRequestStore.get(id);
  if (!item) return null;
  return item;
}

app.post("/expense-requests/:id/request-chair", authRequired(), async (c) => {
  const auth = getAuth(c);
  if (auth.role !== "drafter") return c.json({ error: "FORBIDDEN" }, 403);
  const byRole = auth.role;

  const id = c.req.param("id");
  const item = requireExpenseRequest(id);
  if (!item) return c.json({ error: "NOT_FOUND" }, 404);

  const body = await c.req.json().catch(() => null);
  const input = ExpenseRequestActionInputSchema.safeParse({
    byRole: auth.role,
    note: body?.note,
  });
  if (!input.success) {
    return c.json({ error: "INVALID_INPUT", issues: input.error.issues }, 400);
  }

  if (item.status !== "draft" && item.status !== "rejected") {
    return c.json({ error: "INVALID_STATE", status: item.status }, 409);
  }

  item.status = "chair_review";
  item.rejection = undefined;
  item.workflow = { ...(item.workflow ?? {}), chairRequestedAt: isoNow() };
  logAction(item, { byRole, type: "request_chair", note: input.data.note });
  await pushNotification({
    toRole: "chair",
    message: `지급결의서 검토 요청: ${item.eventName}`,
    expenseRequestId: item.id,
  });

  ExpenseRequestSchema.parse(item);
  return c.json(item);
});

app.post("/expense-requests/:id/request-pastor", authRequired(), async (c) => {
  const auth = getAuth(c);
  if (auth.role !== "chair") return c.json({ error: "FORBIDDEN" }, 403);
  const byRole = auth.role;

  const id = c.req.param("id");
  const item = requireExpenseRequest(id);
  if (!item) return c.json({ error: "NOT_FOUND" }, 404);

  const body = await c.req.json().catch(() => null);
  const input = ExpenseRequestActionInputSchema.safeParse({
    byRole: auth.role,
    note: body?.note,
  });
  if (!input.success) {
    return c.json({ error: "INVALID_INPUT", issues: input.error.issues }, 400);
  }
  if (item.status !== "chair_review") {
    return c.json({ error: "INVALID_STATE", status: item.status }, 409);
  }

  item.status = "pastor_review";
  item.workflow = { ...(item.workflow ?? {}), pastorRequestedAt: isoNow() };
  logAction(item, { byRole, type: "request_pastor", note: input.data.note });
  await pushNotification({
    toRole: "pastor",
    message: `지급결의서 승인 요청: ${item.eventName}`,
    expenseRequestId: item.id,
  });

  ExpenseRequestSchema.parse(item);
  return c.json(item);
});

app.post("/expense-requests/:id/approve-pastor", authRequired(), async (c) => {
  const auth = getAuth(c);
  if (auth.role !== "pastor") return c.json({ error: "FORBIDDEN" }, 403);
  const byRole = auth.role;

  const id = c.req.param("id");
  const item = requireExpenseRequest(id);
  if (!item) return c.json({ error: "NOT_FOUND" }, 404);

  const body = await c.req.json().catch(() => null);
  const input = ExpenseRequestActionInputSchema.safeParse({
    byRole: auth.role,
    note: body?.note,
  });
  if (!input.success) {
    return c.json({ error: "INVALID_INPUT", issues: input.error.issues }, 400);
  }
  if (item.status !== "pastor_review") {
    return c.json({ error: "INVALID_STATE", status: item.status }, 409);
  }

  item.status = "finance_chair_review";
  item.workflow = { ...(item.workflow ?? {}), pastorApprovedAt: isoNow() };
  logAction(item, { byRole, type: "approve_pastor", note: input.data.note });
  await pushNotification({
    toRole: "financeChair",
    message: `지급결의서 승인 요청(재정위원장): ${item.eventName}`,
    expenseRequestId: item.id,
  });

  ExpenseRequestSchema.parse(item);
  return c.json(item);
});

app.post("/expense-requests/:id/approve-finance-chair", authRequired(), async (c) => {
  const auth = getAuth(c);
  if (auth.role !== "financeChair") return c.json({ error: "FORBIDDEN" }, 403);
  const byRole = auth.role;

  const id = c.req.param("id");
  const item = requireExpenseRequest(id);
  if (!item) return c.json({ error: "NOT_FOUND" }, 404);

  const body = await c.req.json().catch(() => null);
  const input = ExpenseRequestActionInputSchema.safeParse({
    byRole: auth.role,
    note: body?.note,
  });
  if (!input.success) {
    return c.json({ error: "INVALID_INPUT", issues: input.error.issues }, 400);
  }
  if (item.status !== "finance_chair_review") {
    return c.json({ error: "INVALID_STATE", status: item.status }, 409);
  }

  item.status = "budget_approved";
  item.workflow = { ...(item.workflow ?? {}), financeChairApprovedAt: isoNow() };
  logAction(item, { byRole, type: "approve_finance_chair", note: input.data.note });
  await pushNotification({
    toRole: "financeStaff",
    message: `예산 승인 완료(집행 가능): ${item.eventName}`,
    expenseRequestId: item.id,
  });

  ExpenseRequestSchema.parse(item);
  return c.json(item);
});

app.post("/expense-requests/:id/request-payment", authRequired(), async (c) => {
  const auth = getAuth(c);
  if (auth.role !== "drafter") return c.json({ error: "FORBIDDEN" }, 403);
  const byRole = auth.role;

  const id = c.req.param("id");
  const item = requireExpenseRequest(id);
  if (!item) return c.json({ error: "NOT_FOUND" }, 404);

  const body = await c.req.json().catch(() => null);
  const input = RequestPaymentInputSchema.safeParse({
    ...body,
    byRole: auth.role,
  });
  if (!input.success) {
    return c.json({ error: "INVALID_INPUT", issues: input.error.issues }, 400);
  }
  if (item.status !== "budget_approved") {
    return c.json({ error: "INVALID_STATE", status: item.status }, 409);
  }

  const now = isoNow();
  item.status = "payment_requested";
  item.actualTotal = input.data.actualTotal;
  // 지급요청 재제출 시 최신 영수증/금액으로 덮어씀(이력은 actionLogs로 추적)
  item.receipts = input.data.receipts.map((r) => ({
    id: crypto.randomUUID(),
    label: r.label,
    url: r.url,
    uploadedAt: now,
    uploadedByRole: byRole as any,
  }));
  item.workflow = { ...(item.workflow ?? {}), paymentRequestedAt: now };
  logAction(item, { byRole, type: "request_payment", note: input.data.note });
  await pushNotification({
    toRole: "financeStaff",
    message: `지급 요청(영수증 첨부): ${item.eventName}`,
    expenseRequestId: item.id,
  });

  ExpenseRequestSchema.parse(item);
  return c.json(item);
});

app.post("/expense-requests/:id/mark-paid", authRequired(), async (c) => {
  const auth = getAuth(c);
  if (auth.role !== "financeStaff") return c.json({ error: "FORBIDDEN" }, 403);
  const byRole = auth.role;

  const id = c.req.param("id");
  const item = requireExpenseRequest(id);
  if (!item) return c.json({ error: "NOT_FOUND" }, 404);

  const body = await c.req.json().catch(() => null);
  const input = MarkPaidInputSchema.safeParse({
    ...body,
    byRole: auth.role,
  });
  if (!input.success) {
    return c.json({ error: "INVALID_INPUT", issues: input.error.issues }, 400);
  }
  if (item.status !== "payment_requested") {
    return c.json({ error: "INVALID_STATE", status: item.status }, 409);
  }

  item.status = "paid";
  item.workflow = { ...(item.workflow ?? {}), paidAt: isoNow() };
  // paidAmount는 우선 로그/노트로 남김(추후 결제정보 필드로 확장 가능)
  logAction(item, { byRole, type: "mark_paid", note: input.data.note });
  await pushNotification({
    toRole: "drafter",
    message: `결제 완료 처리됨: ${item.eventName} (${input.data.paidAmount.currency} ${input.data.paidAmount.amount.toLocaleString()})`,
    expenseRequestId: item.id,
  });

  ExpenseRequestSchema.parse(item);
  return c.json(item);
});

app.post("/expense-requests/:id/reject", authRequired(), async (c) => {
  const auth = getAuth(c);
  const byRole = auth.role;

  const id = c.req.param("id");
  const item = requireExpenseRequest(id);
  if (!item) return c.json({ error: "NOT_FOUND" }, 404);

  const body = await c.req.json().catch(() => null);
  const input = RejectInputSchema.safeParse({
    ...body,
    byRole: auth.role,
  });
  if (!input.success) {
    return c.json({ error: "INVALID_INPUT", issues: input.error.issues }, 400);
  }

  // 어느 결재 단계에서든 반려 가능(데모용)
  const rejectable = new Set([
    "chair_review",
    "pastor_review",
    "finance_chair_review",
    "payment_requested",
  ]);
  if (!rejectable.has(item.status)) {
    return c.json({ error: "INVALID_STATE", status: item.status }, 409);
  }

  // (B) 지급요청 단계 반려는 예산승인 상태로 되돌림(결재 재진행 없이 보완 후 재요청)
  if (item.status === "payment_requested" && byRole === "financeStaff") {
    item.status = "budget_approved";
  } else {
    item.status = "rejected";
  }
  item.rejection = {
    reason: input.data.reason,
    rejectedAt: isoNow(),
    rejectedByRole: byRole as any,
  };
  logAction(item, { byRole, type: "reject", note: input.data.reason });
  await pushNotification({
    toRole: "drafter",
    message:
      item.status === "budget_approved"
        ? `지급요청 보완 필요: ${item.eventName} (${input.data.reason})`
        : `반려됨: ${item.eventName} (${input.data.reason})`,
    expenseRequestId: item.id,
  });

  ExpenseRequestSchema.parse(item);
  return c.json(item);
});

app.get("/notifications/my", authRequired(), async (c) => {
  const auth = getAuth(c);
  const user = await getUserById(auth.sub);
  if (!user || !user.isActive) return c.json({ error: "UNAUTHORIZED" }, 401);
  return c.json({ items: listNotificationsForUser(toPublicUser(user)) });
});

// legacy (role 기반 데모 유지용)
app.get("/notifications", authRequired(), (c) => {
  const role = UserRoleSchema.safeParse(c.req.query("role"));
  if (!role.success) return c.json({ error: "INVALID_ROLE" }, 400);
  return c.json({ items: listNotificationsForRole(role.data) });
});

serve(
  {
    fetch: app.fetch,
    port: z.coerce.number().int().positive().default(3001).parse(process.env.PORT),
  },
  (info) => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${info.port}`);
  },
);

