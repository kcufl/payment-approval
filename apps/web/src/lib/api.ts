import { z } from "zod";
import { PaymentResolutionSchema } from "@payment/shared";

const ListResponseSchema = z.object({
  items: z.array(PaymentResolutionSchema),
});

export type PaymentResolutionListResponse = z.infer<typeof ListResponseSchema>;

function getApiBaseUrl() {
  return process.env.API_BASE_URL ?? "http://localhost:3001";
}

export async function listPaymentResolutions(): Promise<PaymentResolutionListResponse> {
  const res = await fetch(`${getApiBaseUrl()}/payment-resolutions`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return ListResponseSchema.parse(json);
}

