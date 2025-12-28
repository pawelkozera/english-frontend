import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LessonAssignmentResponse, MemberResponse } from "../api/types";
import {
  listMyGroupWideLessonAssignments,
  listMyPersonalLessonAssignments,
  listGroupLessonAssignmentsPaged,
  reorderGroupLessonAssignments,
} from "../api/lessonAssignmentsApi";
import { useAccessToken } from "../lib/auth";
import { Button } from "./ui/button";

type LessonsTab = "group" | "personal";

type LessonsOverviewProps = {
  groupId: number | null;
  isTeacher: boolean;
  members: MemberResponse[];
};

const PAGE_SIZE = 50;

function decodeJwtPayload(token: string | null) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

  try {
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function resolveMemberIdFromToken(token: string | null, members: MemberResponse[]) {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const rawId = payload.userId ?? payload.sub ?? payload.id;
  const numericId = typeof rawId === "string" ? Number(rawId) : typeof rawId === "number" ? rawId : null;
  if (numericId != null && Number.isFinite(numericId)) {
    const match = members.find((member) => member.userId === numericId);
    if (match) return match.userId;
  }

  const email =
    typeof payload.email === "string"
      ? payload.email
      : typeof payload.sub === "string" && payload.sub.includes("@")
      ? payload.sub
      : null;
  if (email) {
    const match = members.find((member) => member.email === email);
    if (match) return match.userId;
  }

  return null;
}

function isAssignmentVisible(assignment: LessonAssignmentResponse, now: number) {
  if (assignment.lessonStatus !== "PUBLISHED") return false;

  const visibleFrom = assignment.visibleFrom ? Date.parse(assignment.visibleFrom) : null;
  if (visibleFrom && !Number.isNaN(visibleFrom) && now < visibleFrom) return false;

  const visibleTo = assignment.visibleTo ? Date.parse(assignment.visibleTo) : null;
  if (visibleTo && !Number.isNaN(visibleTo) && now > visibleTo) return false;

  return true;
}

function formatAvailability(assignment: LessonAssignmentResponse) {
  const from = assignment.visibleFrom ? new Date(assignment.visibleFrom).toLocaleString() : null;
  const to = assignment.visibleTo ? new Date(assignment.visibleTo).toLocaleString() : null;

  if (from && to) return `Available ${from} - ${to}`;
  if (from) return `Available from ${from}`;
  if (to) return `Available until ${to}`;
  return "Available anytime";
}

export default function LessonsOverview({ groupId, isTeacher, members }: LessonsOverviewProps) {
  const [activeTab, setActiveTab] = useState<LessonsTab>("group");
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [groupAssignments, setGroupAssignments] = useState<LessonAssignmentResponse[]>([]);
  const [groupAssignmentsBase, setGroupAssignmentsBase] = useState<LessonAssignmentResponse[]>([]);
  const [memberAssignments, setMemberAssignments] = useState<LessonAssignmentResponse[]>([]);
  const [memberAssignmentsBase, setMemberAssignmentsBase] = useState<LessonAssignmentResponse[]>([]);
  const [dragAssignmentId, setDragAssignmentId] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const lastGroupId = useRef<number | null>(null);
  const lastGroupListId = useRef<number | null>(null);
  const lastMemberKey = useRef<string | null>(null);
  const accessToken = useAccessToken();

  const currentMemberId = useMemo(
    () => resolveMemberIdFromToken(accessToken, members),
    [accessToken, members]
  );

  useEffect(() => {
    if (!isTeacher) return;
    if (!groupId) {
      lastGroupId.current = null;
      setSelectedMemberId(null);
      return;
    }

    const defaultId = currentMemberId ?? (members.length ? members[0].userId : null);

    if (lastGroupId.current !== groupId) {
      lastGroupId.current = groupId;
      setSelectedMemberId(defaultId);
      return;
    }

    const exists = selectedMemberId ? members.some((member) => member.userId === selectedMemberId) : false;
    if (!exists) {
      setSelectedMemberId(defaultId);
    }
  }, [currentMemberId, groupId, isTeacher, members, selectedMemberId]);

  const groupAssignmentsQuery = useQuery({
    queryKey: ["lessonAssignments", "me", "group", groupId],
    queryFn: () => listMyGroupWideLessonAssignments({ page: 0, size: PAGE_SIZE }),
    enabled: !!groupId,
  });

  const personalAssignmentsQuery = useQuery({
    queryKey: ["lessonAssignments", "me", "personal", groupId],
    queryFn: () => listMyPersonalLessonAssignments({ page: 0, size: PAGE_SIZE }),
    enabled: !!groupId && !isTeacher,
  });

  const memberAssignmentsQuery = useQuery({
    queryKey: ["lessonAssignments", "group", groupId, "user", selectedMemberId],
    queryFn: () =>
      listGroupLessonAssignmentsPaged({
        groupId: groupId as number,
        userId: selectedMemberId as number,
        page: 0,
        size: PAGE_SIZE,
      }),
    enabled: !!groupId && isTeacher && !!selectedMemberId,
  });

  const now = useMemo(
    () => Date.now(),
    [groupAssignmentsQuery.data, memberAssignmentsQuery.data, personalAssignmentsQuery.data, groupId]
  );

  const publishedGroupAssignments = useMemo(() => {
    if (!groupId) return [];
    return (groupAssignmentsQuery.data?.content ?? [])
      .filter((assignment) => assignment.groupId === groupId)
      .filter((assignment) => assignment.lessonStatus === "PUBLISHED");
  }, [groupAssignmentsQuery.data, groupId]);

  const publishedPersonalAssignments = useMemo(() => {
    if (!groupId) return [];
    const source = isTeacher ? memberAssignmentsQuery.data?.content : personalAssignmentsQuery.data?.content;
    return (source ?? [])
      .filter((assignment) => assignment.groupId === groupId)
      .filter((assignment) => assignment.lessonStatus === "PUBLISHED");
  }, [groupId, isTeacher, memberAssignmentsQuery.data, personalAssignmentsQuery.data]);

  const availableGroupAssignments = useMemo(
    () => publishedGroupAssignments.filter((assignment) => isAssignmentVisible(assignment, now)),
    [now, publishedGroupAssignments]
  );

  const availablePersonalAssignments = useMemo(
    () => publishedPersonalAssignments.filter((assignment) => isAssignmentVisible(assignment, now)),
    [now, publishedPersonalAssignments]
  );

  function arraysEqualIds(left: LessonAssignmentResponse[], right: LessonAssignmentResponse[]) {
    if (left.length !== right.length) return false;
    for (let i = 0; i < left.length; i += 1) {
      if (left[i].id !== right[i].id) return false;
    }
    return true;
  }

  function applyVisibleOrderToAll(
    allItems: LessonAssignmentResponse[],
    visibleItems: LessonAssignmentResponse[]
  ) {
    const visibleIds = visibleItems.map((item) => item.id);
    const visibleIdSet = new Set(visibleIds);
    const visibleMap = new Map(visibleItems.map((item) => [item.id, item]));
    const slots = allItems.filter((item) => visibleIdSet.has(item.id)).length;
    if (slots !== visibleItems.length) return allItems;

    let index = 0;
    return allItems.map((item) => {
      if (!visibleIdSet.has(item.id)) return item;
      const nextId = visibleIds[index];
      index += 1;
      return visibleMap.get(nextId) ?? item;
    });
  }

  const groupDirty = isTeacher && !arraysEqualIds(groupAssignments, groupAssignmentsBase);
  const memberDirty = isTeacher && !arraysEqualIds(memberAssignments, memberAssignmentsBase);

  useEffect(() => {
    if (!isTeacher) return;
    if (!groupId) {
      setGroupAssignments([]);
      setGroupAssignmentsBase([]);
      lastGroupListId.current = null;
      return;
    }
    if (lastGroupListId.current !== groupId) {
      lastGroupListId.current = groupId;
      setGroupAssignments(availableGroupAssignments);
      setGroupAssignmentsBase(availableGroupAssignments);
      return;
    }
    if (!groupDirty) {
      setGroupAssignments(availableGroupAssignments);
      setGroupAssignmentsBase(availableGroupAssignments);
    }
  }, [availableGroupAssignments, groupDirty, groupId, isTeacher]);

  useEffect(() => {
    if (!isTeacher) return;
    const memberKey = groupId && selectedMemberId ? `${groupId}:${selectedMemberId}` : null;
    if (!memberKey) {
      setMemberAssignments([]);
      setMemberAssignmentsBase([]);
      lastMemberKey.current = null;
      return;
    }
    if (lastMemberKey.current !== memberKey) {
      lastMemberKey.current = memberKey;
      setMemberAssignments(availablePersonalAssignments);
      setMemberAssignmentsBase(availablePersonalAssignments);
      return;
    }
    if (!memberDirty) {
      setMemberAssignments(availablePersonalAssignments);
      setMemberAssignmentsBase(availablePersonalAssignments);
    }
  }, [availablePersonalAssignments, groupId, isTeacher, memberDirty, selectedMemberId]);

  async function handleSaveOrder(kind: LessonsTab) {
    if (!groupId || !isTeacher) return;
    if (kind === "personal" && !selectedMemberId) return;
    setOrderError(null);
    setSavingOrder(true);
    const visibleAssignments = kind === "group" ? groupAssignments : memberAssignments;
    const allAssignments = kind === "group" ? publishedGroupAssignments : publishedPersonalAssignments;
    const nextAssignments = applyVisibleOrderToAll(allAssignments, visibleAssignments);
    try {
      await reorderGroupLessonAssignments(groupId, {
        userId: kind === "group" ? null : selectedMemberId,
        assignmentIds: nextAssignments.map((item) => item.id),
      });
      if (kind === "group") {
        setGroupAssignmentsBase(nextAssignments);
      } else {
        setMemberAssignmentsBase(nextAssignments);
      }
      await (kind === "group" ? groupAssignmentsQuery.refetch() : memberAssignmentsQuery.refetch());
    } catch (e: any) {
      setOrderError(e?.message ?? "Failed to save order.");
    } finally {
      setSavingOrder(false);
    }
  }

  function handleResetOrder(kind: LessonsTab) {
    if (kind === "group") {
      setGroupAssignments(groupAssignmentsBase);
    } else {
      setMemberAssignments(memberAssignmentsBase);
    }
  }

  function handleDropAssignment(targetId: number, kind: LessonsTab) {
    if (dragAssignmentId == null || dragAssignmentId === targetId) return;
    const source = kind === "group" ? groupAssignments : memberAssignments;
    const from = source.findIndex((item) => item.id === dragAssignmentId);
    const to = source.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...source];
    [next[from], next[to]] = [next[to], next[from]];
    if (kind === "group") {
      setGroupAssignments(next);
    } else {
      setMemberAssignments(next);
    }
    setDragAssignmentId(null);
  }

  const isLoading =
    activeTab === "group"
      ? groupAssignmentsQuery.isLoading
      : isTeacher
      ? memberAssignmentsQuery.isLoading
      : personalAssignmentsQuery.isLoading;
  const error =
    activeTab === "group"
      ? groupAssignmentsQuery.error
      : isTeacher
      ? memberAssignmentsQuery.error
      : personalAssignmentsQuery.error;
  const assignments =
    activeTab === "group"
      ? isTeacher
        ? groupAssignments
        : availableGroupAssignments
      : isTeacher
      ? memberAssignments
      : availablePersonalAssignments;

  return (
    <section className="space-y-6 rounded-2xl border bg-card/70 p-6 shadow-sm backdrop-blur">
      <div>
        <p className="text-sm text-muted-foreground">Lessons</p>
        <h2 className="text-2xl font-semibold text-foreground">Available lessons</h2>
      </div>

      <nav className="flex flex-wrap gap-2 rounded-2xl border bg-background/70 p-2">
        <Button
          variant={activeTab === "group" ? "secondary" : "ghost"}
          onClick={() => setActiveTab("group")}
        >
          Group lessons
        </Button>
        <Button
          variant={activeTab === "personal" ? "secondary" : "ghost"}
          onClick={() => setActiveTab("personal")}
        >
          Assigned to member
        </Button>
      </nav>

      {activeTab === "personal" && isTeacher && (
        <div className="max-w-sm space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Member</p>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedMemberId ?? ""}
            onChange={(e) => setSelectedMemberId(e.target.value ? Number(e.target.value) : null)}
            disabled={!members.length}
          >
            {!members.length && <option value="">No members in this group</option>}
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.email} ({member.role})
              </option>
            ))}
          </select>
        </div>
      )}

      {isTeacher && groupId && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-background/70 p-3 text-xs text-muted-foreground">
          <span>Drag & drop lessons to change order. Click Save to apply.</span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => handleSaveOrder(activeTab)}
              disabled={
                savingOrder ||
                (activeTab === "group" ? !groupDirty : !memberDirty) ||
                (activeTab === "personal" && !selectedMemberId)
              }
            >
              Save order
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleResetOrder(activeTab)}
              disabled={activeTab === "group" ? !groupDirty : !memberDirty}
            >
              Reset
            </Button>
          </div>
        </div>
      )}

      {orderError && <p className="text-sm text-destructive">{orderError}</p>}

      {!groupId && (
        <p className="text-sm text-muted-foreground">Select a group to see its available lessons.</p>
      )}

      {groupId && isLoading && <p className="text-sm text-muted-foreground">Loading lessons...</p>}
      {groupId && error && <p className="text-sm text-destructive">{String(error)}</p>}

      {groupId && !isLoading && !error && (
        <>
          {assignments.length === 0 && (
            <p className="text-sm text-muted-foreground">No lessons available right now.</p>
          )}
          {assignments.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {assignments.map((assignment) => (
                <li
                  key={assignment.id}
                  className={`rounded-xl border bg-background/70 p-4 ${
                    dragAssignmentId === assignment.id ? "opacity-60" : ""
                  }`}
                  draggable={isTeacher}
                  onDragStart={() => setDragAssignmentId(assignment.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropAssignment(assignment.id, activeTab)}
                  onDragEnd={() => setDragAssignmentId(null)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-foreground">{assignment.lessonTitle}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {assignment.lessonStatus}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatAvailability(assignment)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
