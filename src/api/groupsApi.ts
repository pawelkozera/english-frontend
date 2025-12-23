import { api } from "../lib/http";
import type {
  GroupCreatedResponse,
  GroupDetailsResponse,
  GroupListItem,
  JoinCodeResponse,
} from "./types";

export type CreateGroupRequest = { name: string };
export type JoinGroupRequest = { code: string };

export async function createGroup(req: CreateGroupRequest) {
  return api<GroupCreatedResponse>("/api/groups", { method: "POST", auth: true, body: req });
}

export async function joinGroup(req: JoinGroupRequest) {
  // Backend returns more fields (e.g. joinCode=null), but frontend list model doesn't need it.
  return api<GroupListItem>("/api/groups/join", { method: "POST", auth: true, body: req });
}

export async function myGroups() {
  return api<GroupListItem[]>("/api/groups/me", { method: "GET", auth: true });
}

export async function groupDetails(groupId: number) {
  return api<GroupDetailsResponse>(`/api/groups/${groupId}`, { method: "GET", auth: true });
}

// Teacher-only: rotates the group join code.
export async function resetJoinCode(groupId: number) {
  return api<JoinCodeResponse>(`/api/groups/${groupId}/join-code/reset`, { method: "POST", auth: true });
}