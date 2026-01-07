import { z } from "zod";
import { MoneySchema, type Money } from "./paymentResolution";

export const ActorRoleSchema = z.enum([
  "drafter", // 기안자(부장/담당)
  "chair", // 위원장
  "pastor", // 담임목사
  "financeChair", // 재정위원장
  "financeStaff", // 재정부 담당(실제 결제)
]);

export type ActorRole = z.infer<typeof ActorRoleSchema>;

export const ExpenseRequestStatusSchema = z.enum([
  "draft",
  "chair_review",
  "pastor_review",
  "finance_chair_review",
  "budget_approved",
  "payment_requested",
  "paid",
  "rejected",
]);

export type ExpenseRequestStatus = z.infer<typeof ExpenseRequestStatusSchema>;

export const ExpenseRequestApprovalSchema = z.object({
  manager: z.string().trim().max(100).optional(),
  committeeChair: z.string().trim().max(100).optional(),
  pastor: z.string().trim().max(100).optional(),
});

export type ExpenseRequestApproval = z.infer<typeof ExpenseRequestApprovalSchema>;

export const ExpenseRequestReceiptSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(1).max(200),
  url: z.string().url(),
  uploadedAt: z.string().datetime(),
  uploadedByRole: ActorRoleSchema,
});

export type ExpenseRequestReceipt = z.infer<typeof ExpenseRequestReceiptSchema>;

export const ExpenseRequestWorkflowSchema = z.object({
  chairRequestedAt: z.string().datetime().optional(),
  pastorRequestedAt: z.string().datetime().optional(),
  pastorApprovedAt: z.string().datetime().optional(),
  financeChairApprovedAt: z.string().datetime().optional(),
  paymentRequestedAt: z.string().datetime().optional(),
  paidAt: z.string().datetime().optional(),
});

export type ExpenseRequestWorkflow = z.infer<typeof ExpenseRequestWorkflowSchema>;

export const ExpenseRequestRejectionSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
  rejectedAt: z.string().datetime(),
  rejectedByRole: ActorRoleSchema,
});

export type ExpenseRequestRejection = z.infer<typeof ExpenseRequestRejectionSchema>;

export const ExpenseRequestActionLogSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    "create",
    "request_chair",
    "request_pastor",
    "approve_pastor",
    "approve_finance_chair",
    "request_payment",
    "mark_paid",
    "reject",
  ]),
  byRole: ActorRoleSchema,
  note: z.string().trim().max(2000).optional(),
  at: z.string().datetime(),
});

export type ExpenseRequestActionLog = z.infer<typeof ExpenseRequestActionLogSchema>;

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

  // 실사용(영수증 기반)
  actualTotal: MoneySchema.optional(),
  receipts: z.array(ExpenseRequestReceiptSchema).default([]),

  workflow: ExpenseRequestWorkflowSchema.default({}),
  rejection: ExpenseRequestRejectionSchema.optional(),
  actionLogs: z.array(ExpenseRequestActionLogSchema).default([]),

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

export const ExpenseRequestActionInputSchema = z.object({
  // API에서 인증된 사용자 role로 강제 주입(클라이언트에서는 생략 가능)
  byRole: ActorRoleSchema.optional(),
  note: z.string().trim().max(2000).optional(),
});

export type ExpenseRequestActionInput = z.infer<
  typeof ExpenseRequestActionInputSchema
>;

export const RequestPaymentInputSchema = ExpenseRequestActionInputSchema.extend({
  actualTotal: MoneySchema,
  receipts: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(200),
        url: z.string().url(),
      }),
    )
    .default([]),
});

export type RequestPaymentInput = z.infer<typeof RequestPaymentInputSchema>;

export const MarkPaidInputSchema = ExpenseRequestActionInputSchema.extend({
  paidAmount: MoneySchema,
});

export type MarkPaidInput = z.infer<typeof MarkPaidInputSchema>;

