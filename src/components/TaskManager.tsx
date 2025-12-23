import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createTask,
  deleteTask,
  replaceTaskVocabulary,
  searchTasks,
  updateTask,
} from "../api/tasksApi";
import { searchVocabulary } from "../api/vocabularyApi";
import type { Question, TaskResponse, TaskStatus, TaskType, VocabDirection } from "../api/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import TaskPreview from "./TaskPreview";

const TASK_PAGE_SIZE = 10;
const VOCAB_PAGE_SIZE = 12;

const TASK_TYPES: { value: TaskType; label: string; description: string }[] = [
  { value: "VOCAB_FLASHCARDS", label: "Flashcards", description: "Self-check flashcards for vocabulary." },
  { value: "VOCAB_MATCHING", label: "Matching", description: "Match pairs between EN and PL." },
  { value: "VOCAB_MCQ", label: "Multiple choice", description: "Choose the correct translation." },
  { value: "VOCAB_TYPING", label: "Typing", description: "Type the correct translation." },
  { value: "ESSAY", label: "Essay", description: "Long-form writing task." },
  { value: "READING_TEXT", label: "Reading", description: "Reading comprehension task." },
  { value: "YOUTUBE_VIDEO", label: "YouTube video", description: "Listening/summary task from video." },
  { value: "CUSTOM", label: "Custom", description: "Custom task payload." },
];

const TASK_STATUSES: TaskStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const VOCAB_DIRECTIONS: { value: VocabDirection; label: string }[] = [
  { value: "EN_TO_PL", label: "EN to PL" },
  { value: "PL_TO_EN", label: "PL to EN" },
  { value: "BOTH", label: "Both directions" },
];

type VocabMatchingDirection = Exclude<VocabDirection, "BOTH">;

