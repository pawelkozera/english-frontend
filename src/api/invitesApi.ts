import { api } from "../lib/http";
import type {
  AcceptInviteResponse,
  InviteCreatedResponse,
  InvitePreviewResponse,
  InviteSummaryResponse,
  GroupRole,
} from "./types";

export type CreateInviteRequest = {
  roleGranted?: GroupRole | null; // default handled by backend
  maxUses?: number | null;        // 1 = one-time, >1 = multi-use, null = unlimited
  expiresInMinutes?: number | null;
};

// Teacher-only: create invite (returns plaintext token once).
export async function createInvite(groupId: number, req: CreateInviteRequest) {
  return api<InviteCreatedResponse>(`/api/groups/${groupId}/invites`, {
    method: "POST",
    auth: true,
    body: req,
  });
}

// Teacher-only: list invites (no plaintext tokens).
export async function listInvites(groupId: number) {
  return api<InviteSummaryResponse[]>(`/api/groups/${groupId}/invites`, { method: "GET", auth: true });
}

// Teacher-only: revoke invite.
export async function revokeInvite(groupId: number, inviteId: number) {
  return api<void>(`/api/groups/${groupId}/invites/${inviteId}/revoke`, { method: "POST", auth: true });
}

// Teacher-only: revoke old + create new invite (returns new plaintext token).
export async function recreateInvite(groupId: number, inviteId: number) {
  return api<InviteCreatedResponse>(`/api/groups/${groupId}/invites/${inviteId}/recreate`, {
    method: "POST",
    auth: true,
  });
}

// Public: validate token and show what user is about to join.
export async function previewInvite(token: string) {
  return api<InvitePreviewResponse>("/api/invites/preview", {
    method: "POST",
    auth: false,
    body: { token },
  });
}

// Authenticated: accept invite and join group.
export async function acceptInvite(token: string) {
  return api<AcceptInviteResponse>("/api/invites/accept", {
    method: "POST",
    auth: true,
    body: { token },
  });
}