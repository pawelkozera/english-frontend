import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Question, TaskResponse, TaskStatus, TaskType, VocabDirection } from "../api/types";
import { createTask, deleteTask, replaceTaskVocabulary, searchTasks, updateTask } from "../api/tasksApi";
import { searchVocabulary } from "../api/vocabularyApi";
import TaskEditor from "./tasks/editor/TaskEditor";
import TaskFilters from "./tasks/editor/TaskFilters";
import TaskList from "./tasks/editor/TaskList";

const TASK_PAGE_SIZE = 8;
const VOCAB_PAGE_SIZE = 9;

function isVocabType(type: TaskType) {
  return type.startsWith("VOCAB_");
}

function parseOptionalInt(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.floor(num);
}

function parseTimePiece(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.floor(num);
}

function sanitizeQuestions(questions: Question[]) {
  return questions
    .map((q) => {
      const prompt = q.prompt?.trim() ?? "";
      if (!prompt) return null;

      if (q.kind === "OPEN") {
        const sample = q.sampleAnswer?.trim() ?? "";
        return sample ? { kind: "OPEN", prompt, sampleAnswer: sample } : { kind: "OPEN", prompt };
      }

      if (q.kind === "MCQ") {
        const options = (q.options ?? []).map((opt) => opt.trim()).filter(Boolean);
        const correctIndex =
          typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < options.length
            ? q.correctIndex
            : undefined;
        return correctIndex === undefined
          ? { kind: "MCQ", prompt, options }
          : { kind: "MCQ", prompt, options, correctIndex };
      }

      if (typeof q.correct !== "boolean") {
        return { kind: "TRUE_FALSE", prompt };
      }
      return { kind: "TRUE_FALSE", prompt, correct: q.correct };
    })
    .filter(Boolean) as Question[];
}

