import { useSyncExternalStore } from "react";

let accessToken: string | null = sessionStorage.getItem("accessToken");
const listeners = new Set<() => void>();

let refreshPromise: Promise<string | null> | null = null;
const LOGOUT_BROADCAST_KEY = "auth:logout";
const LOGIN_BROADCAST_KEY = "auth:login";

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === LOGOUT_BROADCAST_KEY && event.newValue) {
      setAccessToken(null, { broadcast: false });
      return;
    }

    if (event.key === LOGIN_BROADCAST_KEY && event.newValue) {
      setAccessToken(event.newValue, { broadcast: false });
    }
  });
}

function emit() {
  for (const l of listeners) l();
}

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null, options?: { broadcast?: boolean }) {
  accessToken = token;
  if (token) sessionStorage.setItem("accessToken", token);
  else sessionStorage.removeItem("accessToken");
  if (options?.broadcast !== false) {
    if (token) {
      localStorage.setItem(LOGIN_BROADCAST_KEY, token);
      localStorage.removeItem(LOGIN_BROADCAST_KEY);
    } else {
      localStorage.setItem(LOGOUT_BROADCAST_KEY, String(Date.now()));
      localStorage.removeItem(LOGOUT_BROADCAST_KEY);
    }
  }
  emit();
}

export function subscribeAuth(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAccessToken() {
  return useSyncExternalStore(subscribeAuth, getAccessToken, getAccessToken);
}

export async function refreshAccessToken(): Promise<string | null> {
  if (accessToken) return accessToken;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      setAccessToken(null);
      return null;
    }

    const data = (await res.json()) as { accessToken: string };
    setAccessToken(data.accessToken);
    return data.accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}
