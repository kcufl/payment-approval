import { createExpenseRequest } from "./actions";
import { listExpenseRequests } from "../lib/api";
import type { ExpenseRequest } from "@payment/shared";

export default async function Home() {
  const { items } = await listExpenseRequests();

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
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{it.eventName}</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      요청: {it.supportRequestedAmount.currency}{" "}
                      {it.supportRequestedAmount.amount.toLocaleString()}
                    </p>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {it.departmentAndRequester} · {it.usagePeriod}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    상태: {it.status} · 지출합계: {it.expenseTotal.amount.toLocaleString()} · 수입합계:{" "}
                    {it.incomeTotal.amount.toLocaleString()} · 생성:{" "}
                    {new Date(it.createdAt).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
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
