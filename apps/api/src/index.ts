import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import {
  CreateExpenseRequestInputSchema,
  CreatePaymentResolutionInputSchema,
  ExpenseRequestSchema,
  PaymentResolutionSchema,
  type ExpenseRequest,
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
    createdAt: now,
    updatedAt: now,
  };

  ExpenseRequestSchema.parse(created);

  expenseRequestStore.set(id, created);
  return c.json(created, 201);
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

