export type IsoDateTime = string;

export type GroupRole = "STUDENT" | "TEACHER";

export type AuthResponse = {
  accessToken: string;
};

// /api/groups/me (and /api/groups/join) -> no joinCode
export type GroupListItem = {
  id: number;
  name: string;
  myRole: GroupRole;
  createdAt: IsoDateTime;
};

// /api/groups (create) -> creator is TEACHER, code is present
export type GroupCreatedResponse = {
  id: number;
  name: string;
  joinCode: string;
  myRole: "TEACHER";
  createdAt: IsoDateTime;
};

// /api/groups/{id} -> joinCode only for TEACHER, student gets null
export type GroupDetailsResponse = {
  id: number;
  name: string;
  myRole: GroupRole;
  joinCode: string | null;
  createdAt: IsoDateTime;
};

export type JoinCodeResponse = {
  joinCode: string;
};

export type MemberResponse = {
  userId: number;
  email: string;
  role: GroupRole;
  joinedAt: IsoDateTime;
  owner: boolean;
};

export type InviteCreatedResponse = {
  inviteId: number;
  token: string; // plaintext token returned only once
  expiresAt: IsoDateTime;
  maxUses: number | null;
  roleGranted: GroupRole;
};

export type InviteSummaryResponse = {
  inviteId: number;
  createdAt: IsoDateTime;
  expiresAt: IsoDateTime;
  revoked: boolean;
  maxUses: number | null;
  usedCount: number;
  roleGranted: GroupRole;
};

export type InvitePreviewResponse = {
  valid: boolean;
  groupName: string;
  roleGranted: GroupRole;
  expiresAt: IsoDateTime;
  maxUses: number | null;
  usedCount: number;
  exhausted: boolean;
  revoked: boolean;
  expired: boolean;
  alreadyMember: boolean;
};

export type AcceptInviteResponse = {
  groupId: number;
  groupName: string;
  myRole: GroupRole;
};

// ===== Vocabulary =====

export type VocabularyResponse = {
  id: number;
  termEn: string;
  termPl: string;
  exampleEn: string | null;
  examplePl: string | null;
  imageMediaId: number | null;
  audioMediaId: number | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type CreateVocabularyRequest = {
  termEn: string;
  termPl: string;
  exampleEn?: string | null;
  examplePl?: string | null;
  imageMediaId?: number | null;
  audioMediaId?: number | null;
};

export type UpdateVocabularyRequest = CreateVocabularyRequest;

// Spring Page<T>
export type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number; // current page (0-based)
};

// ===== Tasks =====

export type TaskType =
  | "VOCAB_FLASHCARDS"
  | "VOCAB_MATCHING"
  | "VOCAB_MCQ"
  | "VOCAB_TYPING"
  | "ESSAY"
  | "READING_TEXT"
  | "YOUTUBE_VIDEO"
  | "CUSTOM";

export type TaskStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

// Payloads (frontend-safe union you can expand later)
export type TaskPayload =
  | VocabFlashcardsPayload
  | VocabMatchingPayload
  | VocabMcqPayload
  | VocabTypingPayload
  | EssayPayload
  | ReadingTextPayload
  | YoutubeVideoPayload
  | CustomPayload;

export type VocabDirection = "EN_TO_PL" | "PL_TO_EN" | "BOTH";

export type VocabFlashcardsPayload = {
  kind: "VOCAB_FLASHCARDS";
  direction: VocabDirection;
  shuffle?: boolean;
};

export type VocabMatchingPayload = {
  kind: "VOCAB_MATCHING";
  direction: Exclude<VocabDirection, "BOTH">;
  shuffle?: boolean;
};

export type VocabMcqPayload = {
  kind: "VOCAB_MCQ";
  direction: Exclude<VocabDirection, "BOTH">;
  optionsCount?: number; // default: 4
  shuffle?: boolean;
};

export type VocabTypingPayload = {
  kind: "VOCAB_TYPING";
  direction: Exclude<VocabDirection, "BOTH">;
  caseSensitive?: boolean; // default: false
  trimWhitespace?: boolean; // default: true
};

export type EssayPayload = {
  kind: "ESSAY";
  prompt: string;
  minWords?: number;
  maxWords?: number;
  attachmentsAllowed?: boolean;
};

export type Question =
  | { kind: "OPEN"; prompt: string; sampleAnswer?: string }
  | { kind: "MCQ"; prompt: string; options: string[]; correctIndex?: number }
  | { kind: "TRUE_FALSE"; prompt: string; correct?: boolean };

export type QuestionsBlock = {
  questions?: Question[];
};

export type ReadingTextPayload = {
  kind: "READING_TEXT";
  title?: string;
  text: string;
} & QuestionsBlock;


export type YoutubeVideoPayload = {
  kind: "YOUTUBE_VIDEO";
  url: string;
  startSeconds?: number;
  notes?: string;
} & QuestionsBlock;

export type CustomPayload = {
  kind: "CUSTOM";
  [k: string]: unknown;
};

export type TaskResponse = {
  id: number;
  title: string;
  type: TaskType;
  status: TaskStatus;
  payload: Record<string, unknown>; // backend stores JSONB; you can cast to TaskPayload by type
  vocabularyIds: number[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type CreateTaskRequest = {
  title: string;
  type: TaskType;
  status?: TaskStatus;
  payload?: Record<string, unknown>;
  vocabularyIds?: number[];
};

export type UpdateTaskRequest = {
  title: string;
  status: TaskStatus;
  payload?: Record<string, unknown>;
};

export type ReplaceTaskVocabularyRequest = {
  vocabularyIds: number[];
};