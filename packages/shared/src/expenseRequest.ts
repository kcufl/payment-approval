import { z } from "zod";
import { MoneySchema, type Money } from "./paymentResolution";

export const ExpenseRequestStatusSchema = z.enum([
  "draft",
  "submitted",
  "approved",
  "rejected",
]);

export type ExpenseRequestStatus = z.infer<typeof ExpenseRequestStatusSchema>;

export const ExpenseRequestApprovalSchema = z.object({
  manager: z.string().trim().max(100).optional(),
  committeeChair: z.string().trim().max(100).optional(),
  pastor: z.string().trim().max(100).optional(),
});

export type ExpenseRequestApproval = z.infer<typeof ExpenseRequestApprovalSchema>;

export const ExpenseRequestLineItemSchema = z.object({
  category: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
  amount: MoneySchema,
  note: z.string().trim().max(2000).optional(),
});

export type ExpenseRequestLineItem = z.infer<typeof ExpenseRequestLineItemSchema>;

export const ExpenseRequestSchema = z.object({
  id: z.string().uuid(),

  // 1. 부서명 및 기안자
  departmentAndRequester: z.string().trim().min(1).max(200),
  // 2. 사용기간 (일단 문자열로 수용: 예) 2026-01-01 ~ 2026-01-31
  usagePeriod: z.string().trim().min(1).max(200),
  // 3. 행사명
  eventName: z.string().trim().min(1).max(200),

  approvals: ExpenseRequestApprovalSchema.optional(),

  expenseItems: z.array(ExpenseRequestLineItemSchema),
  incomeItems: z.array(ExpenseRequestLineItemSchema),

  expenseTotal: MoneySchema,
  incomeTotal: MoneySchema,
  supportRequestedAmount: MoneySchema,

  status: ExpenseRequestStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ExpenseRequest = z.infer<typeof ExpenseRequestSchema>;

export const CreateExpenseRequestInputSchema = z.object({
  departmentAndRequester: z.string().trim().min(1).max(200),
  usagePeriod: z.string().trim().min(1).max(200),
  eventName: z.string().trim().min(1).max(200),
  approvals: ExpenseRequestApprovalSchema.optional(),
  expenseItems: z.array(ExpenseRequestLineItemSchema).default([]),
  incomeItems: z.array(ExpenseRequestLineItemSchema).default([]),
  // 입력이 있으면 받아두되, 서버에서 기본값(지출-수입) 계산 가능
  supportRequestedAmount: MoneySchema.optional(),
});

export type CreateExpenseRequestInput = z.infer<
  typeof CreateExpenseRequestInputSchema
>;

