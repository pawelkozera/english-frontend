import { api } from "./api";
import { setAccessToken } from "./auth";

export type AuthResponse = { accessToken: string };

export async function register(email: string, password: string) {
  const data = await api<{ accessToken: string }>("/api/auth/register", {
    method: "POST",
    auth: false,
    body: { email, password },
  });
  setAccessToken(data.accessToken);
  return data;
}

export async function login(email: string, password: string) {
  const data = await api<{ accessToken: string }>("/api/auth/login", {
    method: "POST",
    auth: false,
    body: { email, password },
  });
  setAccessToken(data.accessToken);
  return data;
}

export async function logout() {
  await api<void>("/api/auth/logout", { method: "POST", auth: false });
  setAccessToken(null);
}

export type GroupResponse = {
  id: number;
  name: string;
  myRole: "STUDENT" | "TEACHER";
  createdAt: string;
};

export async function myGroups() {
  return api<GroupResponse[]>("/api/groups/me", { method: "GET", auth: true });
}

export async function createGroup(name: string) {
  return api<GroupResponse>("/api/groups", { method: "POST", auth: true, body: { name } });
}

export type InvitePreviewResponse = {
  valid: boolean;
  groupName: string;
  roleGranted: "STUDENT" | "TEACHER";
  expiresAt: string;
  maxUses: number | null;
  usedCount: number;
  exhausted: boolean;
  revoked: boolean;
  expired: boolean;
  alreadyMember: boolean;
};

export async function invitePreview(token: string) {
  return api<InvitePreviewResponse>("/api/invites/preview", {
    method: "POST",
    auth: false,
    body: { token },
  });
}

export async function acceptInvite(token: string) {
  return api<{ groupId: number; groupName: string; myRole: "STUDENT" | "TEACHER" }>(
    "/api/invites/accept",
    { method: "POST", auth: true, body: { token } }
  );
}