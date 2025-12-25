import { getAccessToken, refreshAccessToken, setAccessToken } from "./auth";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type ApiOptions = {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean;
};

async function parseJsonOrVoid<T>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return undefined as T;
  return (await res.json()) as T;
}

async function throwHttpError(res: Response): Promise<never> {
  const txt = await res.text();
  throw new Error(`HTTP ${res.status}: ${txt}`);
}

export async function api<TResponse>(path: string, options?: ApiOptions): Promise<TResponse> {
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

  // Try refresh once for protected endpoints.
  if (res.status === 401 && auth) {
    const newToken = await refreshAccessToken();
    if (!newToken) throw new Error("Unauthorized");

    const retryRes = await fetch(path, {
      method,
      headers: { ...headers, Authorization: `Bearer ${newToken}` },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      credentials: "include",
    });

    if (!retryRes.ok) {
      if (retryRes.status === 401) setAccessToken(null);
      await throwHttpError(retryRes);
    }

    return await parseJsonOrVoid<TResponse>(retryRes);
  }

  if (!res.ok) {
    await throwHttpError(res);
  }

  return await parseJsonOrVoid<TResponse>(res);
}
