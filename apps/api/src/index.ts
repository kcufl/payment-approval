import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import {
  CreatePaymentResolutionInputSchema,
  PaymentResolutionSchema,
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

