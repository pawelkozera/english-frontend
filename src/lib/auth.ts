import { useSyncExternalStore } from "react";

let accessToken: string | null = sessionStorage.getItem("accessToken");
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) sessionStorage.setItem("accessToken", token);
  else sessionStorage.removeItem("accessToken");
  emit();
}

export function subscribeAuth(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAccessToken() {
  return useSyncExternalStore(subscribeAuth, getAccessToken, getAccessToken);
}