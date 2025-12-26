/**
 * Lesson assignments:
 * - group-wide: assignedToUserId = null
 * - per-user within a group: assignedToUserId = <userId>
 *
 * New assignments are auto-inserted on top (backend sets displayOrder = min - 1).
 * Reorder is bucket-specific via PUT /assignments/order.
 */

import { api } from "../lib/http";
import type {
  AssignLessonRequest,
  LessonAssignmentResponse,
  ReorderLessonAssignmentsRequest,
  Page,
  IsoDateTime
} from "./types";

export async function assignLessonToGroupOrUser(
  groupId: number,
  lessonId: number,
  req: AssignLessonRequest
) {
  return api<LessonAssignmentResponse>(`/api/groups/${groupId}/lessons/${lessonId}/assign`, {
    method: "POST",
    auth: true,
    body: {
      assignedToUserId: req.assignedToUserId ?? null,
      visibleFrom: req.visibleFrom ?? null,
      visibleTo: req.visibleTo ?? null,
    },
  });
}

/**
 * Teacher reorder (drag & drop) for a single bucket.
 * - userId=null/undefined => reorder group-wide bucket
 * - userId=123 => reorder per-user bucket
 */
export async function reorderGroupLessonAssignments(
  groupId: number,
  req: ReorderLessonAssignmentsRequest
) {
  return api<void>(`/api/groups/${groupId}/lessons/assignments/order`, {
    method: "PUT",
    auth: true,
    body: {
      userId: req.userId ?? null,
      assignmentIds: req.assignmentIds,
    },
  });
}

export async function listMyPersonalLessonAssignments(params?: { page?: number; size?: number }) {
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  const usp = new URLSearchParams({ page: String(page), size: String(size) });

  return api<Page<LessonAssignmentResponse>>(`/api/lessons/assignments/me/personal?${usp.toString()}`, {
    method: "GET",
    auth: true,
  });
}

export async function listMyGroupWideLessonAssignments(params?: { page?: number; size?: number }) {
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  const usp = new URLSearchParams({ page: String(page), size: String(size) });

  return api<Page<LessonAssignmentResponse>>(`/api/lessons/assignments/me/group?${usp.toString()}`, {
    method: "GET",
    auth: true,
  });
}

// Teacher view (paged), group-wide if userId omitted, personal bucket if userId passed.
export async function listGroupLessonAssignmentsPaged(params: {
  groupId: number;
  userId?: number;
  page?: number;
  size?: number;
}) {
  const page = params.page ?? 0;
  const size = params.size ?? 20;

  const usp = new URLSearchParams({ page: String(page), size: String(size) });
  if (params.userId != null) usp.set("userId", String(params.userId));

  return api<Page<LessonAssignmentResponse>>(
    `/api/groups/${params.groupId}/lessons/assignments?${usp.toString()}`,
    { method: "GET", auth: true }
  );
}

export async function unassignLesson(groupId: number, assignmentId: number) {
  return api<void>(`/api/groups/${groupId}/lessons/assignments/${assignmentId}`, {
    method: "DELETE",
    auth: true,
  });
}

export type UpdateLessonAssignmentRequest = {
  visibleFrom?: IsoDateTime | null;
  visibleTo?: IsoDateTime | null;
};

export async function updateLessonAssignment(
  groupId: number,
  assignmentId: number,
  req: UpdateLessonAssignmentRequest
) {
  return api<LessonAssignmentResponse>(`/api/groups/${groupId}/lessons/assignments/${assignmentId}`, {
    method: "PATCH",
    auth: true,
    body: {
      visibleFrom: req.visibleFrom ?? null,
      visibleTo: req.visibleTo ?? null,
    },
  });
}