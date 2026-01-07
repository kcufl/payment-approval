"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  ActorRoleSchema,
  CreateExpenseRequestInputSchema,
  MarkPaidInputSchema,
  RequestPaymentInputSchema,
} from "@payment/shared";

function getApiBaseUrl() {
  return process.env.API_BASE_URL ?? "http://localhost:3001";
}

const HeaderSchema = z.object({
  departmentAndRequester: z.string(),
  usagePeriod: z.string(),
  eventName: z.string(),
  manager: z.string().optional(),
  committeeChair: z.string().optional(),
  pastor: z.string().optional(),
  currency: z.string().default("KRW"),
});

function toStrings(values: FormDataEntryValue[]) {
  return values
    .map((v) => (typeof v === "string" ? v : ""))
    .map((v) => v.trim());
}

export async function createExpenseRequest(formData: FormData) {
  const headerRaw = {
    departmentAndRequester: formData.get("departmentAndRequester"),
    usagePeriod: formData.get("usagePeriod"),
    eventName: formData.get("eventName"),
    manager: formData.get("manager") ?? "",
    committeeChair: formData.get("committeeChair") ?? "",
    pastor: formData.get("pastor") ?? "",
    currency: formData.get("currency") ?? "KRW",
  };

  const header = HeaderSchema.parse(headerRaw);

  const expenseCategory = toStrings(formData.getAll("expenseCategory"));
  const expenseDescription = toStrings(formData.getAll("expenseDescription"));
  const expenseAmount = toStrings(formData.getAll("expenseAmount"));
  const expenseNote = toStrings(formData.getAll("expenseNote"));

  const incomeCategory = toStrings(formData.getAll("incomeCategory"));
  const incomeDescription = toStrings(formData.getAll("incomeDescription"));
  const incomeAmount = toStrings(formData.getAll("incomeAmount"));
  const incomeNote = toStrings(formData.getAll("incomeNote"));

  const lineSchema = z.object({
    category: z.string().trim().min(1),
    description: z.string().trim().min(1),
    amount: z.object({
      currency: z.string().min(3).max(3),
      amount: z.coerce.number().int().nonnegative(),
    }),
    note: z.string().trim().optional(),
  });

  const buildLines = (
    category: string[],
    description: string[],
    amount: string[],
    note: string[],
  ) => {
    const max = Math.max(category.length, description.length, amount.length, note.length);
    const lines = [];
    for (let i = 0; i < max; i++) {
      const cat = category[i] ?? "";
      const desc = description[i] ?? "";
      const amt = amount[i] ?? "";
      const nt = note[i] ?? "";
      const isEmpty = [cat, desc, amt, nt].every((v) => v === "");
      if (isEmpty) continue;

      // allow partial rows; zod will enforce required fields
      lines.push(
        lineSchema.parse({
          category: cat,
          description: desc,
          amount: { currency: header.currency, amount: amt },
          note: nt === "" ? undefined : nt,
        }),
      );
    }
    return lines;
  };

  const expenseItems = buildLines(
    expenseCategory,
    expenseDescription,
    expenseAmount,
    expenseNote,
  );
  const incomeItems = buildLines(
    incomeCategory,
    incomeDescription,
    incomeAmount,
    incomeNote,
  );

  const input = CreateExpenseRequestInputSchema.parse({
    departmentAndRequester: header.departmentAndRequester,
    usagePeriod: header.usagePeriod,
    eventName: header.eventName,
    approvals: {
      manager: header.manager?.trim() ? header.manager.trim() : undefined,
      committeeChair: header.committeeChair?.trim()
        ? header.committeeChair.trim()
        : undefined,
      pastor: header.pastor?.trim() ? header.pastor.trim() : undefined,
    },
    expenseItems,
    incomeItems,
  });

  const res = await fetch(`${getApiBaseUrl()}/expense-requests`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error: ${res.status} ${text}`);
  }

  revalidatePath("/");
}

const IdAndRoleSchema = z.object({
  id: z.string().uuid(),
  byRole: ActorRoleSchema,
  note: z.string().optional(),
});

async function postJson(path: string, body: unknown) {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error: ${res.status} ${text}`);
  }
}