export default function TaskManager() {
  const [taskSearch, setTaskSearch] = useState("");
  const [taskType, setTaskType] = useState<TaskType | "ALL">("ALL");
  const [taskStatus, setTaskStatus] = useState<TaskStatus | "ALL">("ALL");
  const [taskPage, setTaskPage] = useState(0);
  const [previewOpenIds, setPreviewOpenIds] = useState<number[]>([]);

  const [editingTask, setEditingTask] = useState<TaskResponse | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("DRAFT");
  const [type, setType] = useState<TaskType>("VOCAB_FLASHCARDS");

  const [flashDirection, setFlashDirection] = useState<VocabDirection>("BOTH");
  const [flashShuffle, setFlashShuffle] = useState(false);

  const [matchDirection, setMatchDirection] = useState<VocabMatchingDirection>("EN_TO_PL");
  const [matchShuffle, setMatchShuffle] = useState(true);

  const [mcqDirection, setMcqDirection] = useState<VocabMatchingDirection>("EN_TO_PL");
  const [mcqOptionsCount, setMcqOptionsCount] = useState("4");
  const [mcqShuffle, setMcqShuffle] = useState(false);

  const [typingDirection, setTypingDirection] = useState<VocabMatchingDirection>("EN_TO_PL");
  const [typingCaseSensitive, setTypingCaseSensitive] = useState(false);
  const [typingTrimWhitespace, setTypingTrimWhitespace] = useState(true);

  const [essayPrompt, setEssayPrompt] = useState("");
  const [essayMinWords, setEssayMinWords] = useState("");
  const [essayMaxWords, setEssayMaxWords] = useState("");
  const [essayAttachmentsAllowed, setEssayAttachmentsAllowed] = useState(false);

  const [readingTitle, setReadingTitle] = useState("");
  const [readingText, setReadingText] = useState("");
  const [readingQuestions, setReadingQuestions] = useState<Question[]>([]);

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeStartHours, setYoutubeStartHours] = useState("");
  const [youtubeStartMinutes, setYoutubeStartMinutes] = useState("");
  const [youtubeStartSeconds, setYoutubeStartSeconds] = useState("");
  const [youtubeNotes, setYoutubeNotes] = useState("");
  const [youtubeQuestions, setYoutubeQuestions] = useState<Question[]>([]);

  const [customPayloadJson, setCustomPayloadJson] = useState("");

  const [vocabSearch, setVocabSearch] = useState("");
  const [vocabPage, setVocabPage] = useState(0);
  const [selectedVocabIds, setSelectedVocabIds] = useState<number[]>([]);

  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const tasksQuery = useQuery({
    queryKey: ["tasks", taskSearch, taskType, taskStatus, taskPage, TASK_PAGE_SIZE],
    queryFn: () =>
      searchTasks({
        q: taskSearch.trim() ? taskSearch.trim() : undefined,
        type: taskType === "ALL" ? undefined : taskType,
        status: taskStatus === "ALL" ? undefined : taskStatus,
        page: taskPage,
        size: TASK_PAGE_SIZE,
      }),
  });

  const vocabQuery = useQuery({
    queryKey: ["vocabulary", vocabSearch, vocabPage, VOCAB_PAGE_SIZE],
    queryFn: () => searchVocabulary({ q: vocabSearch.trim() ? vocabSearch.trim() : undefined, page: vocabPage, size: VOCAB_PAGE_SIZE }),
  });

  useEffect(() => {
    setTaskPage(0);
  }, [taskSearch, taskType, taskStatus]);

  useEffect(() => {
    setVocabPage(0);
  }, [vocabSearch]);

  const selectedVocabSet = useMemo(() => new Set(selectedVocabIds), [selectedVocabIds]);

  function resetForm() {
    setEditingTask(null);
    setTitle("");
    setStatus("DRAFT");
    setType("VOCAB_FLASHCARDS");
    setFlashDirection("BOTH");
    setFlashShuffle(false);
    setMatchDirection("EN_TO_PL");
    setMatchShuffle(true);
    setMcqDirection("EN_TO_PL");
    setMcqOptionsCount("4");
    setMcqShuffle(false);
    setTypingDirection("EN_TO_PL");
    setTypingCaseSensitive(false);
    setTypingTrimWhitespace(true);
    setEssayPrompt("");
    setEssayMinWords("");
    setEssayMaxWords("");
    setEssayAttachmentsAllowed(false);
    setReadingTitle("");
    setReadingText("");
    setReadingQuestions([]);
    setYoutubeUrl("");
    setYoutubeStartHours("");
    setYoutubeStartMinutes("");
    setYoutubeStartSeconds("");
    setYoutubeNotes("");
    setYoutubeQuestions([]);
    setCustomPayloadJson("");
    setSelectedVocabIds([]);
  }

  function sanitizeQuestions(questions: Question[]): Question[] {
    return questions
      .map((q) => {
        const prompt = q.prompt.trim();
        if (!prompt) return null;
        if (q.kind === "OPEN") {
          const sampleAnswer = q.sampleAnswer?.trim();
          return { kind: q.kind, prompt, sampleAnswer: sampleAnswer || undefined };
        }
        if (q.kind === "MCQ") {
          const options = (q.options ?? []).map((opt) => opt.trim()).filter(Boolean);
          const correctIndex =
            typeof q.correctIndex === "number" && Number.isFinite(q.correctIndex) ? q.correctIndex : undefined;
          return { kind: q.kind, prompt, options, correctIndex };
        }
        if (q.kind === "TRUE_FALSE") {
          return { kind: q.kind, prompt, correct: q.correct };
        }
        return null;
      })
      .filter(Boolean) as Question[];
  }

  function validateQuestions(questions: Question[]): string | null {
    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      if (!q.prompt.trim()) {
        return `Question ${i + 1} needs a prompt.`;
      }
      if (q.kind === "MCQ") {
        const options = (q.options ?? []).map((opt) => opt.trim()).filter(Boolean);
        if (options.length < 2) {
          return `Question ${i + 1} needs at least 2 options.`;
        }
        if (typeof q.correctIndex === "number" && (q.correctIndex < 0 || q.correctIndex >= options.length)) {
          return `Question ${i + 1} has invalid correct index.`;
        }
      }
    }
    return null;
  }

  function buildPayload(): Record<string, unknown> | undefined {
    switch (type) {
      case "VOCAB_FLASHCARDS":
        return { kind: type, direction: flashDirection, shuffle: flashShuffle };
      case "VOCAB_MATCHING":
        return { kind: type, direction: matchDirection, shuffle: matchShuffle };
      case "VOCAB_MCQ":
        return {
          kind: type,
          direction: mcqDirection,
          optionsCount: mcqOptionsCount.trim() ? Number(mcqOptionsCount) : undefined,
          shuffle: mcqShuffle,
        };
      case "VOCAB_TYPING":
        return {
          kind: type,
          direction: typingDirection,
          caseSensitive: typingCaseSensitive,
          trimWhitespace: typingTrimWhitespace,
        };
      case "ESSAY":
        return {
          kind: type,
          prompt: essayPrompt.trim(),
          minWords: essayMinWords.trim() ? Number(essayMinWords) : undefined,
          maxWords: essayMaxWords.trim() ? Number(essayMaxWords) : undefined,
          attachmentsAllowed: essayAttachmentsAllowed,
        };
      case "READING_TEXT":
        return {
          kind: type,
          title: readingTitle.trim() ? readingTitle.trim() : undefined,
          text: readingText.trim(),
          questions: sanitizeQuestions(readingQuestions),
        };
      case "YOUTUBE_VIDEO":
        return {
          kind: type,
          url: youtubeUrl.trim(),
          startSeconds:
            youtubeStartHours.trim() || youtubeStartMinutes.trim() || youtubeStartSeconds.trim()
              ? Math.max(
                  0,
                  Number(youtubeStartHours || 0) * 3600 +
                    Number(youtubeStartMinutes || 0) * 60 +
                    Number(youtubeStartSeconds || 0)
                )
              : undefined,
          notes: youtubeNotes.trim() ? youtubeNotes.trim() : undefined,
          questions: sanitizeQuestions(youtubeQuestions),
        };
      case "CUSTOM":
        return customPayloadJson.trim() ? JSON.parse(customPayloadJson) : { kind: type };
      default:
        return undefined;
    }
  }

  function loadFromTask(task: TaskResponse) {
    setReadingQuestions([]);
    setYoutubeQuestions([]);
    setEditingTask(task);
    setTitle(task.title);
    setStatus(task.status);
    setType(task.type);
    setSelectedVocabIds(task.vocabularyIds ?? []);

    const payload = task.payload ?? {};
    if (task.type === "VOCAB_FLASHCARDS") {
      setFlashDirection((payload.direction as VocabDirection) ?? "BOTH");
      setFlashShuffle(Boolean(payload.shuffle));
    }
    if (task.type === "VOCAB_MATCHING") {
      setMatchDirection((payload.direction as VocabMatchingDirection) ?? "EN_TO_PL");
      setMatchShuffle(payload.shuffle === undefined ? true : Boolean(payload.shuffle));
    }
    if (task.type === "VOCAB_MCQ") {
      setMcqDirection((payload.direction as VocabMatchingDirection) ?? "EN_TO_PL");
      setMcqOptionsCount(payload.optionsCount ? String(payload.optionsCount) : "4");
      setMcqShuffle(Boolean(payload.shuffle));
    }
    if (task.type === "VOCAB_TYPING") {
      setTypingDirection((payload.direction as VocabMatchingDirection) ?? "EN_TO_PL");
      setTypingCaseSensitive(Boolean(payload.caseSensitive));
      setTypingTrimWhitespace(payload.trimWhitespace !== false);
    }
    if (task.type === "ESSAY") {
      setEssayPrompt((payload.prompt as string) ?? "");
      setEssayMinWords(payload.minWords ? String(payload.minWords) : "");
      setEssayMaxWords(payload.maxWords ? String(payload.maxWords) : "");
      setEssayAttachmentsAllowed(Boolean(payload.attachmentsAllowed));
    }
    if (task.type === "READING_TEXT") {
      setReadingTitle((payload.title as string) ?? "");
      setReadingText((payload.text as string) ?? "");
      setReadingQuestions((payload.questions as Question[]) ?? []);
    }
    if (task.type === "YOUTUBE_VIDEO") {
      setYoutubeUrl((payload.url as string) ?? "");
      const totalSeconds = payload.startSeconds ? Number(payload.startSeconds) : 0;
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setYoutubeStartHours(totalSeconds ? String(hours) : "");
      setYoutubeStartMinutes(totalSeconds ? String(minutes) : "");
      setYoutubeStartSeconds(totalSeconds ? String(seconds) : "");
      setYoutubeNotes((payload.notes as string) ?? "");
      setYoutubeQuestions((payload.questions as Question[]) ?? []);
    }
    if (task.type === "CUSTOM") {
      setCustomPayloadJson(JSON.stringify(payload, null, 2));
    }
  }

  function typeLabel(value: TaskType) {
    return TASK_TYPES.find((t) => t.value === value)?.label ?? value;
  }

  const selectedTypeMeta = TASK_TYPES.find((t) => t.value === type);

  function updateQuestionAt(
    setter: Dispatch<SetStateAction<Question[]>>,
    index: number,
    updater: (prev: Question) => Question
  ) {
    setter((prev) => prev.map((q, i) => (i === index ? updater(q) : q)));
  }

  function renderQuestionsEditor(label: string, questions: Question[], setQuestions: Dispatch<SetStateAction<Question[]>>) {
    return (
      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">⇅ Drag to reorder</span>
            <Button
              variant="ghost"
              onClick={() =>
                setQuestions((prev) => [...prev, { kind: "OPEN", prompt: "", sampleAnswer: "" }])
              }
            >
              Add question
            </Button>
          </div>
        </div>
        {questions.length === 0 && <p className="text-sm text-muted-foreground">No questions yet.</p>}
        <div className="space-y-3">
          {questions.map((q, index) => (
            <div
              key={`${q.kind}-${index}`}
              className="rounded-xl border bg-background/70 p-3"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", String(index));
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const fromIndex = Number(e.dataTransfer.getData("text/plain"));
                if (Number.isNaN(fromIndex) || fromIndex === index) return;
                setQuestions((prev) => {
                  const next = [...prev];
                  const [moved] = next.splice(fromIndex, 1);
                  next.splice(index, 0, moved);
                  return next;
                });
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="cursor-grab select-none text-sm text-muted-foreground">⋮⋮</span>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={q.kind}
                    onChange={(e) => {
                      const kind = e.target.value as Question["kind"];
                      updateQuestionAt(setQuestions, index, (prev) => {
                        if (kind === "OPEN") {
                          return { kind, prompt: prev.prompt ?? "", sampleAnswer: "" };
                        }
                        if (kind === "MCQ") {
                          return { kind, prompt: prev.prompt ?? "", options: ["", ""], correctIndex: undefined };
                        }
                        return { kind, prompt: prev.prompt ?? "", correct: undefined };
                      });
                    }}
                  >
                    <option value="OPEN">Open</option>
                    <option value="MCQ">Multiple choice</option>
                    <option value="TRUE_FALSE">True / False</option>
                  </select>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </div>
              <div className="mt-3 space-y-2">
                <Input
                  placeholder="Question prompt"
                  value={q.prompt}
                  onChange={(e) =>
                    updateQuestionAt(setQuestions, index, (prev) => ({ ...prev, prompt: e.target.value }))
                  }
                />
                {q.kind === "OPEN" && (
                  <Input
                    placeholder="Sample answer (optional)"
                    value={q.sampleAnswer ?? ""}
                    onChange={(e) =>
                      updateQuestionAt(setQuestions, index, (prev) => ({
                        ...prev,
                        sampleAnswer: e.target.value,
                      }))
                    }
                  />
                )}
                {q.kind === "MCQ" && (
                  <div className="space-y-2">
                    <div className="space-y-2">
                      {(q.options ?? []).map((opt, optIndex) => (
                        <div key={`${index}-opt-${optIndex}`} className="flex items-center gap-2">
                          <Input
                            placeholder={`Option ${optIndex + 1}`}
                            value={opt}
                            onChange={(e) =>
                              updateQuestionAt(setQuestions, index, (prev) => {
                                const nextOptions = [...(prev.options ?? [])];
                                nextOptions[optIndex] = e.target.value;
                                return { ...prev, options: nextOptions };
                              })
                            }
                          />
                          <Button
                            variant="ghost"
                            onClick={() =>
                              updateQuestionAt(setQuestions, index, (prev) => {
                                const nextOptions = [...(prev.options ?? [])].filter((_, i) => i !== optIndex);
                                if (nextOptions.length === 0) return prev;
                                const nextCorrect =
                                  typeof prev.correctIndex === "number" && prev.correctIndex >= optIndex
                                    ? Math.max(0, prev.correctIndex - 1)
                                    : prev.correctIndex;
                                return { ...prev, options: nextOptions, correctIndex: nextCorrect };
                              })
                            }
                            disabled={(q.options ?? []).length <= 1}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        onClick={() =>
                          updateQuestionAt(setQuestions, index, (prev) => ({
                            ...prev,
                            options: [...(prev.options ?? []), ""],
                          }))
                        }
                      >
                        Add option
                      </Button>
                    </div>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={typeof q.correctIndex === "number" ? String(q.correctIndex) : ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        updateQuestionAt(setQuestions, index, (prev) => ({
                          ...prev,
                          correctIndex: raw === "" ? undefined : Number(raw),
                        }));
                      }}
                    >
                      <option value="">Correct answer (optional)</option>
                      {(q.options ?? []).map((opt, optIndex) => (
                        <option key={`${index}-correct-${optIndex}`} value={String(optIndex)}>
                          {opt.trim() ? opt : `Option ${optIndex + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {q.kind === "TRUE_FALSE" && (
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={q.correct === undefined ? "" : q.correct ? "true" : "false"}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateQuestionAt(setQuestions, index, (prev) => ({
                        ...prev,
                        correct: value === "" ? undefined : value === "true",
                      }));
                    }}
                  >
                    <option value="">Correct answer (optional)</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6 rounded-2xl border bg-card/70 p-6 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Task library</p>
          <h2 className="text-2xl font-semibold text-foreground">Manage tasks</h2>
        </div>
      </div>

      <div className="rounded-2xl border bg-background/70 p-5">
        <h3 className="text-lg font-semibold text-foreground">{editingTask ? "Edit task" : "Create task"}</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as TaskType)}
              disabled={!!editingTask}
            >
              {TASK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedTypeMeta && (
          <p className="mt-2 text-sm text-muted-foreground">{selectedTypeMeta.description}</p>
        )}

        <div className="mt-4 rounded-xl border bg-muted/40 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Task setup</p>
          {type === "VOCAB_FLASHCARDS" && (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Direction</p>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={flashDirection}
                  onChange={(e) => setFlashDirection(e.target.value as VocabDirection)}
                >
                  {VOCAB_DIRECTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={flashShuffle}
                  onChange={(e) => setFlashShuffle(e.target.checked)}
                />
                Shuffle cards
              </label>
            </div>
          )}

          {type === "VOCAB_MATCHING" && (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Direction</p>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={matchDirection}
                  onChange={(e) => setMatchDirection(e.target.value as VocabMatchingDirection)}
                >
                  {VOCAB_DIRECTIONS.filter((d) => d.value !== "BOTH").map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={matchShuffle}
                  onChange={(e) => setMatchShuffle(e.target.checked)}
                />
                Shuffle pairs
              </label>
            </div>
          )}

          {type === "VOCAB_MCQ" && (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Direction</p>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={mcqDirection}
                  onChange={(e) => setMcqDirection(e.target.value as VocabMatchingDirection)}
                >
                  {VOCAB_DIRECTIONS.filter((d) => d.value !== "BOTH").map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Options count</p>
                <Input value={mcqOptionsCount} onChange={(e) => setMcqOptionsCount(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={mcqShuffle} onChange={(e) => setMcqShuffle(e.target.checked)} />
                Shuffle answers
              </label>
            </div>
          )}

          {type === "VOCAB_TYPING" && (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Direction</p>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={typingDirection}
                  onChange={(e) => setTypingDirection(e.target.value as VocabMatchingDirection)}
                >
                  {VOCAB_DIRECTIONS.filter((d) => d.value !== "BOTH").map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={typingCaseSensitive}
                    onChange={(e) => setTypingCaseSensitive(e.target.checked)}
                  />
                  Case sensitive
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={typingTrimWhitespace}
                    onChange={(e) => setTypingTrimWhitespace(e.target.checked)}
                  />
                  Trim whitespace
                </label>
              </div>
            </div>
          )}

          {type === "ESSAY" && (
            <div className="mt-3 grid gap-3">
              <Input placeholder="Prompt" value={essayPrompt} onChange={(e) => setEssayPrompt(e.target.value)} />
              <div className="grid gap-3 md:grid-cols-3">
                <Input placeholder="Min words" value={essayMinWords} onChange={(e) => setEssayMinWords(e.target.value)} />
                <Input placeholder="Max words" value={essayMaxWords} onChange={(e) => setEssayMaxWords(e.target.value)} />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={essayAttachmentsAllowed}
                    onChange={(e) => setEssayAttachmentsAllowed(e.target.checked)}
                  />
                  Attachments allowed
                </label>
              </div>
            </div>
          )}

          {type === "READING_TEXT" && (
            <div className="mt-3 grid gap-3">
              <Input placeholder="Title (optional)" value={readingTitle} onChange={(e) => setReadingTitle(e.target.value)} />
              <textarea
                className="min-h-[140px] w-full rounded-md border border-input bg-background p-3 text-sm"
                placeholder="Reading text"
                value={readingText}
                onChange={(e) => setReadingText(e.target.value)}
              />
              {renderQuestionsEditor("Questions", readingQuestions, setReadingQuestions)}
            </div>
          )}

          {type === "YOUTUBE_VIDEO" && (
            <div className="mt-3 grid gap-3">
              <Input placeholder="Video URL" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} />
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Start (h)</p>
                  <Input
                    placeholder="Hours"
                    value={youtubeStartHours}
                    onChange={(e) => setYoutubeStartHours(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Start (m)</p>
                  <Input
                    placeholder="Minutes"
                    value={youtubeStartMinutes}
                    onChange={(e) => setYoutubeStartMinutes(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Start (s)</p>
                  <Input
                    placeholder="Seconds"
                    value={youtubeStartSeconds}
                    onChange={(e) => setYoutubeStartSeconds(e.target.value)}
                  />
                </div>
              </div>
              <Input placeholder="Notes (optional)" value={youtubeNotes} onChange={(e) => setYoutubeNotes(e.target.value)} />
              {renderQuestionsEditor("Questions", youtubeQuestions, setYoutubeQuestions)}
            </div>
          )}

          {type === "CUSTOM" && (
            <div className="mt-3 grid gap-3">
              <textarea
                className="min-h-[140px] w-full rounded-md border border-input bg-background p-3 text-sm"
                placeholder="Custom payload JSON"
                value={customPayloadJson}
                onChange={(e) => setCustomPayloadJson(e.target.value)}
              />
            </div>
          )}
        </div>

        {type.startsWith("VOCAB_") && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Vocabulary selection</p>
                <h4 className="text-lg font-semibold text-foreground">Choose vocabulary</h4>
              </div>
              <Input
                placeholder="Filter vocabulary..."
                value={vocabSearch}
                onChange={(e) => setVocabSearch(e.target.value)}
                className="w-full max-w-xs"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {vocabQuery.data?.content.map((item) => {
                const selected = selectedVocabSet.has(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`rounded-xl border p-4 text-left transition ${
                      selected ? "border-primary bg-primary/10" : "bg-background/70 hover:border-primary/50"
                    }`}
                    onClick={() => {
                      setSelectedVocabIds((prev) =>
                        prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                      );
                    }}
                  >
                    <p className="text-sm font-semibold text-foreground">{item.termEn}</p>
                    <p className="text-xs text-muted-foreground">{item.termPl}</p>
                  </button>
                );
              })}
            </div>
            {vocabQuery.data && (
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  Selected {selectedVocabIds.length} / {vocabQuery.data.totalElements}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    disabled={vocabQuery.data.number <= 0}
                    onClick={() => setVocabPage((p) => Math.max(0, p - 1))}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={vocabQuery.data.number + 1 >= vocabQuery.data.totalPages}
                    onClick={() => setVocabPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            disabled={saving}
            onClick={async () => {
              setActionError(null);
              if (!title.trim()) {
                setActionError("Title is required.");
                return;
              }

              if (type.startsWith("VOCAB_") && selectedVocabIds.length === 0) {
                setActionError("Select at least one vocabulary item.");
                return;
              }

              setSaving(true);
              try {
                let payload: Record<string, unknown> | undefined;
                try {
                  payload = buildPayload();
                } catch {
                  setActionError("Payload settings are invalid.");
                  setSaving(false);
                  return;
                }

                if (type === "ESSAY" && !essayPrompt.trim()) {
                  setActionError("Essay prompt is required.");
                  setSaving(false);
                  return;
                }

                if (type === "READING_TEXT" && !readingText.trim()) {
                  setActionError("Reading text is required.");
                  setSaving(false);
                  return;
                }

                if (type === "YOUTUBE_VIDEO" && !youtubeUrl.trim()) {
                  setActionError("YouTube URL is required.");
                  setSaving(false);
                  return;
                }

                if (type === "READING_TEXT") {
                  const error = validateQuestions(readingQuestions);
                  if (error) {
                    setActionError(error);
                    setSaving(false);
                    return;
                  }
                }

                if (type === "YOUTUBE_VIDEO") {
                  const error = validateQuestions(youtubeQuestions);
                  if (error) {
                    setActionError(error);
                    setSaving(false);
                    return;
                  }
                }

                if (editingTask) {
                  await updateTask(editingTask.id, {
                    title: title.trim(),
                    status,
                    payload,
                  });

                  const currentIds = editingTask.vocabularyIds ?? [];
                  const same =
                    currentIds.length === selectedVocabIds.length &&
                    currentIds.every((id) => selectedVocabSet.has(id));
                  if (type.startsWith("VOCAB_") && !same) {
                    await replaceTaskVocabulary(editingTask.id, { vocabularyIds: selectedVocabIds });
                  }
                } else {
                  await createTask({
                    title: title.trim(),
                    type,
                    status,
                    payload,
                    vocabularyIds: type.startsWith("VOCAB_") ? selectedVocabIds : undefined,
                  });
                }

                resetForm();
                await tasksQuery.refetch();
              } catch (e: any) {
                setActionError(e?.message ?? "Failed to save task");
              } finally {
                setSaving(false);
              }
            }}
          >
            {editingTask ? "Save changes" : "Create task"}
          </Button>
          {editingTask && (
            <Button variant="ghost" disabled={saving} onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Input
            placeholder="Search tasks..."
            value={taskSearch}
            onChange={(e) => setTaskSearch(e.target.value)}
            className="w-full max-w-xs"
          />
          <div className="grid w-full gap-3 sm:grid-cols-2 md:max-w-md">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Type</p>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as TaskType | "ALL")}
              >
                <option value="ALL">All types</option>
                {TASK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</p>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={taskStatus}
                onChange={(e) => setTaskStatus(e.target.value as TaskStatus | "ALL")}
              >
                <option value="ALL">All statuses</option>
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Entries</p>
            <h3 className="text-xl font-semibold text-foreground">All tasks</h3>
          </div>
          {tasksQuery.data && <p className="text-xs text-muted-foreground">{tasksQuery.data.totalElements} items</p>}
        </div>

        {tasksQuery.isLoading && <p className="text-sm text-muted-foreground">Loading tasks...</p>}
        {tasksQuery.error && <p className="text-sm text-destructive">{String(tasksQuery.error)}</p>}
        {tasksQuery.data && (
          <>
            <ul className="space-y-3">
              {tasksQuery.data.content.map((task) => (
                <li key={task.id} className="rounded-xl border bg-background/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-foreground">{task.title}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {typeLabel(task.type)}
                      </p>
                      <p className="text-xs text-muted-foreground">Status: {task.status}</p>
                      {task.vocabularyIds?.length ? (
                        <p className="text-xs text-muted-foreground">Vocabulary: {task.vocabularyIds.length}</p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setPreviewOpenIds((prev) =>
                            prev.includes(task.id) ? prev.filter((id) => id !== task.id) : [...prev, task.id]
                          );
                        }}
                      >
                        {previewOpenIds.includes(task.id) ? "Hide preview" : "Preview"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          loadFromTask(task);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          const ok = window.confirm(`Delete "${task.title}"?`);
                          if (!ok) return;
                          setActionError(null);
                          try {
                            await deleteTask(task.id);
                            await tasksQuery.refetch();
                          } catch (e: any) {
                            setActionError(e?.message ?? "Failed to delete task");
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  {previewOpenIds.includes(task.id) && <TaskPreview task={task} />}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                Page {tasksQuery.data.number + 1} / {tasksQuery.data.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  disabled={tasksQuery.data.number <= 0}
                  onClick={() => setTaskPage((p) => Math.max(0, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  variant="ghost"
                  disabled={tasksQuery.data.number + 1 >= tasksQuery.data.totalPages}
                  onClick={() => setTaskPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
