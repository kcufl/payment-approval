import {
  approveFinanceChair,
  approvePastor,
  createExpenseRequest,
  markPaid,
  rejectExpenseRequest,
  requestChair,
  requestPastor,
  requestPayment,
} from "./actions";
import { listExpenseRequests, listNotifications } from "../lib/api";
import type { ActorRole, ExpenseRequest } from "@payment/shared";

const ROLES: { value: ActorRole; label: string }[] = [
  { value: "drafter", label: "기안자(부장/담당)" },
  { value: "chair", label: "위원장" },
  { value: "pastor", label: "담임목사" },
  { value: "financeChair", label: "재정위원장" },
  { value: "financeStaff", label: "재정부 담당" },
];

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const roleParam = Array.isArray(sp.role) ? sp.role[0] : sp.role;
  const role: ActorRole =
    roleParam && ROLES.some((r) => r.value === roleParam)
      ? (roleParam as ActorRole)
      : "drafter";

  const { items } = await listExpenseRequests();
  const { items: notifications } = await listNotifications(role);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            지출 요청서 (웹)
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            웹/앱 동일 기능을 위해 공유 스키마(@payment/shared)로 검증합니다.
          </p>
        </header>

        <section className="grid gap-3 rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-zinc-950">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">데모: 현재 역할</h2>
            <form method="get" className="flex items-center gap-2">
              <select
                name="role"
                defaultValue={role}
                className="h-10 rounded-lg border border-black/15 bg-transparent px-3 text-sm outline-none dark:border-white/15"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <button className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                적용
              </button>
            </form>
          </div>
          <div className="grid gap-2">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              알림({notifications.length})
            </p>
            <ul className="grid gap-2">
              {notifications.slice(0, 5).map((n) => (
                <li
                  key={n.id}
                  className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
                >
                  <p className="font-medium">{n.message}</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {new Date(n.createdAt).toLocaleString()} · 건ID:{" "}
                    {n.expenseRequestId}
                  </p>
                </li>
              ))}
              {notifications.length === 0 ? (
                <li className="text-sm text-zinc-600 dark:text-zinc-400">
                  현재 역할로 받은 알림이 없습니다.
                </li>
              ) : null}
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold">지출 요청서 작성</h2>
          <form action={createExpenseRequest} className="mt-4 grid gap-6">
            <div className="grid gap-3 rounded-xl border border-black/10 p-4 dark:border-white/15">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="grid gap-2 sm:col-span-2">
                  <label className="text-sm font-medium" htmlFor="departmentAndRequester">
                    1. 부서명 및 기안자
                  </label>
                  <input
                    id="departmentAndRequester"
                    name="departmentAndRequester"
                    className="h-10 rounded-lg border border-black/15 bg-transparent px-3 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-white/15"
                    placeholder="예) 청년부 / 홍길동"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="currency">
                    통화
                  </label>
                  <input
                    id="currency"
                    name="currency"
                    defaultValue="KRW"
                    className="h-10 rounded-lg border border-black/15 bg-transparent px-3 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-white/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="usagePeriod">
                    2. 사용기간
                  </label>
                  <input
                    id="usagePeriod"
                    name="usagePeriod"
                    className="h-10 rounded-lg border border-black/15 bg-transparent px-3 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-white/15"
                    placeholder="예) 2026-01-01 ~ 2026-01-31"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="eventName">
                    3. 행사명
                  </label>
                  <input
                    id="eventName"
                    name="eventName"
                    className="h-10 rounded-lg border border-black/15 bg-transparent px-3 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-white/15"
                    placeholder="예) 청년부 수련회"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-black/10 text-sm dark:border-white/15">
                <div className="bg-zinc-50 px-3 py-2 font-medium dark:bg-zinc-900">
                  부장(담당)
                </div>
                <div className="bg-zinc-50 px-3 py-2 font-medium dark:bg-zinc-900">
                  위원장
                </div>
                <div className="bg-zinc-50 px-3 py-2 font-medium dark:bg-zinc-900">
                  담임목사
                </div>
                <div className="px-3 py-2">
                  <input
                    name="manager"
                    className="h-9 w-full rounded-md border border-black/15 bg-transparent px-2 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-white/15"
                    placeholder="이름"
                  />
                </div>
                <div className="px-3 py-2">
                  <input
                    name="committeeChair"
                    className="h-9 w-full rounded-md border border-black/15 bg-transparent px-2 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-white/15"
                    placeholder="이름"
                  />
                </div>
                <div className="px-3 py-2">
                  <input
                    name="pastor"
                    className="h-9 w-full rounded-md border border-black/15 bg-transparent px-2 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-white/15"
                    placeholder="이름"
                  />
                </div>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                서명/결재선은 추후 전자결재(상태: 제출/승인/반려)로 확장합니다.
              </p>
            </div>

            <div className="grid gap-6">
              <div className="grid gap-3">
                <h3 className="text-sm font-semibold">지출예상</h3>
                <Table rows={6} prefix="expense" />
              </div>
              <div className="grid gap-3">
                <h3 className="text-sm font-semibold">수입예상</h3>
                <Table rows={4} prefix="income" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                * 재정 지원 요청금액은 서버에서 기본값(지출-수입)으로 계산됩니다.
              </p>
              <button className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                저장
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-zinc-950">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">목록</h2>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {items.length}건
            </span>
          </div>

          <ul className="mt-4 grid gap-3">
            {items.map((it: ExpenseRequest) => (
              <li
                key={it.id}
                className="rounded-xl border border-black/10 p-4 dark:border-white/15"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid gap-1">
                      <p className="font-medium">{it.eventName}</p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {it.departmentAndRequester} · {it.usagePeriod}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-500">
                        상태: <span className="font-medium">{it.status}</span> · 생성:{" "}
                        {new Date(it.createdAt).toLocaleString()}
                        {it.rejection ? ` · 반려사유: ${it.rejection.reason}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        예상 요청: {it.supportRequestedAmount.currency}{" "}
                        {it.supportRequestedAmount.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-500">
                        지출합계 {it.expenseTotal.amount.toLocaleString()} · 수입합계{" "}
                        {it.incomeTotal.amount.toLocaleString()}
                      </p>
                      {it.actualTotal ? (
                        <p className="text-xs text-zinc-500 dark:text-zinc-500">
                          실사용 {it.actualTotal.amount.toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <ActionButtons role={role} it={it} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

function ActionButtons({ role, it }: { role: ActorRole; it: ExpenseRequest }) {
  const commonHidden = (
    <>
      <input type="hidden" name="id" value={it.id} />
      <input type="hidden" name="byRole" value={role} />
      <input
        type="hidden"
        name="currency"
        value={it.supportRequestedAmount.currency}
      />
    </>
  );

  const canReject =
    (role === "chair" && it.status === "chair_review") ||
    (role === "pastor" && it.status === "pastor_review") ||
    (role === "financeChair" && it.status === "finance_chair_review") ||
    (role === "financeStaff" && it.status === "payment_requested");

  return (
    <>
      {role === "drafter" && (it.status === "draft" || it.status === "rejected") ? (
        <form action={requestChair}>
          {commonHidden}
          <PrimaryActionButton label="위원장 요청" />
        </form>
      ) : null}

      {role === "chair" && it.status === "chair_review" ? (
        <form action={requestPastor}>
          {commonHidden}
          <PrimaryActionButton label="담임목사 요청" />
        </form>
      ) : null}

      {role === "pastor" && it.status === "pastor_review" ? (
        <form action={approvePastor}>
          {commonHidden}
          <PrimaryActionButton label="담임목사 승인" />
        </form>
      ) : null}

      {role === "financeChair" && it.status === "finance_chair_review" ? (
        <form action={approveFinanceChair}>
          {commonHidden}
          <PrimaryActionButton label="재정위원장 승인" />
        </form>
      ) : null}

      {role === "drafter" && it.status === "budget_approved" ? (
        <form action={requestPayment} className="flex flex-wrap items-center gap-2">
          {commonHidden}
          <input
            name="actualAmount"
            type="number"
            min={0}
            step={1}
            className="h-9 w-36 rounded-lg border border-black/15 bg-transparent px-2 text-right text-sm outline-none dark:border-white/15"
            placeholder="실사용금액"
            required
          />
          <input
            name="receiptLabel"
            className="h-9 w-40 rounded-lg border border-black/15 bg-transparent px-2 text-sm outline-none dark:border-white/15"
            placeholder="영수증 라벨"
          />
          <input
            name="receiptUrl"
            className="h-9 w-64 rounded-lg border border-black/15 bg-transparent px-2 text-sm outline-none dark:border-white/15"
            placeholder="영수증 URL(임시)"
          />
          <PrimaryActionButton label="영수증 첨부 + 지급요청" />
        </form>
      ) : null}

      {role === "financeStaff" && it.status === "payment_requested" ? (
        <form action={markPaid} className="flex flex-wrap items-center gap-2">
          {commonHidden}
          <input
            name="paidAmount"
            type="number"
            min={0}
            step={1}
            className="h-9 w-36 rounded-lg border border-black/15 bg-transparent px-2 text-right text-sm outline-none dark:border-white/15"
            placeholder="결제금액"
            required
          />
          <PrimaryActionButton label="결제 완료처리" />
        </form>
      ) : null}

      {canReject ? (
        <form action={rejectExpenseRequest} className="flex flex-wrap items-center gap-2">
          {commonHidden}
          <input
            name="reason"
            className="h-9 w-64 rounded-lg border border-black/15 bg-transparent px-2 text-sm outline-none dark:border-white/15"
            placeholder="반려 사유"
            required
          />
          <DangerActionButton label="반려" />
        </form>
      ) : null}
    </>
  );
}

function PrimaryActionButton({ label }: { label: string }) {
  return (
    <button className="h-9 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
      {label}
    </button>
  );
}

function DangerActionButton({ label }: { label: string }) {
  return (
    <button className="h-9 rounded-lg border border-red-500/40 bg-red-50 px-3 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50">
      {label}
    </button>
  );
}

function Table({ rows, prefix }: { rows: number; prefix: "expense" | "income" }) {
  return (
    <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/15">
      <div className="grid grid-cols-[140px_1fr_160px_1fr] bg-zinc-50 text-sm font-medium dark:bg-zinc-900">
        <div className="px-3 py-2">구분</div>
        <div className="px-3 py-2">내역</div>
        <div className="px-3 py-2">금액</div>
        <div className="px-3 py-2">비고</div>
      </div>
      <div className="divide-y divide-black/10 dark:divide-white/10">
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="grid grid-cols-[140px_1fr_160px_1fr] items-center text-sm"
          >
            <div className="px-3 py-2">
              <input
                name={`${prefix}Category`}
                className="h-9 w-full rounded-md border border-black/15 bg-transparent px-2 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-white/15"
                placeholder={prefix === "expense" ? "지출예상" : "수입예상"}
              />
            </div>
            <div className="px-3 py-2">
              <input
                name={`${prefix}Description`}
                className="h-9 w-full rounded-md border border-black/15 bg-transparent px-2 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-white/15"
                placeholder="예) 강사비"
              />
            </div>
            <div className="px-3 py-2">
              <input
                name={`${prefix}Amount`}
                type="number"
                min={0}
                step={1}
                className="h-9 w-full rounded-md border border-black/15 bg-transparent px-2 text-right outline-none focus:ring-2 focus:ring-zinc-400 dark:border-white/15"
                placeholder="0"
              />
            </div>
            <div className="px-3 py-2">
              <input
                name={`${prefix}Note`}
                className="h-9 w-full rounded-md border border-black/15 bg-transparent px-2 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-white/15"
                placeholder="비고"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
