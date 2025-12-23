import { api } from "../lib/http";
import type {
  CreateTaskRequest,
  Page,
  ReplaceTaskVocabularyRequest,
  TaskResponse,
  TaskStatus,
  TaskType,
  UpdateTaskRequest,
} from "./types";

export async function createTask(req: CreateTaskRequest) {
  return api<TaskResponse>("/api/tasks", { method: "POST", auth: true, body: req });
}

export async function searchTasks(params?: {
  q?: string;
  type?: TaskType;
  status?: TaskStatus;
  page?: number;
  size?: number;
}) {
  const usp = new URLSearchParams();
  usp.set("page", String(params?.page ?? 0));
  usp.set("size", String(params?.size ?? 20));

  if (params?.q?.trim()) usp.set("q", params.q.trim());
  if (params?.type) usp.set("type", params.type);
  if (params?.status) usp.set("status", params.status);

  return api<Page<TaskResponse>>(`/api/tasks?${usp.toString()}`, { method: "GET", auth: true });
}

export async function getTask(taskId: number) {
  return api<TaskResponse>(`/api/tasks/${taskId}`, { method: "GET", auth: true });
}

export async function updateTask(taskId: number, req: UpdateTaskRequest) {
  return api<TaskResponse>(`/api/tasks/${taskId}`, { method: "PUT", auth: true, body: req });
}

export async function replaceTaskVocabulary(taskId: number, req: ReplaceTaskVocabularyRequest) {
  return api<TaskResponse>(`/api/tasks/${taskId}/vocabulary`, { method: "PUT", auth: true, body: req });
}

export async function deleteTask(taskId: number) {
  return api<void>(`/api/tasks/${taskId}`, { method: "DELETE", auth: true });
}
