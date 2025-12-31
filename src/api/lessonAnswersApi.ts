import { api } from "../lib/http";
import type { LessonTaskAnswerRequest, LessonTaskAnswerResponse } from "./types";

/** Student: GET /api/lesson-assignments/{assignmentId}/tasks/{taskId}/answer */
export async function getMyTaskAnswer(assignmentId: number, taskId: number) {
  return api<LessonTaskAnswerResponse>(`/api/lesson-assignments/${assignmentId}/tasks/${taskId}/answer`, {
    method: "GET",
    auth: true,
  });
}

/** Student: PUT (upsert) draft */
export async function saveTaskAnswerDraft(assignmentId: number, taskId: number, body: LessonTaskAnswerRequest) {
  return api<LessonTaskAnswerResponse>(`/api/lesson-assignments/${assignmentId}/tasks/${taskId}/answer`, {
    method: "PUT",
    auth: true,
    body,
  });
}

/** Student: POST submit (resubmit allowed) */
export async function submitTaskAnswer(assignmentId: number, taskId: number, body: LessonTaskAnswerRequest) {
  return api<LessonTaskAnswerResponse>(`/api/lesson-assignments/${assignmentId}/tasks/${taskId}/submit`, {
    method: "POST",
    auth: true,
    body,
  });
}

/** Teacher: read-only view of student's answer */
export async function getStudentTaskAnswer(groupId: number, assignmentId: number, taskId: number, userId: number) {
  const usp = new URLSearchParams({ userId: String(userId) });
  return api<LessonTaskAnswerResponse>(
    `/api/groups/${groupId}/lesson-assignments/${assignmentId}/tasks/${taskId}/answer?${usp.toString()}`,
    { method: "GET", auth: true }
  );
}