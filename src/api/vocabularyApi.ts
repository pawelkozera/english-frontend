
import { api } from "../lib/http";
import type { CreateVocabularyRequest, Page, UpdateVocabularyRequest, VocabularyResponse } from "./types";

export async function createVocabulary(req: CreateVocabularyRequest) {
  return api<VocabularyResponse>("/api/vocabulary", { method: "POST", auth: true, body: req });
}

export async function searchVocabulary(params?: { q?: string; page?: number; size?: number }) {
  const q = params?.q?.trim();
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;

  const usp = new URLSearchParams();
  usp.set("page", String(page));
  usp.set("size", String(size));
  if (q) usp.set("q", q);

  return api<Page<VocabularyResponse>>(`/api/vocabulary?${usp.toString()}`, { method: "GET", auth: true });
}

export async function getVocabulary(id: number) {
  return api<VocabularyResponse>(`/api/vocabulary/${id}`, { method: "GET", auth: true });
}

export async function updateVocabulary(id: number, req: UpdateVocabularyRequest) {
  return api<VocabularyResponse>(`/api/vocabulary/${id}`, { method: "PUT", auth: true, body: req });
}

export async function deleteVocabulary(id: number) {
  return api<void>(`/api/vocabulary/${id}`, { method: "DELETE", auth: true });
}
