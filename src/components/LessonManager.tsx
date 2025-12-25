import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LessonResponse, LessonStatus, TaskResponse, TaskStatus, TaskType } from "../api/types";
import { archiveLesson, createLesson, listMyLessons, replaceLessonItems, updateLesson } from "../api/lessonsApi";
import { getTask, searchTasks } from "../api/tasksApi";
import useDebouncedValue from "../lib/useDebouncedValue";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { TASK_STATUSES, TASK_TYPES, typeLabel } from "./tasks/editor/taskConstants";

const LESSON_PAGE_SIZE = 8;
const TASK_PAGE_SIZE = 10;

export default function LessonManager() {
  const [lessonPage, setLessonPage] = useState(0);
  const [includeArchived, setIncludeArchived] = useState(false);

  const [editingLesson, setEditingLesson] = useState<LessonResponse | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<LessonStatus>("DRAFT");
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);

  const [taskSearch, setTaskSearch] = useState("");
  const [taskType, setTaskType] = useState<TaskType | "ALL">("ALL");
  const [taskStatus, setTaskStatus] = useState<TaskStatus | "ALL">("ALL");
  const [taskPage, setTaskPage] = useState(0);
  const [taskLookup, setTaskLookup] = useState<Record<number, TaskResponse>>({});
  const [dragTaskId, setDragTaskId] = useState<number | null>(null);
  const [previewOpenLessonIds, setPreviewOpenLessonIds] = useState<number[]>([]);

  const [lessonSearch, setLessonSearch] = useState("");
  const debouncedLessonSearch = useDebouncedValue(lessonSearch, 300);
  const debouncedTaskSearch = useDebouncedValue(taskSearch, 300);

  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const lessonsQuery = useQuery({
    queryKey: ["lessons", includeArchived, debouncedLessonSearch, lessonPage, LESSON_PAGE_SIZE],
    queryFn: () =>
      listMyLessons({
        includeArchived,
        q: debouncedLessonSearch,
        page: lessonPage,
        size: LESSON_PAGE_SIZE,
      }),
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks", debouncedTaskSearch, taskType, taskStatus, taskPage, TASK_PAGE_SIZE],
    queryFn: () =>
      searchTasks({
        q: debouncedTaskSearch,
        type: taskType === "ALL" ? undefined : taskType,
        status: taskStatus === "ALL" ? undefined : taskStatus,
        page: taskPage,
        size: TASK_PAGE_SIZE,
      }),
  });

  useEffect(() => {
    setLessonPage(0);
  }, [includeArchived, debouncedLessonSearch]);

  useEffect(() => {
    setTaskPage(0);
  }, [debouncedTaskSearch, taskType, taskStatus]);

  useEffect(() => {
    if (!tasksQuery.data) return;
    setTaskLookup((prev) => {
      const next = { ...prev };
      tasksQuery.data.content.forEach((task) => {
        next[task.id] = task;
      });
      return next;
    });
  }, [tasksQuery.data]);

  const lessonTaskIds = useMemo(() => {
    const ids = new Set<number>();
    lessonsQuery.data?.content.forEach((lesson) => {
      lesson.items?.forEach((item) => {
        if (typeof item.taskId === "number") ids.add(item.taskId);
      });
    });
    return Array.from(ids);
  }, [lessonsQuery.data]);

  const missingTaskIds = useMemo(() => {
    const ids = new Set<number>();
    selectedTaskIds.forEach((id) => {
      if (!taskLookup[id]) ids.add(id);
    });
    lessonTaskIds.forEach((id) => {
      if (!taskLookup[id]) ids.add(id);
    });
    return Array.from(ids);
  }, [selectedTaskIds, lessonTaskIds, taskLookup]);

  useEffect(() => {
    if (!missingTaskIds.length) return;
    let cancelled = false;
    (async () => {
      for (const taskId of missingTaskIds) {
        try {
          const task = await getTask(taskId);
          if (cancelled) return;
          setTaskLookup((prev) => ({ ...prev, [task.id]: task }));
        } catch {
          if (cancelled) return;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [missingTaskIds]);

  function resetForm() {
    setEditingLesson(null);
    setTitle("");
    setDescription("");
    setStatus("DRAFT");
    setSelectedTaskIds([]);
    setActionError(null);
  }

  function loadFromLesson(lesson: LessonResponse) {
    setEditingLesson(lesson);
    setTitle(lesson.title ?? "");
    setDescription(lesson.description ?? "");
    setStatus(lesson.status ?? "DRAFT");
    const orderedTaskIds = [...(lesson.items ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((item) => item.taskId)
      .filter((id): id is number => typeof id === "number");
    setSelectedTaskIds(orderedTaskIds);
    setActionError(null);
  }

  function toggleTask(taskId: number) {
    setSelectedTaskIds((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]));
  }

  function moveTask(taskId: number, direction: "up" | "down") {
    setSelectedTaskIds((prev) => {
      const idx = prev.indexOf(taskId);
      if (idx < 0) return prev;
      const next = [...prev];
      const targetIndex = direction === "up" ? idx - 1 : idx + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[idx], next[targetIndex]] = [next[targetIndex], next[idx]];
      return next;
    });
  }

  function handleDropTask(targetId: number) {
    if (dragTaskId == null || dragTaskId === targetId) return;
    setSelectedTaskIds((prev) => {
      const from = prev.indexOf(dragTaskId);
      const to = prev.indexOf(targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
    setDragTaskId(null);
  }

  async function handleSave() {
    setActionError(null);
    if (!title.trim()) {
      setActionError("Title is required.");
      return;
    }
    if (!selectedTaskIds.length) {
      setActionError("Select at least one task.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        status,
      };
      const lesson = editingLesson
        ? await updateLesson(editingLesson.id, payload)
        : await createLesson(payload);

      await replaceLessonItems(lesson.id, { taskIds: selectedTaskIds });
      resetForm();
      await lessonsQuery.refetch();
    } catch (e: any) {
      setActionError(e?.message ?? "Failed to save lesson.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(lesson: LessonResponse) {
    const ok = window.confirm(`Archive "${lesson.title}"?`);
    if (!ok) return;
    setActionError(null);
    try {
      await archiveLesson(lesson.id);
      await lessonsQuery.refetch();
    } catch (e: any) {
      setActionError(e?.message ?? "Failed to archive lesson.");
    }
  }

  const lessons = lessonsQuery.data?.content ?? [];
  const lessonsTotalPages = Math.max(1, lessonsQuery.data?.totalPages ?? 1);
  const taskTotalPages = Math.max(1, tasksQuery.data?.totalPages ?? 1);

  function toggleLessonPreview(lessonId: number) {
    setPreviewOpenLessonIds((prev) =>
      prev.includes(lessonId) ? prev.filter((id) => id !== lessonId) : [...prev, lessonId]
    );
  }

  return (
    <section className="space-y-6 rounded-2xl border bg-card/70 p-6 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Lesson builder</p>
          <h2 className="text-2xl font-semibold text-foreground">Manage lessons</h2>
        </div>
      </div>

      <div className="rounded-2xl border bg-background/70 p-5">
        <h3 className="text-lg font-semibold text-foreground">{editingLesson ? "Edit lesson" : "Create lesson"}</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input placeholder="Lesson title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</p>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as LessonStatus)}
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
        <div className="mt-4 space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Description</p>
          <textarea
            className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Optional description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Selected tasks</p>
          {!selectedTaskIds.length && (
            <p className="text-sm text-muted-foreground">No tasks selected yet.</p>
          )}
          {selectedTaskIds.length > 0 && (
            <ul className="space-y-2">
              {selectedTaskIds.map((taskId, idx) => {
                const task = taskLookup[taskId];
                return (
                <li
                  key={taskId}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/70 px-3 py-2 text-sm ${
                    dragTaskId === taskId ? "opacity-60" : ""
                  }`}
                  draggable
                  onDragStart={() => setDragTaskId(taskId)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropTask(taskId)}
                  onDragEnd={() => setDragTaskId(null)}
                >
                    <div>
                      <p className="font-medium text-foreground">{task?.title ?? `Task #${taskId}`}</p>
                      {task && (
                        <p className="text-xs text-muted-foreground">
                          {typeLabel(task.type)} - {task.status}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" disabled={idx === 0} onClick={() => moveTask(taskId, "up")}>
                        Up
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={idx === selectedTaskIds.length - 1}
                        onClick={() => moveTask(taskId, "down")}
                      >
                        Down
                      </Button>
                      <Button variant="ghost" onClick={() => toggleTask(taskId)}>
                        Remove
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-4 rounded-xl border bg-muted/40 p-4">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Task picker</p>
              <h4 className="text-base font-semibold text-foreground">Add tasks to lesson</h4>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
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
          </div>
          <div className="mt-3 space-y-2">
            {tasksQuery.isLoading && <p className="text-sm text-muted-foreground">Loading tasks...</p>}
            {tasksQuery.error && <p className="text-sm text-destructive">{String(tasksQuery.error)}</p>}
            {tasksQuery.data && (
              <ul className="space-y-2">
                {tasksQuery.data.content.map((task) => {
                  const isSelected = selectedTaskIds.includes(task.id);
                  return (
                    <li key={task.id} className="rounded-lg border bg-background/70 px-3 py-2 text-sm">
                      <label className="flex cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={isSelected}
                          onChange={() => toggleTask(task.id)}
                        />
                        <div>
                          <p className="font-medium text-foreground">{task.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {typeLabel(task.type)} - {task.status}
                          </p>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {tasksQuery.data && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                Page {tasksQuery.data.number + 1} / {taskTotalPages}
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
                  disabled={tasksQuery.data.number + 1 >= taskTotalPages}
                  onClick={() => setTaskPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {editingLesson ? "Save changes" : "Create lesson"}
          </Button>
          {editingLesson && (
            <Button variant="ghost" onClick={resetForm} disabled={saving}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex w-full max-w-xs flex-col gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Entries</p>
              <h3 className="text-xl font-semibold text-foreground">All lessons</h3>
            </div>
            <Input
              placeholder="Search lessons..."
              value={lessonSearch}
              onChange={(e) => setLessonSearch(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            Include archived
          </label>
        </div>
        {lessonsQuery.data && (
          <p className="text-xs text-muted-foreground">{lessonsQuery.data.totalElements} items</p>
        )}

        {lessonsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading lessons...</p>}
        {lessonsQuery.error && <p className="text-sm text-destructive">{String(lessonsQuery.error)}</p>}
        {lessonsQuery.data && (
          <>
            <ul className="space-y-3">
              {lessons.map((lesson) => (
                <li key={lesson.id} className="rounded-xl border bg-background/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-foreground">{lesson.title}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{lesson.status}</p>
                      <p className="text-xs text-muted-foreground">Tasks: {lesson.items?.length ?? 0}</p>
                      {lesson.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{lesson.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => toggleLessonPreview(lesson.id)}>
                        {previewOpenLessonIds.includes(lesson.id) ? "Hide preview" : "Preview"}
                      </Button>
                      <Button variant="ghost" onClick={() => loadFromLesson(lesson)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleArchive(lesson)}
                        disabled={lesson.status === "ARCHIVED"}
                      >
                        Archive
                      </Button>
                    </div>
                  </div>
                  {previewOpenLessonIds.includes(lesson.id) && (
                    <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-sm">
                      {lesson.items?.length ? (
                        <ul className="space-y-2">
                          {[...(lesson.items ?? [])]
                            .sort((a, b) => a.position - b.position)
                            .map((item) => {
                              if (typeof item.taskId !== "number") return null;
                              const task = taskLookup[item.taskId];
                              return (
                                <li key={`${lesson.id}-${item.taskId}`} className="flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <p className="font-medium text-foreground">
                                      {task?.title ?? `Task #${item.taskId}`}
                                    </p>
                                    {task && (
                                      <p className="text-xs text-muted-foreground">
                                        {typeLabel(task.type)} - {task.status}
                                      </p>
                                    )}
                                  </div>
                                  <a
                                    className="text-xs text-foreground underline"
                                    href={`/app?tab=tasks&taskId=${item.taskId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Open in new tab
                                  </a>
                                </li>
                              );
                            })}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground">No tasks in this lesson.</p>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                Page {lessonsQuery.data.number + 1} / {lessonsTotalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  disabled={lessonsQuery.data.number <= 0}
                  onClick={() => setLessonPage((p) => Math.max(0, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  variant="ghost"
                  disabled={lessonsQuery.data.number + 1 >= lessonsTotalPages}
                  onClick={() => setLessonPage((p) => p + 1)}
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
