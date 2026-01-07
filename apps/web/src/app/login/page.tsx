import Link from "next/link";
import { login } from "./actions";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-16">
        <header className="grid gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">로그인</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            지급결의서 시스템에 로그인하세요.
          </p>
        </header>

        <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-zinc-950">
          <form action={login} className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="email">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="h-10 rounded-lg border border-black/15 bg-transparent px-3 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-white/15"
                placeholder="admin@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="password">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="h-10 rounded-lg border border-black/15 bg-transparent px-3 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-white/15"
                placeholder="••••••••"
                required
              />
            </div>
            <button className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
              로그인
            </button>
          </form>
        </section>

        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          관리자 계정은 API가 최초 실행 시 자동 생성됩니다.{" "}
          <Link className="underline" href="/">
            홈으로
          </Link>
        </p>
      </main>
    </div>
  );
}

