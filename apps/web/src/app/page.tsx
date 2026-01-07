import { createPaymentResolution } from "./actions";
import { listPaymentResolutions } from "../lib/api";
import type { PaymentResolution } from "@payment/shared";

export default async function Home() {
  const { items } = await listPaymentResolutions();

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            지급결의서 (웹)
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            웹/앱 동일 기능을 위해 공유 스키마(@payment/shared)로 검증합니다.
          </p>
        </header>

        <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold">새 지급결의서</h2>
          <form action={createPaymentResolution} className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="title">
                제목
              </label>
              <input
                id="title"
                name="title"
                className="h-10 rounded-lg border border-black/15 bg-transparent px-3 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-white/15"
                placeholder="예) 12월 사무용품 구매"
                required
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="purpose">
                사용 목적
              </label>
              <textarea
                id="purpose"
                name="purpose"
                className="min-h-24 rounded-lg border border-black/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-white/15"
                placeholder="구매 사유/사용 목적을 입력하세요."
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="grid gap-2 sm:col-span-2">
                <label className="text-sm font-medium" htmlFor="amount">
                  금액
                </label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  min={0}
                  step={1}
                  className="h-10 rounded-lg border border-black/15 bg-transparent px-3 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-white/15"
                  placeholder="150000"
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

            <div>
              <button className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                생성
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
            {items.map((it: PaymentResolution) => (
              <li
                key={it.id}
                className="rounded-xl border border-black/10 p-4 dark:border-white/15"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{it.title}</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {it.amount.currency} {it.amount.amount.toLocaleString()}
                    </p>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {it.purpose}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    상태: {it.status} · 생성: {new Date(it.createdAt).toLocaleString()}
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
