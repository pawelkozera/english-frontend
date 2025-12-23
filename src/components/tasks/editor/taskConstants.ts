import type { TaskStatus, TaskType, VocabDirection } from "../../../api/types";

export const TASK_TYPES: { value: TaskType; label: string; description: string }[] = [
  { value: "VOCAB_FLASHCARDS", label: "Flashcards", description: "Self-check flashcards for vocabulary." },
  { value: "VOCAB_MATCHING", label: "Matching", description: "Match pairs between EN and PL." },
  { value: "VOCAB_MCQ", label: "Multiple choice", description: "Choose the correct translation." },
  { value: "VOCAB_TYPING", label: "Typing", description: "Type the correct translation." },
  { value: "ESSAY", label: "Essay", description: "Long-form writing task." },
  { value: "READING_TEXT", label: "Reading", description: "Reading comprehension task." },
  { value: "YOUTUBE_VIDEO", label: "YouTube video", description: "Listening/summary task from video." },
  { value: "CUSTOM", label: "Custom", description: "Custom task payload." },
];

export const TASK_STATUSES: TaskStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

export const VOCAB_DIRECTIONS: { value: VocabDirection; label: string }[] = [
  { value: "EN_TO_PL", label: "EN to PL" },
  { value: "PL_TO_EN", label: "PL to EN" },
  { value: "BOTH", label: "Both directions" },
];

export function typeLabel(value: TaskType) {
  return TASK_TYPES.find((t) => t.value === value)?.label ?? value;
}
