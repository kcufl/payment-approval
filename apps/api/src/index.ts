import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import {
  ActorRoleSchema,
  CreateExpenseRequestInputSchema,
  CreatePaymentResolutionInputSchema,
  ExpenseRequestSchema,
  ExpenseRequestActionInputSchema,
  MarkPaidInputSchema,
  PaymentResolutionSchema,
  RequestPaymentInputSchema,
  type ExpenseRequest,
  type ActorRole,
  type PaymentResolution,
} from "@payment/shared";

const app = new Hono();

const isoNow = () => new Date().toISOString();

app.use(
  "*",
  cors({
    origin: ["http://localhost:3000"],
  }),
);

// In-memory store (초기 개발용). DB 연결 전까지 웹/앱 동일 기능 검증에 사용.
const store = new Map<string, PaymentResolution>();
const expenseRequestStore = new Map<string, ExpenseRequest>();

type Notification = {
  id: string;
  toRole: ActorRole;
  message: string;
  expenseRequestId: string;
  createdAt: string;
  read: boolean;
};

const notificationStore = new Map<string, Notification>();

function pushNotification(n: Omit<Notification, "id" | "createdAt" | "read">) {
  const id = crypto.randomUUID();
  const createdAt = isoNow();
  notificationStore.set(id, { id, createdAt, read: false, ...n });
}

function logAction(
  req: ExpenseRequest,
  input: { byRole: ActorRole; type: ExpenseRequest["actionLogs"][number]["type"]; note?: string },
) {
  const now = isoNow();
  req.actionLogs = [
    ...(req.actionLogs ?? []),
    {
      id: crypto.randomUUID(),
      type: input.type,
      byRole: input.byRole,
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
    actionLogs: [
      { id: crypto.randomUUID(), type: "create", byRole: "drafter", at: now },
    ],
    createdAt: now,
    updatedAt: now,
  });
}

app.get("/health", (c) => c.json({ ok: true }));

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

app.get("/expense-requests", (c) => {
  seedExpenseRequestIfEmpty();
  const items = Array.from(expenseRequestStore.values()).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  );
  return c.json({ items });
});

app.get("/expense-requests/:id", (c) => {
  const id = c.req.param("id");
  const item = expenseRequestStore.get(id);
  if (!item) return c.json({ error: "NOT_FOUND" }, 404);
  return c.json(item);
});

