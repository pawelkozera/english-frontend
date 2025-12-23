import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createTask,
  deleteTask,
  replaceTaskVocabulary,
  searchTasks,
  updateTask,
} from "../api/tasksApi";
import type { TaskResponse, TaskStatus, TaskType } from "../api/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const TASK_PAGE_SIZE = 10;
const TASK_TYPES: TaskType[] = [
  "VOCAB_FLASHCARDS",
  "VOCAB_MATCHING",
  "VOCAB_MCQ",
  "VOCAB_TYPING",
  "ESSAY",
  "READING_TEXT",
  "YOUTUBE_VIDEO",
  "CUSTOM",
];
const TASK_STATUSES: TaskStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

function parseIdList(raw: string): number[] {
  if (!raw.trim()) return [];
  return raw
    .split(/[,\s]+/)
    .map((part) => Number(part))
    .filter((num) => Number.isFinite(num) && num > 0);
}

export default function TaskManager() {
  const [taskSearch, setTaskSearch] = useState("");
  const [taskType, setTaskType] = useState<TaskType | "ALL">("ALL");
  const [taskStatus, setTaskStatus] = useState<TaskStatus | "ALL">("ALL");
  const [taskPage, setTaskPage] = useState(0);
  const [editingTask, setEditingTask] = useState<TaskResponse | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("DRAFT");
  const [type, setType] = useState<TaskType>("VOCAB_FLASHCARDS");
  const [payloadText, setPayloadText] = useState("");
  const [vocabularyIdsText, setVocabularyIdsText] = useState("");
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

  useEffect(() => {
    setTaskPage(0);
  }, [taskSearch, taskType, taskStatus]);

  const hasEdits = useMemo(() => Boolean(editingTask), [editingTask]);

  function resetForm() {
    setEditingTask(null);
    setTitle("");
    setStatus("DRAFT");
    setType("VOCAB_FLASHCARDS");
    setPayloadText("");
    setVocabularyIdsText("");
  }

  return (
    <section className="space-y-6 rounded-2xl border bg-card/70 p-6 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Task library</p>
          <h2 className="text-2xl font-semibold text-foreground">Manage tasks</h2>
        </div>
        <Input
          placeholder="Search tasks..."
          value={taskSearch}
          onChange={(e) => setTaskSearch(e.target.value)}
          className="w-full max-w-xs"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Type</p>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={taskType}
            onChange={(e) => setTaskType(e.target.value as TaskType | "ALL")}
          >
            <option value="ALL">All types</option>
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
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

      <div className="rounded-2xl border bg-background/70 p-5">
        <h3 className="text-lg font-semibold text-foreground">{hasEdits ? "Edit task" : "Create task"}</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as TaskType)}
              disabled={hasEdits}
            >
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
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

        <div className="mt-4 grid gap-3">
          <Input
            placeholder="Vocabulary IDs (comma-separated)"
            value={vocabularyIdsText}
            onChange={(e) => setVocabularyIdsText(e.target.value)}
          />
          <textarea
            className="min-h-[140px] w-full rounded-md border border-input bg-background p-3 text-sm"
            placeholder="Payload JSON (optional)"
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            disabled={saving}
            onClick={async () => {
              setActionError(null);
              if (!title.trim()) {
                setActionError("Title is required.");
                return;
              }

              setSaving(true);
              try {
                let payload: Record<string, unknown> | undefined;
                if (payloadText.trim()) {
                  try {
                    payload = JSON.parse(payloadText);
                  } catch {
                    setActionError("Payload must be valid JSON.");
                    setSaving(false);
                    return;
                  }
                }

                const vocabIds = parseIdList(vocabularyIdsText);

                if (editingTask) {
                  await updateTask(editingTask.id, {
                    title: title.trim(),
                    status,
                    payload,
                  });

                  const currentIds = editingTask.vocabularyIds ?? [];
                  const same =
                    currentIds.length === vocabIds.length &&
                    currentIds.every((id) => vocabIds.includes(id));
                  if (!same) {
                    await replaceTaskVocabulary(editingTask.id, { vocabularyIds: vocabIds });
                  }
                } else {
                  await createTask({
                    title: title.trim(),
                    type,
                    status,
                    payload,
                    vocabularyIds: vocabIds.length ? vocabIds : undefined,
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
            {hasEdits ? "Save changes" : "Create task"}
          </Button>
          {hasEdits && (
            <Button variant="ghost" disabled={saving} onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <div className="space-y-4">
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
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{task.type}</p>
                      <p className="text-xs text-muted-foreground">Status: {task.status}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingTask(task);
                          setTitle(task.title);
                          setStatus(task.status);
                          setType(task.type);
                          setPayloadText(task.payload ? JSON.stringify(task.payload, null, 2) : "");
                          setVocabularyIdsText(task.vocabularyIds?.join(", ") ?? "");
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
