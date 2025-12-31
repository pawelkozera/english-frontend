import { api } from "../lib/http";
import type { LessonProgressResponse } from "./types";

/** Student: GET /api/lesson-assignments/{assignmentId}/progress */
export async function getMyLessonProgress(assignmentId: number) {
  return api<LessonProgressResponse>(`/api/lesson-assignments/${assignmentId}/progress`, {
    method: "GET",
    auth: true,
  });
}

/** Teacher: GET /api/groups/{groupId}/lesson-assignments/{assignmentId}/progress?userId=... */
export async function getStudentLessonProgress(groupId: number, assignmentId: number, userId: number) {
  const usp = new URLSearchParams({ userId: String(userId) });
  return api<LessonProgressResponse>(
    `/api/groups/${groupId}/lesson-assignments/${assignmentId}/progress?${usp.toString()}`,
    { method: "GET", auth: true }
  );
}

/** Student: POST /api/lesson-assignments/{assignmentId}/tasks/{taskId}/complete */
export async function completeLessonTask(assignmentId: number, taskId: number) {
  return api<LessonProgressResponse>(`/api/lesson-assignments/${assignmentId}/tasks/${taskId}/complete`, {
    method: "POST",
    auth: true,
  });
}

/** Student: POST /api/lesson-assignments/{assignmentId}/complete */
export async function completeLesson(assignmentId: number) {
  return api<LessonProgressResponse>(`/api/lesson-assignments/${assignmentId}/complete`, {
    method: "POST",
    auth: true,
  });
}