app.post("/expense-requests", async (c) => {
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
    actionLogs: [
      { id: crypto.randomUUID(), type: "create", byRole: "drafter", at: now },
    ],
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

app.post("/expense-requests/:id/request-chair", async (c) => {
  const id = c.req.param("id");
  const item = requireExpenseRequest(id);
  if (!item) return c.json({ error: "NOT_FOUND" }, 404);

  const body = await c.req.json().catch(() => null);
  const input = ExpenseRequestActionInputSchema.safeParse(body);
  if (!input.success) {
    return c.json({ error: "INVALID_INPUT", issues: input.error.issues }, 400);
  }

  if (item.status !== "draft" && item.status !== "rejected") {
    return c.json({ error: "INVALID_STATE", status: item.status }, 409);
  }
  if (input.data.byRole !== "drafter") {
    return c.json({ error: "FORBIDDEN_ROLE" }, 403);
  }

  item.status = "chair_review";
  item.rejection = undefined;
  item.workflow = { ...(item.workflow ?? {}), chairRequestedAt: isoNow() };
  logAction(item, { byRole: input.data.byRole, type: "request_chair", note: input.data.note });
  pushNotification({
    toRole: "chair",
    message: `지급결의서 검토 요청: ${item.eventName}`,
    expenseRequestId: item.id,
  });

  ExpenseRequestSchema.parse(item);
  return c.json(item);
});

app.post("/expense-requests/:id/request-pastor", async (c) => {
  const id = c.req.param("id");
  const item = requireExpenseRequest(id);
  if (!item) return c.json({ error: "NOT_FOUND" }, 404);

  const body = await c.req.json().catch(() => null);
  const input = ExpenseRequestActionInputSchema.safeParse(body);
  if (!input.success) {
    return c.json({ error: "INVALID_INPUT", issues: input.error.issues }, 400);
  }
  if (item.status !== "chair_review") {
    return c.json({ error: "INVALID_STATE", status: item.status }, 409);
  }
  if (input.data.byRole !== "chair") {
    return c.json({ error: "FORBIDDEN_ROLE" }, 403);
  }

  item.status = "pastor_review";
  item.workflow = { ...(item.workflow ?? {}), pastorRequestedAt: isoNow() };
  logAction(item, { byRole: input.data.byRole, type: "request_pastor", note: input.data.note });
  pushNotification({
    toRole: "pastor",
    message: `지급결의서 승인 요청: ${item.eventName}`,
    expenseRequestId: item.id,
  });

  ExpenseRequestSchema.parse(item);
  return c.json(item);
});

app.post("/expense-requests/:id/approve-pastor", async (c) => {
  const id = c.req.param("id");
  const item = requireExpenseRequest(id);
  if (!item) return c.json({ error: "NOT_FOUND" }, 404);

  const body = await c.req.json().catch(() => null);
  const input = ExpenseRequestActionInputSchema.safeParse(body);
  if (!input.success) {
    return c.json({ error: "INVALID_INPUT", issues: input.error.issues }, 400);
  }
  if (item.status !== "pastor_review") {
    return c.json({ error: "INVALID_STATE", status: item.status }, 409);
  }
  if (input.data.byRole !== "pastor") {
    return c.json({ error: "FORBIDDEN_ROLE" }, 403);
  }

  item.status = "finance_chair_review";
  item.workflow = { ...(item.workflow ?? {}), pastorApprovedAt: isoNow() };
  logAction(item, { byRole: input.data.byRole, type: "approve_pastor", note: input.data.note });
  pushNotification({
    toRole: "financeChair",
    message: `지급결의서 승인 요청(재정위원장): ${item.eventName}`,
    expenseRequestId: item.id,
  });

  ExpenseRequestSchema.parse(item);
  return c.json(item);
});

app.post("/expense-requests/:id/approve-finance-chair", async (c) => {
  const id = c.req.param("id");
  const item = requireExpenseRequest(id);
  if (!item) return c.json({ error: "NOT_FOUND" }, 404);

  const body = await c.req.json().catch(() => null);
  const input = ExpenseRequestActionInputSchema.safeParse(body);
  if (!input.success) {
    return c.json({ error: "INVALID_INPUT", issues: input.error.issues }, 400);
  }
  if (item.status !== "finance_chair_review") {
    return c.json({ error: "INVALID_STATE", status: item.status }, 409);
  }
  if (input.data.byRole !== "financeChair") {
    return c.json({ error: "FORBIDDEN_ROLE" }, 403);
  }

  item.status = "budget_approved";
  item.workflow = { ...(item.workflow ?? {}), financeChairApprovedAt: isoNow() };
  logAction(item, { byRole: input.data.byRole, type: "approve_finance_chair", note: input.data.note });
  pushNotification({
    toRole: "financeStaff",
    message: `예산 승인 완료(집행 가능): ${item.eventName}`,
    expenseRequestId: item.id,
  });

  ExpenseRequestSchema.parse(item);
  return c.json(item);
});

app.post("/expense-requests/:id/request-payment", async (c) => {
  const id = c.req.param("id");
  const item = requireExpenseRequest(id);
  if (!item) return c.json({ error: "NOT_FOUND" }, 404);

  const body = await c.req.json().catch(() => null);
  const input = RequestPaymentInputSchema.safeParse(body);
  if (!input.success) {
    return c.json({ error: "INVALID_INPUT", issues: input.error.issues }, 400);
  }
  if (item.status !== "budget_approved") {
    return c.json({ error: "INVALID_STATE", status: item.status }, 409);
  }
  if (input.data.byRole !== "drafter") {
    return c.json({ error: "FORBIDDEN_ROLE" }, 403);
  }

  const now = isoNow();
  item.status = "payment_requested";
  item.actualTotal = input.data.actualTotal;
  item.receipts = [
    ...(item.receipts ?? []),
    ...input.data.receipts.map((r) => ({
      id: crypto.randomUUID(),
      label: r.label,
      url: r.url,
      uploadedAt: now,
      uploadedByRole: input.data.byRole,
    })),
  ];
  item.workflow = { ...(item.workflow ?? {}), paymentRequestedAt: now };
  logAction(item, { byRole: input.data.byRole, type: "request_payment", note: input.data.note });
  pushNotification({
    toRole: "financeStaff",
    message: `지급 요청(영수증 첨부): ${item.eventName}`,
    expenseRequestId: item.id,
  });

  ExpenseRequestSchema.parse(item);
  return c.json(item);
});

app.post("/expense-requests/:id/mark-paid", async (c) => {
  const id = c.req.param("id");
  const item = requireExpenseRequest(id);
  if (!item) return c.json({ error: "NOT_FOUND" }, 404);

  const body = await c.req.json().catch(() => null);
  const input = MarkPaidInputSchema.safeParse(body);
  if (!input.success) {
    return c.json({ error: "INVALID_INPUT", issues: input.error.issues }, 400);
  }
  if (item.status !== "payment_requested") {
    return c.json({ error: "INVALID_STATE", status: item.status }, 409);
  }
  if (input.data.byRole !== "financeStaff") {
    return c.json({ error: "FORBIDDEN_ROLE" }, 403);
  }

  item.status = "paid";
  item.workflow = { ...(item.workflow ?? {}), paidAt: isoNow() };
  // paidAmount는 우선 로그/노트로 남김(추후 결제정보 필드로 확장 가능)
  logAction(item, { byRole: input.data.byRole, type: "mark_paid", note: input.data.note });
  pushNotification({
    toRole: "drafter",
    message: `결제 완료 처리됨: ${item.eventName} (${input.data.paidAmount.currency} ${input.data.paidAmount.amount.toLocaleString()})`,
    expenseRequestId: item.id,
  });

  ExpenseRequestSchema.parse(item);
  return c.json(item);
});

app.post("/expense-requests/:id/reject", async (c) => {
  const id = c.req.param("id");
  const item = requireExpenseRequest(id);
  if (!item) return c.json({ error: "NOT_FOUND" }, 404);

  const body = await c.req.json().catch(() => null);
  const input = RejectInputSchema.safeParse(body);
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

  item.status = "rejected";
  item.rejection = {
    reason: input.data.reason,
    rejectedAt: isoNow(),
    rejectedByRole: input.data.byRole,
  };
  logAction(item, { byRole: input.data.byRole, type: "reject", note: input.data.reason });
  pushNotification({
    toRole: "drafter",
    message: `반려됨: ${item.eventName} (${input.data.reason})`,
    expenseRequestId: item.id,
  });

  ExpenseRequestSchema.parse(item);
  return c.json(item);
});

app.get("/notifications", (c) => {
  const role = ActorRoleSchema.safeParse(c.req.query("role"));
  if (!role.success) {
    return c.json({ error: "INVALID_ROLE" }, 400);
  }
  const items = Array.from(notificationStore.values())
    .filter((n) => n.toRole === role.data)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return c.json({ items });
});

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
});

const env = EnvSchema.parse(process.env);

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${info.port}`);
  },
);

