"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { LoginInputSchema } from "@payment/shared";
import { clearSessionToken, setSessionToken } from "@/lib/session";

function getApiBaseUrl() {
  return process.env.API_BASE_URL ?? "http://localhost:3001";
}

export async function login(formData: FormData) {
  const input = LoginInputSchema.parse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) throw new Error("LOGIN_FAILED");
  const json = (await res.json()) as { token: string };

  await setSessionToken(z.string().min(1).parse(json.token));
  redirect("/");
}

export async function logout() {
  await clearSessionToken();
  redirect("/login");
}

