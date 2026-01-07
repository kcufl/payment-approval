"use server";

import { CreateUserInputSchema } from "@payment/shared";
import { revalidatePath } from "next/cache";
import { getSessionToken } from "@/lib/session";

function getApiBaseUrl() {
  return process.env.API_BASE_URL ?? "http://localhost:3001";
}

export async function createUser(formData: FormData) {
  const token = await getSessionToken();
  if (!token) throw new Error("UNAUTHORIZED");

  const input = CreateUserInputSchema.parse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    password: formData.get("password"),
  });

  const res = await fetch(`${getApiBaseUrl()}/admin/users`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error: ${res.status} ${text}`);
  }

  revalidatePath("/admin/users");
}

