import { api } from "../lib/http";
import type { MemberResponse } from "./types";

// Teacher-only: list group members.
export async function listMembers(groupId: number) {
  return api<MemberResponse[]>(`/api/groups/${groupId}/members`, { method: "GET", auth: true });
}

// Policy: teacher can remove students; only owner can remove other teachers.
export async function removeMember(groupId: number, userId: number) {
  return api<void>(`/api/groups/${groupId}/members/remove/${userId}`, { method: "DELETE", auth: true });
}

// Self leave (owner cannot leave in current backend rules).
export async function leaveGroup(groupId: number) {
  return api<void>(`/api/groups/${groupId}/members/leave`, { method: "POST", auth: true });
}