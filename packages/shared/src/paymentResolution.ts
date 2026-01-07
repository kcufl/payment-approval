import { z } from "zod";

export const PaymentResolutionStatusSchema = z.enum([
  "draft",
  "submitted",
  "approved",
  "rejected",
]);

export type PaymentResolutionStatus = z.infer<
  typeof PaymentResolutionStatusSchema
>;

export const MoneySchema = z.object({
  currency: z.string().min(3).max(3).default("KRW"),
  amount: z.number().int().nonnegative(),
});

export type Money = z.infer<typeof MoneySchema>;

export const PaymentResolutionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  purpose: z.string().min(1).max(2000),
  amount: MoneySchema,
  status: PaymentResolutionStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type PaymentResolution = z.infer<typeof PaymentResolutionSchema>;

export const CreatePaymentResolutionInputSchema = z.object({
  title: z.string().min(1).max(200),
  purpose: z.string().min(1).max(2000),
  amount: MoneySchema,
});

export type CreatePaymentResolutionInput = z.infer<
  typeof CreatePaymentResolutionInputSchema
>;

