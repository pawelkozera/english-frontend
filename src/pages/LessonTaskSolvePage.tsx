import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { completeLesson, completeLessonTask, getMyLessonProgress } from "../api/lessonProgressApi";
import { getLesson } from "../api/lessonsApi";
import { getTask } from "../api/tasksApi";
import { myGroups } from "../api/groupsApi";
import { logout } from "../api/authApi";
import { getMyTaskAnswer, submitTaskAnswer } from "../api/lessonAnswersApi";
import MainMenu from "../components/MainMenu";
import TaskRunner from "../components/TaskRunner";
import { Button } from "../components/ui/button";

export default function LessonTaskSolvePage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const params = useParams();
  const assignmentId = Number(params.assignmentId);
  const taskId = Number(params.taskId);

  const [activeSection, setActiveSection] = useState<
    "overview" | "lessons" | "groups" | "library" | "assignments"
  >("lessons");
  const [groupsTab, setGroupsTab] = useState<"manage" | "management">("manage");
  const [libraryTab, setLibraryTab] = useState<"vocab" | "tasks" | "lessons">("vocab");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [initialAnswer, setInitialAnswer] = useState<unknown | null>(null);
  const [answerDirty, setAnswerDirty] = useState(false);
  const lastAppliedAnswerKey = useRef<string | null>(null);

  function toAnswerKey(value: unknown) {
    if (value == null) return "null";
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  const groupsQuery = useQuery({
    queryKey: ["groups"],
    queryFn: myGroups,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const groups = groupsQuery.data ?? [];
  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );
  const isTeacher = selectedGroup?.myRole === "TEACHER";

  useEffect(() => {
    const saved = localStorage.getItem("activeGroupId");
    if (saved) {
      const parsed = Number(saved);
      if (!Number.isNaN(parsed)) {
        setSelectedGroupId(parsed);
      }
    }
  }, []);

  useEffect(() => {
    if (!groups.length) {
      setSelectedGroupId(null);
      return;
    }
    if (!selectedGroupId) {
      setSelectedGroupId(groups[0].id);
      return;
    }
    const exists = groups.some((g) => g.id === selectedGroupId);
    if (!exists) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  useEffect(() => {
    if (!selectedGroupId) return;
    localStorage.setItem("activeGroupId", String(selectedGroupId));
  }, [selectedGroupId]);

  const progressQuery = useQuery({
    queryKey: ["lessonProgress", "solve", assignmentId],
    queryFn: () => getMyLessonProgress(assignmentId),
    enabled: Number.isFinite(assignmentId),
  });

  const lessonId = progressQuery.data?.lessonId ?? null;

  const lessonQuery = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => getLesson(lessonId as number),
    enabled: !!lessonId,
  });

  const lesson = lessonQuery.data ?? null;

  const taskIds = useMemo(() => {
    if (!lesson?.items?.length) return [];
    return [...lesson.items]
      .sort((a, b) => a.position - b.position)
      .map((item) => item.taskId)
      .filter((id): id is number => typeof id === "number");
  }, [lesson]);

  const taskQuery = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => getTask(taskId),
    enabled: Number.isFinite(taskId),
  });

  const task = taskQuery.data ?? null;
  const requiresSubmit =
    task?.type === "ESSAY" ||
    task?.type === "READING_TEXT" ||
    task?.type === "YOUTUBE_VIDEO" ||
    task?.type === "CUSTOM";
  const completedTaskIds = progressQuery.data?.completedTaskIds ?? [];
  const isCompleted = completedTaskIds.includes(taskId);
  const taskIndex = taskIds.indexOf(taskId);
  const isLast = taskIndex >= 0 && taskIndex === taskIds.length - 1;
  const nextTaskId = taskIndex >= 0 && taskIndex + 1 < taskIds.length ? taskIds[taskIndex + 1] : null;
  useEffect(() => {
    setInitialAnswer(null);
    setAnswerDirty(false);
    lastAppliedAnswerKey.current = null;
  }, [assignmentId, taskId]);

  const answerQuery = useQuery({
    queryKey: ["lessonAnswer", assignmentId, taskId],
    queryFn: () => getMyTaskAnswer(assignmentId, taskId),
    enabled: Number.isFinite(assignmentId) && Number.isFinite(taskId) && !!requiresSubmit,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (!requiresSubmit) return;
    if (!answerQuery.data) return;
    if (answerDirty) return;
    const raw = (answerQuery.data as any)?.answer ?? (answerQuery.data as any)?.payload ?? null;
    const normalized =
      raw && typeof raw === "object" && "answer" in (raw as Record<string, unknown>)
        ? (raw as Record<string, unknown>).answer
        : raw;
    const key = toAnswerKey(normalized);
    if (lastAppliedAnswerKey.current === key) return;
    lastAppliedAnswerKey.current = key;
    if (typeof normalized === "string") {
      try {
        setInitialAnswer(JSON.parse(normalized));
      } catch {
        setInitialAnswer(normalized);
      }
    } else {
      setInitialAnswer(normalized ?? null);
    }
  }, [answerDirty, answerQuery.data, requiresSubmit]);

  async function handleComplete() {
    if (!Number.isFinite(assignmentId) || !Number.isFinite(taskId)) return;
    if (isCompleted) return;
    setActionError(null);
    setCompleting(true);
    try {
      const updated = await completeLessonTask(assignmentId, taskId);
      await progressQuery.refetch();
      if (updated.totalCount > 0 && updated.doneCount >= updated.totalCount) {
        await completeLesson(assignmentId);
        await progressQuery.refetch();
      }
    } catch (e: any) {
      setActionError(e?.message ?? "Failed to mark task as completed.");
    } finally {
      setCompleting(false);
    }
  }

  async function handleSubmitAnswer(answer: unknown) {
    if (!Number.isFinite(assignmentId) || !Number.isFinite(taskId)) return;
    setActionError(null);
    setCompleting(true);
    try {
      let payload = answer;
      if (task?.type === "CUSTOM" && typeof answer === "string") {
        try {
          payload = JSON.parse(answer);
        } catch {
          payload = answer;
        }
      }
      const saved = await submitTaskAnswer(assignmentId, taskId, { answer: payload });
      qc.setQueryData(["lessonAnswer", assignmentId, taskId], saved);
      setInitialAnswer(payload ?? null);
      setAnswerDirty(false);
      lastAppliedAnswerKey.current = toAnswerKey(payload);
      const updated = await completeLessonTask(assignmentId, taskId);
      await progressQuery.refetch();
      if (updated.totalCount > 0 && updated.doneCount >= updated.totalCount) {
        await completeLesson(assignmentId);
        await progressQuery.refetch();
      }
    } catch (e: any) {
      setActionError(e?.message ?? "Failed to submit answer.");
    } finally {
      setCompleting(false);
    }
  }

  if (!Number.isFinite(assignmentId) || !Number.isFinite(taskId)) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(248,237,225,0.9),_rgba(254,254,255,0.7)_45%,_rgba(235,240,255,0.7)_70%)] px-6 pb-16">
        <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 pt-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">English hub</p>
            <h1 className="text-2xl font-semibold text-foreground">Main space</h1>
          </div>

          <Button
            variant="secondary"
            onClick={async () => {
              await logout();
              qc.clear();
              nav("/login", { replace: true });
            }}
          >
            Logout
          </Button>
        </header>

        <div className="mx-auto mt-8 w-full max-w-6xl space-y-6">
          <div className="w-full max-w-md">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Active group</p>
            <div className="mt-2 flex items-center gap-2 rounded-2xl border bg-background/80 px-4 py-3 text-sm shadow-sm">
              <span className="text-muted-foreground">Group</span>
              <select
                className="w-full bg-transparent text-sm font-medium text-foreground outline-none"
                value={selectedGroupId ?? ""}
                onChange={(e) => setSelectedGroupId(e.target.value ? Number(e.target.value) : null)}
                disabled={!groups.length}
              >
                {!groups.length && <option value="">No groups yet</option>}
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <MainMenu
            activeSection={activeSection}
            onSectionChange={(value) => {
              setActiveSection(value);
              if (value === "overview") nav("/app?tab=overview");
              if (value === "groups") nav("/app?tab=groups");
              if (value === "lessons") nav("/app?tab=lessons");
              if (value === "library") nav("/app?tab=vocab");
              if (value === "assignments") nav("/app?tab=lesson-assignments");
            }}
            groupsTab={groupsTab}
            onGroupsTabChange={(value) => {
              setGroupsTab(value);
              nav(value === "manage" ? "/app?tab=groups" : "/app?tab=group");
            }}
            libraryTab={libraryTab}
            onLibraryTabChange={(value) => {
              setLibraryTab(value);
              if (value === "vocab") nav("/app?tab=vocab");
              if (value === "tasks") nav("/app?tab=tasks");
              if (value === "lessons") nav("/app?tab=library-lessons");
            }}
            isTeacher={!!isTeacher}
          />

          <div className="rounded-2xl border bg-card/70 p-6 text-sm text-muted-foreground shadow-sm backdrop-blur">
            Invalid task link.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(248,237,225,0.9),_rgba(254,254,255,0.7)_45%,_rgba(235,240,255,0.7)_70%)] px-6 pb-16">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 pt-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">English hub</p>
          <h1 className="text-2xl font-semibold text-foreground">Main space</h1>
        </div>

        <Button
          variant="secondary"
          onClick={async () => {
            await logout();
            qc.clear();
            nav("/login", { replace: true });
          }}
        >
          Logout
        </Button>
      </header>

      <div className="mx-auto mt-8 w-full max-w-6xl space-y-6">
        <div className="w-full max-w-md">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Active group</p>
          <div className="mt-2 flex items-center gap-2 rounded-2xl border bg-background/80 px-4 py-3 text-sm shadow-sm">
            <span className="text-muted-foreground">Group</span>
            <select
              className="w-full bg-transparent text-sm font-medium text-foreground outline-none"
              value={selectedGroupId ?? ""}
              onChange={(e) => setSelectedGroupId(e.target.value ? Number(e.target.value) : null)}
              disabled={!groups.length}
            >
              {!groups.length && <option value="">No groups yet</option>}
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <MainMenu
          activeSection={activeSection}
          onSectionChange={(value) => {
            setActiveSection(value);
            if (value === "overview") nav("/app?tab=overview");
            if (value === "groups") nav("/app?tab=groups");
            if (value === "lessons") nav("/app?tab=lessons");
            if (value === "library") nav("/app?tab=vocab");
            if (value === "assignments") nav("/app?tab=lesson-assignments");
          }}
          groupsTab={groupsTab}
          onGroupsTabChange={(value) => {
            setGroupsTab(value);
            nav(value === "manage" ? "/app?tab=groups" : "/app?tab=group");
          }}
          libraryTab={libraryTab}
          onLibraryTabChange={(value) => {
            setLibraryTab(value);
            if (value === "vocab") nav("/app?tab=vocab");
            if (value === "tasks") nav("/app?tab=tasks");
            if (value === "lessons") nav("/app?tab=library-lessons");
          }}
          isTeacher={!!isTeacher}
        />

        <div className="rounded-2xl border bg-card/70 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Solve task</p>
              <h2 className="text-2xl font-semibold text-foreground">
                {task?.title ?? `Task #${taskId}`}
              </h2>
              {lesson?.title && <p className="text-sm text-muted-foreground">{lesson.title}</p>}
            </div>
            <Button variant="ghost" onClick={() => nav(`/app/lessons/${assignmentId}`)}>
              Back to task list
            </Button>
          </div>

          {progressQuery.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading progress...</p>}
          {progressQuery.error && (
            <p className="mt-4 text-sm text-destructive">{String(progressQuery.error)}</p>
          )}

          {lessonQuery.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading lesson...</p>}
          {lessonQuery.error && <p className="mt-4 text-sm text-destructive">{String(lessonQuery.error)}</p>}

          {taskQuery.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading task...</p>}
          {taskQuery.error && <p className="mt-4 text-sm text-destructive">{String(taskQuery.error)}</p>}

          {task && (
            <>
              <TaskRunner
                task={task}
                onComplete={handleComplete}
                completed={isCompleted}
                initialAnswer={initialAnswer}
                seedKey={(() => {
                  if (initialAnswer == null) return null;
                  try {
                    return JSON.stringify(initialAnswer);
                  } catch {
                    return String(initialAnswer);
                  }
                })()}
                onAnswerChange={() => setAnswerDirty(true)}
                onSubmitAnswer={handleSubmitAnswer}
              />

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {isCompleted && nextTaskId != null && (
                  <Button
                    variant="secondary"
                    onClick={() => nav(`/app/lessons/${assignmentId}/tasks/${nextTaskId}`)}
                  >
                    Next task
                  </Button>
                )}
              </div>

              {isCompleted && isLast && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-semibold text-emerald-600">Lesson completed.</p>
                  <Button variant="secondary" onClick={() => nav("/app?tab=lessons")}>
                    Back to lessons
                  </Button>
                </div>
              )}

              {actionError && <p className="mt-2 text-sm text-destructive">{actionError}</p>}
              {!isCompleted && completing && (
                <p className="mt-2 text-sm text-muted-foreground">Saving progress...</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
