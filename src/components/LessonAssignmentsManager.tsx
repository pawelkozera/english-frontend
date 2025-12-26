import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LessonAssignmentResponse, MemberResponse } from "../api/types";
import { listMyLessons } from "../api/lessonsApi";
import {
  assignLessonToGroupOrUser,
  listGroupLessonAssignmentsPaged,
  reorderGroupLessonAssignments,
  unassignLesson,
  updateLessonAssignment,
} from "../api/lessonAssignmentsApi";
import useDebouncedValue from "../lib/useDebouncedValue";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const LESSON_PAGE_SIZE = 10;
const ASSIGNMENTS_PAGE_SIZE = 10;

type LessonAssignmentsManagerProps = {
  groupId: number;
  members: MemberResponse[];
};

export default function LessonAssignmentsManager({ groupId, members }: LessonAssignmentsManagerProps) {
  const [lessonSearch, setLessonSearch] = useState("");
  const [lessonPage, setLessonPage] = useState(0);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [assignTarget, setAssignTarget] = useState<string>("GROUP");
  const [visibleFromDate, setVisibleFromDate] = useState("");
  const [visibleFromTime, setVisibleFromTime] = useState("");
  const [visibleToDate, setVisibleToDate] = useState("");
  const [visibleToTime, setVisibleToTime] = useState("");
  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);
  const [editVisibleFromDate, setEditVisibleFromDate] = useState("");
  const [editVisibleFromTime, setEditVisibleFromTime] = useState("");
  const [editVisibleToDate, setEditVisibleToDate] = useState("");
  const [editVisibleToTime, setEditVisibleToTime] = useState("");

  const [viewTarget, setViewTarget] = useState<string>("GROUP");
  const [assignmentsPage, setAssignmentsPage] = useState(0);

  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [dragAssignmentId, setDragAssignmentId] = useState<number | null>(null);
  const [localAssignments, setLocalAssignments] = useState<LessonAssignmentResponse[]>([]);

  const debouncedLessonSearch = useDebouncedValue(lessonSearch, 300);

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

  const viewUserId = useMemo(() => {
    if (viewTarget === "GROUP") return undefined;
    const parsed = Number(viewTarget);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [viewTarget]);

  const assignmentsQuery = useQuery({
    queryKey: ["lessonAssignments", groupId, viewUserId ?? "GROUP", assignmentsPage, ASSIGNMENTS_PAGE_SIZE],
    queryFn: () =>
      listGroupLessonAssignmentsPaged({
        groupId,
        userId: viewUserId,
        page: assignmentsPage,
        size: ASSIGNMENTS_PAGE_SIZE,
      }),
  });

  useEffect(() => {
    setLessonPage(0);
  }, [includeArchived, debouncedLessonSearch]);

  useEffect(() => {
    setAssignmentsPage(0);
  }, [viewTarget, groupId]);

  useEffect(() => {
    if (!assignmentsQuery.data) return;
    setLocalAssignments(assignmentsQuery.data.content);
  }, [assignmentsQuery.data]);

  const lessons = lessonsQuery.data?.content ?? [];
  const totalLessonPages = Math.max(1, lessonsQuery.data?.totalPages ?? 1);
  const totalAssignmentPages = Math.max(1, assignmentsQuery.data?.totalPages ?? 1);

  function pad2(value: number) {
    return value.toString().padStart(2, "0");
  }

  function toDateLocal(value?: string | null) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function toTimeLocal(value?: string | null) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  function toDateTime(dateValue: string, timeValue: string, fallbackTime: string) {
    if (!dateValue) return null;
    const time = timeValue || fallbackTime;
    const dt = new Date(`${dateValue}T${time}`);
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  }

  async function handleAssign() {
    setActionError(null);
    if (!selectedLessonId) {
      setActionError("Select a lesson to assign.");
      return;
    }

    const targetUserId = assignTarget === "GROUP" ? null : Number(assignTarget);
    if (assignTarget !== "GROUP" && !Number.isFinite(targetUserId)) {
      setActionError("Select a valid student.");
      return;
    }

    const fromDt = toDateTime(visibleFromDate, visibleFromTime, "00:01");
    const toDt = toDateTime(visibleToDate, visibleToTime, "23:59");
    if (fromDt && toDt && fromDt > toDt) {
      setActionError("Visible from must be earlier than visible to.");
      return;
    }

    setSaving(true);
    try {
      await assignLessonToGroupOrUser(groupId, selectedLessonId, {
        assignedToUserId: targetUserId,
        visibleFrom: fromDt ? fromDt.toISOString() : null,
        visibleTo: toDt ? toDt.toISOString() : null,
      });
      setVisibleFromDate("");
      setVisibleFromTime("");
      setVisibleToDate("");
      setVisibleToTime("");
      await assignmentsQuery.refetch();
    } catch (e: any) {
      setActionError(e?.message ?? "Failed to assign lesson.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnassign(assignment: LessonAssignmentResponse) {
    const ok = window.confirm(`Unassign "${assignment.lessonTitle}"?`);
    if (!ok) return;
    setActionError(null);
    try {
      await unassignLesson(groupId, assignment.id);
      await assignmentsQuery.refetch();
    } catch (e: any) {
      setActionError(e?.message ?? "Failed to unassign lesson.");
    }
  }

  async function handleSaveDates(assignment: LessonAssignmentResponse) {
    setActionError(null);
    const fromDt = toDateTime(editVisibleFromDate, editVisibleFromTime, "00:01");
    const toDt = toDateTime(editVisibleToDate, editVisibleToTime, "23:59");
    if (fromDt && toDt && fromDt > toDt) {
      setActionError("Visible from must be earlier than visible to.");
      return;
    }

    try {
      await updateLessonAssignment(groupId, assignment.id, {
        visibleFrom: fromDt ? fromDt.toISOString() : null,
        visibleTo: toDt ? toDt.toISOString() : null,
      });
      setEditingAssignmentId(null);
      setEditVisibleFromDate("");
      setEditVisibleFromTime("");
      setEditVisibleToDate("");
      setEditVisibleToTime("");
      await assignmentsQuery.refetch();
    } catch (e: any) {
      setActionError(e?.message ?? "Failed to update dates.");
    }
  }

  async function handleReorder(nextAssignments: LessonAssignmentResponse[]) {
    const assignmentIds = nextAssignments.map((item) => item.id);
    setReordering(true);
    try {
      await reorderGroupLessonAssignments(groupId, {
        userId: viewUserId ?? null,
        assignmentIds,
      });
      await assignmentsQuery.refetch();
    } catch (e: any) {
      setActionError(e?.message ?? "Failed to reorder assignments.");
      await assignmentsQuery.refetch();
    } finally {
      setReordering(false);
    }
  }

  function handleDropAssignment(targetId: number) {
    if (dragAssignmentId == null || dragAssignmentId === targetId) return;
    const from = localAssignments.findIndex((item) => item.id === dragAssignmentId);
    const to = localAssignments.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...localAssignments];
    [next[from], next[to]] = [next[to], next[from]];
    setLocalAssignments(next);
    setDragAssignmentId(null);
    void handleReorder(next);
  }

  function renderAssignmentTile(assignment: LessonAssignmentResponse) {
    const isEditing = editingAssignmentId === assignment.id;
    const assignedTo =
      assignment.assignedToUserId == null
        ? "Group-wide"
        : members.find((m) => m.userId === assignment.assignedToUserId)?.email ?? `User #${assignment.assignedToUserId}`;

    return (
      <li
        key={assignment.id}
        className={`rounded-xl border bg-background/70 p-4 text-sm ${
          dragAssignmentId === assignment.id ? "opacity-60" : ""
        }`}
        draggable={!reordering && !isEditing}
        onDragStart={() => setDragAssignmentId(assignment.id)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => handleDropAssignment(assignment.id)}
        onDragEnd={() => setDragAssignmentId(null)}
      >
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-base font-semibold text-foreground">{assignment.lessonTitle}</p>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{assignment.lessonStatus}</p>
            <p className="text-xs text-muted-foreground">Assigned to: {assignedTo}</p>
            {(assignment.visibleFrom || assignment.visibleTo) && (
              <p className="text-xs text-muted-foreground">
                {assignment.visibleFrom ? `From ${new Date(assignment.visibleFrom).toLocaleString()}` : "Visible now"}
                {assignment.visibleTo ? ` · Until ${new Date(assignment.visibleTo).toLocaleString()}` : ""}
              </p>
            )}
          </div>
          {isEditing && (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Visible from</p>
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="date"
                    value={editVisibleFromDate}
                    onChange={(e) => setEditVisibleFromDate(e.target.value)}
                  />
                  <Input
                    type="time"
                    step="3600"
                    value={editVisibleFromTime}
                    onChange={(e) => setEditVisibleFromTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Visible to</p>
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="date"
                    value={editVisibleToDate}
                    onChange={(e) => setEditVisibleToDate(e.target.value)}
                  />
                  <Input
                    type="time"
                    step="3600"
                    value={editVisibleToTime}
                    onChange={(e) => setEditVisibleToTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="ghost" onClick={() => handleSaveDates(assignment)}>
                  Save dates
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditingAssignmentId(null);
                    setEditVisibleFromDate("");
                    setEditVisibleFromTime("");
                    setEditVisibleToDate("");
                    setEditVisibleToTime("");
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditingAssignmentId(assignment.id);
                    setEditVisibleFromDate(toDateLocal(assignment.visibleFrom));
                    setEditVisibleFromTime(toTimeLocal(assignment.visibleFrom));
                    setEditVisibleToDate(toDateLocal(assignment.visibleTo));
                    setEditVisibleToTime(toTimeLocal(assignment.visibleTo));
                  }}
                >
                  Edit dates
                </Button>
                <Button variant="ghost" onClick={() => handleUnassign(assignment)}>
                  Unassign
                </Button>
              </>
            )}
          </div>
        </div>
      </li>
    );
  }

  return (
    <section className="space-y-6 rounded-2xl border bg-card/70 p-6 shadow-sm backdrop-blur">
      <div>
        <p className="text-sm text-muted-foreground">Lesson assignments</p>
        <h2 className="text-2xl font-semibold text-foreground">Assign lessons</h2>
      </div>

      <div className="rounded-2xl border bg-background/70 p-5">
        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Lesson library</p>
              <h3 className="text-lg font-semibold text-foreground">Pick a lesson</h3>
            </div>
            <Input
              placeholder="Search lessons..."
              value={lessonSearch}
              onChange={(e) => setLessonSearch(e.target.value)}
              className="w-full max-w-sm"
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
              />
              <span>Include archived</span>
            </div>
            {lessonsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading lessons...</p>}
            {lessonsQuery.error && <p className="text-sm text-destructive">{String(lessonsQuery.error)}</p>}
            {lessonsQuery.data && (
              <>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedLessonId ?? ""}
                  onChange={(e) => setSelectedLessonId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Select a lesson</option>
                  {lessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title} ({lesson.status})
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>
                    Page {lessonsQuery.data.number + 1} / {totalLessonPages}
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
                      disabled={lessonsQuery.data.number + 1 >= totalLessonPages}
                      onClick={() => setLessonPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Assignment target</p>
              <h3 className="text-lg font-semibold text-foreground">Who gets this lesson?</h3>
            </div>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={assignTarget}
              onChange={(e) => setAssignTarget(e.target.value)}
            >
              <option value="GROUP">Whole group</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.email} ({member.role})
                </option>
              ))}
            </select>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Visible from</p>
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="date"
                    value={visibleFromDate}
                    onChange={(e) => setVisibleFromDate(e.target.value)}
                  />
                  <Input
                    type="time"
                    step="3600"
                    value={visibleFromTime}
                    onChange={(e) => setVisibleFromTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Visible to</p>
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="date"
                    value={visibleToDate}
                    onChange={(e) => setVisibleToDate(e.target.value)}
                  />
                  <Input
                    type="time"
                    step="3600"
                    value={visibleToTime}
                    onChange={(e) => setVisibleToTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setVisibleFromDate("");
                setVisibleFromTime("");
                setVisibleToDate("");
                setVisibleToTime("");
              }}
            >
              Clear dates
            </Button>
            <Button onClick={handleAssign} disabled={saving}>
              Assign lesson
            </Button>
            {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Assignments</p>
            <h3 className="text-xl font-semibold text-foreground">Current assignments</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Drag & drop tiles to change the order students see.
            </p>
          </div>
          <select
            className="h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm"
            value={viewTarget}
            onChange={(e) => setViewTarget(e.target.value)}
          >
            <option value="GROUP">Group-wide</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.email} ({member.role})
              </option>
            ))}
          </select>
        </div>

        {assignmentsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading assignments...</p>}
        {assignmentsQuery.error && <p className="text-sm text-destructive">{String(assignmentsQuery.error)}</p>}
        {assignmentsQuery.data && (
          <>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {localAssignments.map(renderAssignmentTile)}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                Page {assignmentsQuery.data.number + 1} / {totalAssignmentPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  disabled={assignmentsQuery.data.number <= 0}
                  onClick={() => setAssignmentsPage((p) => Math.max(0, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  variant="ghost"
                  disabled={assignmentsQuery.data.number + 1 >= totalAssignmentPages}
                  onClick={() => setAssignmentsPage((p) => p + 1)}
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