export async function requestChair(formData: FormData) {
  const parsed = IdAndRoleSchema.parse({
    id: formData.get("id"),
    byRole: formData.get("byRole"),
    note: formData.get("note") ?? undefined,
  });
  await postJson(`/expense-requests/${parsed.id}/request-chair`, {
    byRole: parsed.byRole,
    note: parsed.note,
  });
  revalidatePath("/");
}

export async function requestPastor(formData: FormData) {
  const parsed = IdAndRoleSchema.parse({
    id: formData.get("id"),
    byRole: formData.get("byRole"),
    note: formData.get("note") ?? undefined,
  });
  await postJson(`/expense-requests/${parsed.id}/request-pastor`, {
    byRole: parsed.byRole,
    note: parsed.note,
  });
  revalidatePath("/");
}

export async function approvePastor(formData: FormData) {
  const parsed = IdAndRoleSchema.parse({
    id: formData.get("id"),
    byRole: formData.get("byRole"),
    note: formData.get("note") ?? undefined,
  });
  await postJson(`/expense-requests/${parsed.id}/approve-pastor`, {
    byRole: parsed.byRole,
    note: parsed.note,
  });
  revalidatePath("/");
}

export async function approveFinanceChair(formData: FormData) {
  const parsed = IdAndRoleSchema.parse({
    id: formData.get("id"),
    byRole: formData.get("byRole"),
    note: formData.get("note") ?? undefined,
  });
  await postJson(`/expense-requests/${parsed.id}/approve-finance-chair`, {
    byRole: parsed.byRole,
    note: parsed.note,
  });
  revalidatePath("/");
}

export async function requestPayment(formData: FormData) {
  const base = IdAndRoleSchema.parse({
    id: formData.get("id"),
    byRole: formData.get("byRole"),
    note: formData.get("note") ?? undefined,
  });
  const currency = String(formData.get("currency") ?? "KRW");
  const actualAmount = formData.get("actualAmount");
  const receiptLabel = String(formData.get("receiptLabel") ?? "").trim();
  const receiptUrl = String(formData.get("receiptUrl") ?? "").trim();

  const payload = RequestPaymentInputSchema.parse({
    byRole: base.byRole,
    note: base.note,
    actualTotal: { currency, amount: actualAmount },
    receipts:
      receiptLabel && receiptUrl ? [{ label: receiptLabel, url: receiptUrl }] : [],
  });

  await postJson(`/expense-requests/${base.id}/request-payment`, payload);
  revalidatePath("/");
}

export async function markPaid(formData: FormData) {
  const base = IdAndRoleSchema.parse({
    id: formData.get("id"),
    byRole: formData.get("byRole"),
    note: formData.get("note") ?? undefined,
  });
  const currency = String(formData.get("currency") ?? "KRW");
  const paidAmount = formData.get("paidAmount");

  const payload = MarkPaidInputSchema.parse({
    byRole: base.byRole,
    note: base.note,
    paidAmount: { currency, amount: paidAmount },
  });
  await postJson(`/expense-requests/${base.id}/mark-paid`, payload);
  revalidatePath("/");
}

export async function rejectExpenseRequest(formData: FormData) {
  const base = IdAndRoleSchema.parse({
    id: formData.get("id"),
    byRole: formData.get("byRole"),
    note: formData.get("note") ?? undefined,
  });
  const reason = z
    .string()
    .trim()
    .min(1)
    .parse(formData.get("reason") ?? "");

  await postJson(`/expense-requests/${base.id}/reject`, {
    byRole: base.byRole,
    note: base.note,
    reason,
  });
  revalidatePath("/");
}

