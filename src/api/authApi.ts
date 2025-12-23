import { api } from "../lib/http";
import { setAccessToken } from "../lib/auth";

export type AuthResponse = { accessToken: string };

export async function register(email: string, password: string) {
  const data = await api<AuthResponse>("/api/auth/register", {
    method: "POST",
    auth: false,
    body: { email, password },
  });
  if (!data?.accessToken) throw new Error("Missing accessToken in response");
  setAccessToken(data.accessToken);
  return data;
}

export async function login(email: string, password: string) {
  const data = await api<AuthResponse>("/api/auth/login", {
    method: "POST",
    auth: false,
    body: { email, password },
  });
  if (!data?.accessToken) throw new Error("Missing accessToken in response");
  setAccessToken(data.accessToken);
  return data;
}

export async function logout() {
  await api<void>("/api/auth/logout", { method: "POST", auth: false });
  setAccessToken(null);
}