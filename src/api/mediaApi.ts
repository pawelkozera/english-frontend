import { getAccessToken } from "../lib/auth";

export type MediaType = "IMAGE" | "AUDIO";

export type MediaUploadResponse = {
  id: number;
  type: MediaType;
  url: string;          // e.g. /api/media/123
  contentType: string;
  size: number;
  createdAt: string;
};

export type MediaInfoResponse = {
  id: number;
  type: MediaType;
  originalName: string;
  contentType: string;
  size: number;
  createdAt: string;
};

/**
 * Uploads a media file (JWT required).
 * Uses Authorization header + credentials for refresh cookie.
 */
export async function uploadMedia(file: File): Promise<MediaUploadResponse> {
  const token = getAccessToken();
  if (!token) throw new Error("Unauthorized");

  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch("/api/media", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
    credentials: "include",
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }

  return (await res.json()) as MediaUploadResponse;
}

/**
 * Returns metadata for a media file.
 */
export async function getMediaInfo(id: number): Promise<MediaInfoResponse> {
  const token = getAccessToken();
  if (!token) throw new Error("Unauthorized");

  const res = await fetch(`/api/media/${id}/info`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }

  return (await res.json()) as MediaInfoResponse;
}

/**
 * Fetches a private media file as Blob (works for <img> / <audio> via object URL).
 */
export async function fetchMediaBlob(id: number): Promise<Blob> {
  const token = getAccessToken();
  if (!token) throw new Error("Unauthorized");

  const res = await fetch(`/api/media/${id}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }

  return await res.blob();
}

/**
 * Deletes a media file (owner only).
 */
export async function deleteMedia(id: number): Promise<void> {
  const token = getAccessToken();
  if (!token) throw new Error("Unauthorized");

  const res = await fetch(`/api/media/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
}