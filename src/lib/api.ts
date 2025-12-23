import { getAccessToken, setAccessToken } from "./auth";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function refreshAccessToken(): Promise<string | null> {
  const res = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });


  if (!res.ok) {
    setAccessToken(null);
    return null;
  }

  const data = (await res.json()) as { accessToken: string };
  setAccessToken(data.accessToken);
  return data.accessToken;
}

export async function api<TResponse>(
  path: string,
  options?: { method?: HttpMethod; body?: unknown; auth?: boolean }
): Promise<TResponse> {
  const method = options?.method ?? "GET";
  const auth = options?.auth ?? true;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getAccessToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  if ((res.status === 401 || res.status === 403) && auth) {
    const newToken = await refreshAccessToken();
    if (!newToken) throw new Error("Unauthorized");

    const retryRes = await fetch(path, {
      method,
      headers: { ...headers, Authorization: `Bearer ${newToken}` },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      credentials: "include",
    });

    if (!retryRes.ok) {
        if (retryRes.status === 401 || retryRes.status === 403) {
            setAccessToken(null);
        }
        const txt = await retryRes.text();
        throw new Error(`HTTP ${retryRes.status}: ${txt}`);
    }

    const ct = retryRes.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) return undefined as TResponse;
    return (await retryRes.json()) as TResponse;
  }

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return undefined as TResponse;
  return (await res.json()) as TResponse;
}