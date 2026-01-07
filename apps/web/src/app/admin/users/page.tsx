import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRoleSchema } from "@payment/shared";
import { adminListUsers, getMe } from "@/lib/api";
import { getSessionToken } from "@/lib/session";
import { createUser } from "./actions";

export default async function AdminUsersPage() {
  const token = await getSessionToken();
  if (!token) redirect("/login");

  const me = await getMe(token);
  if (me.role !== "admin") redirect("/");

  const { items } = await adminListUsers(token);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="grid gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">관리자: 사용자</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {me.name} ({me.email})
            </p>
          </div>
          <Link
            className="text-sm font-medium underline text-zinc-700 dark:text-zinc-200"
            href="/"
          >
            홈으로
          </Link>
        </header>

        <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold">사용자 생성</h2>
          <form action={createUser} className="mt-4 grid gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="email">
                  이메일
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="h-10 rounded-lg border border-black/15 bg-transparent px-3 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-white/15"
                  required
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="name">
                  이름
                </label>
                <input
                  id="name"
                  name="name"
                  className="h-10 rounded-lg border border-black/15 bg-transparent px-3 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-white/15"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="role">
                  역할
                </label>
                <select
                  id="role"
                  name="role"
                  className="h-10 rounded-lg border border-black/15 bg-transparent px-3 text-sm outline-none dark:border-white/15"
                  defaultValue="drafter"
                >
                  {UserRoleSchema.options.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="password">
                  초기 비밀번호
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="h-10 rounded-lg border border-black/15 bg-transparent px-3 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-white/15"
                  minLength={8}
                  required
                />
              </div>
            </div>

            <div>
              <button className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                생성
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/15 dark:bg-zinc-950">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">사용자 목록</h2>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {items.length}명
            </span>
          </div>
          <ul className="mt-4 grid gap-2">
            {items.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
              >
                <div className="grid gap-0.5">
                  <p className="font-medium">
                    {u.name} <span className="text-zinc-500">({u.role})</span>
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {u.email} · {u.isActive ? "active" : "inactive"}
                  </p>
                </div>
                <p className="text-xs text-zinc-500">
                  생성: {new Date(u.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

