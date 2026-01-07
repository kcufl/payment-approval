import { z } from "zod";
import { ExpenseRequestSchema } from "@payment/shared";

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