function validateQuestions(questions: Question[]) {
  for (const q of questions) {
    if (!q.prompt?.trim()) continue;
    if (q.kind === "MCQ") {
      const options = (q.options ?? []).map((opt) => opt.trim()).filter(Boolean);
      if (options.length < 2) return "Multiple choice questions need at least two options.";
    }
  }
  return null;
}

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

  const [flashDirection, setFlashDirection] = useState<VocabDirection>("EN_TO_PL");
  const [flashShuffle, setFlashShuffle] = useState(false);
  const [matchDirection, setMatchDirection] = useState<Exclude<VocabDirection, "BOTH">>("EN_TO_PL");
  const [matchShuffle, setMatchShuffle] = useState(true);
  const [mcqDirection, setMcqDirection] = useState<Exclude<VocabDirection, "BOTH">>("EN_TO_PL");
  const [mcqOptionsCount, setMcqOptionsCount] = useState("4");
  const [mcqShuffle, setMcqShuffle] = useState(false);
  const [typingDirection, setTypingDirection] = useState<Exclude<VocabDirection, "BOTH">>("EN_TO_PL");
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

  const [customPayloadJson, setCustomPayloadJson] = useState('{\n  "kind": "CUSTOM"\n}\n');

  const [vocabSearch, setVocabSearch] = useState("");
  const [vocabPage, setVocabPage] = useState(0);
  const [selectedVocabIds, setSelectedVocabIds] = useState<number[]>([]);

  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const tasksQuery = useQuery({
    queryKey: ["tasks", taskSearch, taskType, taskStatus, taskPage, TASK_PAGE_SIZE],
    queryFn: () =>
      searchTasks({
        q: taskSearch,
        type: taskType === "ALL" ? undefined : taskType,
        status: taskStatus === "ALL" ? undefined : taskStatus,
        page: taskPage,
        size: TASK_PAGE_SIZE,
      }),
  });

  const vocabQuery = useQuery({
    queryKey: ["vocabulary", vocabSearch, vocabPage, VOCAB_PAGE_SIZE],
    queryFn: () => searchVocabulary({ q: vocabSearch, page: vocabPage, size: VOCAB_PAGE_SIZE }),
  });

  useEffect(() => {
    setTaskPage(0);
  }, [taskSearch, taskType, taskStatus]);

  useEffect(() => {
    setVocabPage(0);
  }, [vocabSearch]);

  useEffect(() => {
    if (!tasksQuery.data) return;
    const totalPages = Math.max(1, tasksQuery.data.totalPages);
    if (taskPage >= totalPages) setTaskPage(totalPages - 1);
  }, [taskPage, tasksQuery.data]);

  function resetForm() {
    setEditingTask(null);
    setTitle("");
    setStatus("DRAFT");
    setType("VOCAB_FLASHCARDS");
    setFlashDirection("EN_TO_PL");
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
    setCustomPayloadJson('{\n  "kind": "CUSTOM"\n}\n');
    setSelectedVocabIds([]);
    setActionError(null);
  }

  function loadFromTask(task: TaskResponse) {
    setEditingTask(task);
    setTitle(task.title ?? "");
    setStatus(task.status ?? "DRAFT");
    setType(task.type);
    setSelectedVocabIds(task.vocabularyIds ?? []);
    setActionError(null);

    const payload = task.payload ?? {};

    if (task.type === "VOCAB_FLASHCARDS") {
      setFlashDirection((payload as any).direction ?? "EN_TO_PL");
      setFlashShuffle(Boolean((payload as any).shuffle));
    }

    if (task.type === "VOCAB_MATCHING") {
      setMatchDirection((payload as any).direction ?? "EN_TO_PL");
      setMatchShuffle((payload as any).shuffle ?? true);
    }

    if (task.type === "VOCAB_MCQ") {
      setMcqDirection((payload as any).direction ?? "EN_TO_PL");
      setMcqShuffle(Boolean((payload as any).shuffle));
      const optionsCount = (payload as any).optionsCount;
      setMcqOptionsCount(typeof optionsCount === "number" ? String(optionsCount) : "4");
    }

    if (task.type === "VOCAB_TYPING") {
      setTypingDirection((payload as any).direction ?? "EN_TO_PL");
      setTypingCaseSensitive(Boolean((payload as any).caseSensitive));
      setTypingTrimWhitespace((payload as any).trimWhitespace !== false);
    }

    if (task.type === "ESSAY") {
      setEssayPrompt((payload as any).prompt ?? "");
      setEssayMinWords((payload as any).minWords ? String((payload as any).minWords) : "");
      setEssayMaxWords((payload as any).maxWords ? String((payload as any).maxWords) : "");
      setEssayAttachmentsAllowed(Boolean((payload as any).attachmentsAllowed));
    }

    if (task.type === "READING_TEXT") {
      setReadingTitle((payload as any).title ?? "");
      setReadingText((payload as any).text ?? "");
      setReadingQuestions(((payload as any).questions as Question[]) ?? []);
    }

    if (task.type === "YOUTUBE_VIDEO") {
      setYoutubeUrl((payload as any).url ?? "");
      setYoutubeNotes((payload as any).notes ?? "");
      setYoutubeQuestions(((payload as any).questions as Question[]) ?? []);
      const startSeconds = Math.max(0, Math.floor(Number((payload as any).startSeconds ?? 0) || 0));
      const hours = Math.floor(startSeconds / 3600);
      const minutes = Math.floor((startSeconds % 3600) / 60);
      const seconds = startSeconds % 60;
      setYoutubeStartHours(hours ? String(hours) : "");
      setYoutubeStartMinutes(minutes ? String(minutes) : "");
      setYoutubeStartSeconds(seconds ? String(seconds) : "");
    }

    if (task.type === "CUSTOM") {
      setCustomPayloadJson(JSON.stringify(payload, null, 2));
    }
  }

  function toggleVocabId(id: number) {
    setSelectedVocabIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  async function handleSave() {
    setActionError(null);

    if (!title.trim()) {
      setActionError("Title is required.");
      return;
    }

    if (isVocabType(type) && selectedVocabIds.length === 0) {
      setActionError("Select at least one vocabulary item.");
      return;
    }

    if (type === "VOCAB_MCQ" && mcqOptionsCount.trim()) {
      const optionsCount = Number(mcqOptionsCount);
      if (!Number.isFinite(optionsCount) || optionsCount < 2) {
        setActionError("Options count must be at least 2.");
        return;
      }
    }

    if (type === "ESSAY" && !essayPrompt.trim()) {
      setActionError("Essay prompt is required.");
      return;
    }

    if (type === "READING_TEXT" && !readingText.trim()) {
      setActionError("Reading text is required.");
      return;
    }

    if (type === "YOUTUBE_VIDEO" && !youtubeUrl.trim()) {
      setActionError("YouTube URL is required.");
      return;
    }

    if (type === "READING_TEXT") {
      const error = validateQuestions(readingQuestions);
      if (error) {
        setActionError(error);
        return;
      }
    }

    if (type === "YOUTUBE_VIDEO") {
      const error = validateQuestions(youtubeQuestions);
      if (error) {
        setActionError(error);
        return;
      }
    }

    let payload: Record<string, unknown> | null = null;

    if (type === "VOCAB_FLASHCARDS") {
      payload = { kind: "VOCAB_FLASHCARDS", direction: flashDirection, shuffle: flashShuffle };
    }

    if (type === "VOCAB_MATCHING") {
      payload = { kind: "VOCAB_MATCHING", direction: matchDirection, shuffle: matchShuffle };
    }

    if (type === "VOCAB_MCQ") {
      const parsed = parseOptionalInt(mcqOptionsCount);
      if (parsed === null) {
        setActionError("Options count must be a positive number.");
        return;
      }
      payload = {
        kind: "VOCAB_MCQ",
        direction: mcqDirection,
        shuffle: mcqShuffle,
        ...(parsed ? { optionsCount: parsed } : {}),
      };
    }

    if (type === "VOCAB_TYPING") {
      payload = {
        kind: "VOCAB_TYPING",
        direction: typingDirection,
        caseSensitive: typingCaseSensitive,
        trimWhitespace: typingTrimWhitespace,
      };
    }

    if (type === "ESSAY") {
      const minWords = parseOptionalInt(essayMinWords);
      if (minWords === null) {
        setActionError("Min words must be a positive number.");
        return;
      }
      const maxWords = parseOptionalInt(essayMaxWords);
      if (maxWords === null) {
        setActionError("Max words must be a positive number.");
        return;
      }
      if (minWords !== undefined && maxWords !== undefined && minWords > maxWords) {
        setActionError("Min words cannot exceed max words.");
        return;
      }
      payload = {
        kind: "ESSAY",
        prompt: essayPrompt.trim(),
        ...(minWords !== undefined ? { minWords } : {}),
        ...(maxWords !== undefined ? { maxWords } : {}),
        attachmentsAllowed: essayAttachmentsAllowed,
      };
    }

    if (type === "READING_TEXT") {
      const questions = sanitizeQuestions(readingQuestions);
      payload = {
        kind: "READING_TEXT",
        text: readingText,
        ...(readingTitle.trim() ? { title: readingTitle.trim() } : {}),
        ...(questions.length ? { questions } : {}),
      };
    }

    if (type === "YOUTUBE_VIDEO") {
      const questions = sanitizeQuestions(youtubeQuestions);
      const hours = parseTimePiece(youtubeStartHours);
      const minutes = parseTimePiece(youtubeStartMinutes);
      const seconds = parseTimePiece(youtubeStartSeconds);
      const startSeconds = hours * 3600 + minutes * 60 + seconds;
      payload = {
        kind: "YOUTUBE_VIDEO",
        url: youtubeUrl.trim(),
        ...(startSeconds ? { startSeconds } : {}),
        ...(youtubeNotes.trim() ? { notes: youtubeNotes.trim() } : {}),
        ...(questions.length ? { questions } : {}),
      };
    }

    if (type === "CUSTOM") {
      try {
        const parsed = JSON.parse(customPayloadJson || "{}");
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          setActionError("Custom payload must be a JSON object.");
          return;
        }
        payload = parsed as Record<string, unknown>;
      } catch (e: any) {
        setActionError(e?.message ?? "Custom payload must be valid JSON.");
        return;
      }
    }

    if (!payload) {
      setActionError("Missing payload.");
      return;
    }

    setSaving(true);
    try {
      if (editingTask) {
        await updateTask(editingTask.id, { title: title.trim(), status, payload });
        if (isVocabType(type)) {
          await replaceTaskVocabulary(editingTask.id, { vocabularyIds: selectedVocabIds });
        }
      } else {
        await createTask({
          title: title.trim(),
          type,
          status,
          payload,
          ...(isVocabType(type) ? { vocabularyIds: selectedVocabIds } : {}),
        });
      }
      resetForm();
      await tasksQuery.refetch();
    } catch (e: any) {
      setActionError(e?.message ?? "Failed to save task.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(task: TaskResponse) {
    const ok = window.confirm(`Delete "${task.title}"?`);
    if (!ok) return;
    setActionError(null);
    try {
      await deleteTask(task.id);
      if (editingTask?.id === task.id) resetForm();
      setPreviewOpenIds((prev) => prev.filter((id) => id !== task.id));
      await tasksQuery.refetch();
    } catch (e: any) {
      setActionError(e?.message ?? "Failed to delete task.");
    }
  }

  const tasks = tasksQuery.data?.content ?? [];
  const totalElements = tasksQuery.data?.totalElements ?? 0;
  const totalPages = Math.max(1, tasksQuery.data?.totalPages ?? 1);

  return (
    <section className="space-y-6 rounded-2xl border bg-card/70 p-6 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Task builder</p>
          <h2 className="text-2xl font-semibold text-foreground">Manage tasks</h2>
        </div>
      </div>

      <TaskEditor
        editingTask={editingTask}
        title={title}
        setTitle={setTitle}
        status={status}
        setStatus={setStatus}
        type={type}
        setType={setType}
        flashDirection={flashDirection}
        setFlashDirection={setFlashDirection}
        flashShuffle={flashShuffle}
        setFlashShuffle={setFlashShuffle}
        matchDirection={matchDirection}
        setMatchDirection={setMatchDirection}
        matchShuffle={matchShuffle}
        setMatchShuffle={setMatchShuffle}
        mcqDirection={mcqDirection}
        setMcqDirection={setMcqDirection}
        mcqOptionsCount={mcqOptionsCount}
        setMcqOptionsCount={setMcqOptionsCount}
        mcqShuffle={mcqShuffle}
        setMcqShuffle={setMcqShuffle}
        typingDirection={typingDirection}
        setTypingDirection={setTypingDirection}
        typingCaseSensitive={typingCaseSensitive}
        setTypingCaseSensitive={setTypingCaseSensitive}
        typingTrimWhitespace={typingTrimWhitespace}
        setTypingTrimWhitespace={setTypingTrimWhitespace}
        essayPrompt={essayPrompt}
        setEssayPrompt={setEssayPrompt}
        essayMinWords={essayMinWords}
        setEssayMinWords={setEssayMinWords}
        essayMaxWords={essayMaxWords}
        setEssayMaxWords={setEssayMaxWords}
        essayAttachmentsAllowed={essayAttachmentsAllowed}
        setEssayAttachmentsAllowed={setEssayAttachmentsAllowed}
        readingTitle={readingTitle}
        setReadingTitle={setReadingTitle}
        readingText={readingText}
        setReadingText={setReadingText}
        readingQuestions={readingQuestions}
        setReadingQuestions={setReadingQuestions}
        youtubeUrl={youtubeUrl}
        setYoutubeUrl={setYoutubeUrl}
        youtubeStartHours={youtubeStartHours}
        setYoutubeStartHours={setYoutubeStartHours}
        youtubeStartMinutes={youtubeStartMinutes}
        setYoutubeStartMinutes={setYoutubeStartMinutes}
        youtubeStartSeconds={youtubeStartSeconds}
        setYoutubeStartSeconds={setYoutubeStartSeconds}
        youtubeNotes={youtubeNotes}
        setYoutubeNotes={setYoutubeNotes}
        youtubeQuestions={youtubeQuestions}
        setYoutubeQuestions={setYoutubeQuestions}
        customPayloadJson={customPayloadJson}
        setCustomPayloadJson={setCustomPayloadJson}
        vocabSearch={vocabSearch}
        setVocabSearch={setVocabSearch}
        vocabPage={vocabPage}
        setVocabPage={setVocabPage}
        vocabItems={vocabQuery.data?.content ?? []}
        vocabTotalElements={vocabQuery.data?.totalElements ?? 0}
        vocabTotalPages={Math.max(1, vocabQuery.data?.totalPages ?? 1)}
        selectedVocabIds={selectedVocabIds}
        toggleVocabId={toggleVocabId}
        saving={saving}
        onSave={handleSave}
        onCancel={resetForm}
      />

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Entries</p>
            <h3 className="text-xl font-semibold text-foreground">All tasks</h3>
          </div>
          <TaskFilters
            search={taskSearch}
            setSearch={setTaskSearch}
            type={taskType}
            setType={setTaskType}
            status={taskStatus}
            setStatus={setTaskStatus}
          />
          {tasksQuery.data && <p className="text-xs text-muted-foreground">{totalElements} items</p>}
        </div>
        <TaskList
          tasks={tasks}
          totalPages={totalPages}
          page={taskPage}
          onPrev={() => setTaskPage((p) => Math.max(0, p - 1))}
          onNext={() => setTaskPage((p) => p + 1)}
          onEdit={loadFromTask}
          onDelete={handleDelete}
          previewOpenIds={previewOpenIds}
          setPreviewOpenIds={setPreviewOpenIds}
          loading={tasksQuery.isLoading}
          error={tasksQuery.error ? String(tasksQuery.error) : null}
        />
      </div>
    </section>
  );
}
