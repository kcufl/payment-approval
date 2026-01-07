"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CreatePaymentResolutionInputSchema } from "@payment/shared";

function getApiBaseUrl() {
  return process.env.API_BASE_URL ?? "http://localhost:3001";
}

const FormSchema = z.object({
  title: z.string(),
  purpose: z.string(),
  amount: z.coerce.number().int().nonnegative(),
  currency: z.string().default("KRW"),
});

export async function createPaymentResolution(formData: FormData) {
  const raw = {
    title: formData.get("title"),
    purpose: formData.get("purpose"),
    amount: formData.get("amount"),
    currency: formData.get("currency") ?? "KRW",
  };

const parsed = FormSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("INVALID_FORM");
  }

  const input = CreatePaymentResolutionInputSchema.parse({
    title: parsed.data.title,
    purpose: parsed.data.purpose,
    amount: { currency: parsed.data.currency, amount: parsed.data.amount },
  });

  const res = await fetch(`${getApiBaseUrl()}/payment-resolutions`, {
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

