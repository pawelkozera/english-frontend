/**
 * Lessons = reusable practice bundles (library owned by teacher).
 * Items are ordered taskIds. Since tasks can be READING_TEXT / YOUTUBE_VIDEO etc.,
 * lessons can contain any content type without special cases.
 */

import { api } from "../lib/http";
import type {
  CreateLessonRequest,
  LessonResponse,
  Page,
  ReplaceLessonItemsRequest,
  UpdateLessonRequest,
} from "./types";

export async function createLesson(req: CreateLessonRequest) {
  return api<LessonResponse>("/api/lessons", { method: "POST", auth: true, body: req });
}

export async function listMyLessons(params?: {
  includeArchived?: boolean;
  q?: string;
  page?: number;
  size?: number;
}) {
  const includeArchived = params?.includeArchived ?? false;
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  const q = params?.q?.trim();

  const usp = new URLSearchParams();
  usp.set("includeArchived", String(includeArchived));
  usp.set("page", String(page));
  usp.set("size", String(size));
  if (q) usp.set("q", q);

  return api<Page<LessonResponse>>(`/api/lessons?${usp.toString()}`, {
    method: "GET",
    auth: true,
  });
}

export async function getLesson(lessonId: number) {
  return api<LessonResponse>(`/api/lessons/${lessonId}`, { method: "GET", auth: true });
}

export async function updateLesson(lessonId: number, req: UpdateLessonRequest) {
  return api<LessonResponse>(`/api/lessons/${lessonId}`, { method: "PUT", auth: true, body: req });
}

/**
 * Replaces the entire ordered list of items (also supports reorder + add/remove).
 */
export async function replaceLessonItems(lessonId: number, req: ReplaceLessonItemsRequest) {
  return api<LessonResponse>(`/api/lessons/${lessonId}/items`, { method: "PUT", auth: true, body: req });
}

/**
 * Archives a lesson (backend sets status=ARCHIVED).
 * Response: 204 No Content
 */
export async function archiveLesson(lessonId: number) {
  return api<void>(`/api/lessons/${lessonId}`, { method: "DELETE", auth: true });
}