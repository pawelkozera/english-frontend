import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TaskResponse } from "../api/types";
import { getMyLessonProgress } from "../api/lessonProgressApi";
import { getLesson } from "../api/lessonsApi";
import { getTask } from "../api/tasksApi";
import { myGroups } from "../api/groupsApi";
import { logout } from "../api/authApi";
import { Button } from "../components/ui/button";
import MainMenu from "../components/MainMenu";

export default function LessonTasksPage() {
  const nav = useNavigate();
  const params = useParams();
  const assignmentId = Number(params.assignmentId);
  const qc = useQueryClient();

  const [activeSection, setActiveSection] = useState<
    "overview" | "lessons" | "groups" | "library" | "assignments"
  >("lessons");
  const [groupsTab, setGroupsTab] = useState<"manage" | "management">("manage");
  const [libraryTab, setLibraryTab] = useState<"vocab" | "tasks" | "lessons">("vocab");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

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

  const [taskLookup, setTaskLookup] = useState<Record<number, TaskResponse>>({});

  const progressQuery = useQuery({
    queryKey: ["lessonProgress", "page", assignmentId],
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

  const tasksQuery = useQuery({
    queryKey: ["lessonTasks", taskIds],
    queryFn: () => Promise.all(taskIds.map((taskId) => getTask(taskId))),
    enabled: taskIds.length > 0,
  });

  useEffect(() => {
    if (!tasksQuery.data) return;
    setTaskLookup((prev) => {
      const next = { ...prev };
      tasksQuery.data.forEach((task) => {
        next[task.id] = task;
      });
      return next;
    });
  }, [tasksQuery.data]);

  const completedTaskIds = progressQuery.data?.completedTaskIds ?? [];

  if (!Number.isFinite(assignmentId)) {
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
            Invalid lesson assignment.
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
          isTeacher={isTeacher}
        />

        <div className="rounded-2xl border bg-card/70 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Lesson tasks</p>
              <h2 className="text-2xl font-semibold text-foreground">{lesson?.title ?? "Lesson"}</h2>
              {lesson?.description && <p className="text-sm text-muted-foreground">{lesson.description}</p>}
            </div>
            <Button variant="ghost" onClick={() => nav("/app?tab=lessons")}>
              Back to lessons
            </Button>
          </div>

          {progressQuery.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading progress...</p>}
          {progressQuery.error && (
            <p className="mt-4 text-sm text-destructive">{String(progressQuery.error)}</p>
          )}

          {lessonQuery.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading lesson...</p>}
          {lessonQuery.error && (
            <p className="mt-4 text-sm text-destructive">{String(lessonQuery.error)}</p>
          )}

          {taskIds.length === 0 && !lessonQuery.isLoading && (
            <p className="mt-4 text-sm text-muted-foreground">No tasks in this lesson yet.</p>
          )}

          {taskIds.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tasks</p>
              <ul className="space-y-2">
                {taskIds.map((taskId) => {
                  const task = taskLookup[taskId];
                  const completed = completedTaskIds.includes(taskId);
                  return (
                    <li key={taskId}>
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/70 px-3 py-2 text-left text-sm">
                        <div>
                          <p className="font-medium text-foreground">{task?.title ?? `Task #${taskId}`}</p>
                          <p className={`text-xs ${completed ? "text-emerald-600" : "text-muted-foreground"}`}>
                            {completed ? "Done" : "Not done"}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => nav(`/app/lessons/${assignmentId}/tasks/${taskId}`)}
                        >
                          Open task
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
