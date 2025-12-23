import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { logout } from "../api/authApi";
import { createGroup, groupDetails, joinGroup, myGroups, resetJoinCode } from "../api/groupsApi";
import { createInvite, listInvites, recreateInvite, revokeInvite } from "../api/invitesApi";
import { leaveGroup, listMembers, removeMember } from "../api/groupMembersApi";
import type { GroupRole } from "../api/types";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import VocabularyManager from "../components/VocabularyManager";
import TaskManager from "../components/TaskManager";

const GROUPS_QUERY_KEY = ["groups"];
const ACTIVE_GROUP_KEY = "activeGroupId";
const INVITE_PAGE_SIZE = 6;

const groupsQueryOptions = {
  queryKey: GROUPS_QUERY_KEY,
  queryFn: myGroups,
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchOnMount: false,
} as const;

function extractInviteToken(value: string) {
  if (!value.trim()) return "";
  try {
    const asUrl = new URL(value);
    return asUrl.searchParams.get("token") ?? value.trim();
  } catch {
    return value.trim();
  }
}

export default function MainPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const q = useQuery(groupsQueryOptions);

  const groups = q.data ?? [];

  const [activeTab, setActiveTab] = useState<"overview" | "groups" | "group" | "vocab" | "tasks">("groups");
  const [name, setName] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteRole, setInviteRole] = useState<"DEFAULT" | GroupRole>("DEFAULT");
  const [inviteMaxUses, setInviteMaxUses] = useState("");
  const [inviteExpiresIn, setInviteExpiresIn] = useState("");
  const [createdInviteToken, setCreatedInviteToken] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [invitePage, setInvitePage] = useState(1);

  useEffect(() => {
    setActionError(null);
  }, [activeTab, selectedGroupId]);
  useEffect(() => {
    setInvitePage(1);
  }, [selectedGroupId]);

  useEffect(() => {
    const saved = localStorage.getItem(ACTIVE_GROUP_KEY);
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
    localStorage.setItem(ACTIVE_GROUP_KEY, String(selectedGroupId));
  }, [selectedGroupId]);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );
  const isTeacher = selectedGroup?.myRole === "TEACHER";
  const isStudent = selectedGroup?.myRole === "STUDENT";

  const groupDetailsQuery = useQuery({
    queryKey: ["groupDetails", selectedGroupId],
    queryFn: () => groupDetails(selectedGroupId as number),
    enabled: !!selectedGroupId,
  });

  const membersQuery = useQuery({
    queryKey: ["groupMembers", selectedGroupId],
    queryFn: () => listMembers(selectedGroupId as number),
    enabled: !!selectedGroupId && isTeacher,
  });

  const invitesQuery = useQuery({
    queryKey: ["groupInvites", selectedGroupId],
    queryFn: () => listInvites(selectedGroupId as number),
    enabled: !!selectedGroupId && isTeacher,
  });


  const inviteList = invitesQuery.data ?? [];
  const totalInvitePages = Math.max(1, Math.ceil(inviteList.length / INVITE_PAGE_SIZE));
  const invitePageSafe = Math.min(invitePage, totalInvitePages);
  const inviteSliceStart = (invitePageSafe - 1) * INVITE_PAGE_SIZE;
  const inviteSliceEnd = inviteSliceStart + INVITE_PAGE_SIZE;
  const pagedInvites = inviteList.slice(inviteSliceStart, inviteSliceEnd);

  useEffect(() => {
    if (invitePage > totalInvitePages) {
      setInvitePage(totalInvitePages);
    }
  }, [invitePage, totalInvitePages]);

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

        <nav className="flex flex-wrap gap-2">
          <Button variant={activeTab === "overview" ? "default" : "ghost"} onClick={() => setActiveTab("overview")}>
            Overview
          </Button>
          <Button variant={activeTab === "groups" ? "default" : "ghost"} onClick={() => setActiveTab("groups")}>
            Manage groups
          </Button>
          <Button variant={activeTab === "group" ? "default" : "ghost"} onClick={() => setActiveTab("group")}>
            Group management
          </Button>
          <Button variant={activeTab === "vocab" ? "default" : "ghost"} onClick={() => setActiveTab("vocab")}>
            Vocabulary
          </Button>
          <Button variant={activeTab === "tasks" ? "default" : "ghost"} onClick={() => setActiveTab("tasks")}>
            Tasks
          </Button>
        </nav>

        {activeTab === "overview" && (
          <section className="rounded-2xl border bg-card/70 p-6 shadow-sm backdrop-blur">
            <p className="text-sm text-muted-foreground">Selected group</p>
            <h2 className="text-2xl font-semibold text-foreground">
              {selectedGroup ? selectedGroup.name : "Choose a group to begin"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Use the group selector above to switch contexts or jump into group management.
            </p>
          </section>
        )}

        {activeTab === "groups" && (
          <section className="space-y-6 rounded-2xl border bg-card/70 p-6 shadow-sm backdrop-blur">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Create a new group</h2>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Input
                    placeholder="New group name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="sm:max-w-xs"
                  />
                  <Button
                    onClick={async () => {
                      setActionError(null);
                      if (!name.trim()) return;
                      try {
                        const created = await createGroup({ name });
                        qc.setQueryData(["groups"], (old: any) => (old ? [created, ...old] : [created]));
                        setName("");
                        await qc.invalidateQueries({ queryKey: ["groups"] });
                      } catch (e: any) {
                        setActionError(e?.message ?? "Failed to create group");
                      }
                    }}
                  >
                    Create group
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Join a group</h2>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Invite link</p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Input
                        placeholder="Paste invite link"
                        value={inviteLink}
                        onChange={(e) => setInviteLink(e.target.value)}
                      />
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const token = extractInviteToken(inviteLink);
                          if (!token) return;
                          nav(`/join?token=${encodeURIComponent(token)}`);
                        }}
                      >
                        Open invite
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Invite code</p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Input
                        placeholder="Enter code"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                      />
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          setActionError(null);
                          const code = inviteCode.trim();
                          if (!code) return;
                          try {
                            const joined = await joinGroup({ code });
                            qc.setQueryData(["groups"], (old: any) => (old ? [joined, ...old] : [joined]));
                            setInviteCode("");
                            await qc.invalidateQueries({ queryKey: ["groups"] });
                          } catch (e: any) {
                            setActionError(e?.message ?? "Failed to join group");
                          }
                        }}
                      >
                        Join with code
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {actionError && <p className="text-sm text-destructive">{actionError}</p>}

            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Your groups</p>
                <h3 className="text-xl font-semibold text-foreground">All current groups</h3>
              </div>

              {q.isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
              {q.error && <p className="text-sm text-destructive">{String(q.error)}</p>}
              {q.data && (
                <ul className="grid gap-3 md:grid-cols-2">
                  {q.data.map((g) => (
                    <li key={g.id} className="rounded-xl border bg-background/70 p-4">
                      <p className="text-base font-semibold text-foreground">{g.name}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{g.myRole}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {activeTab === "group" && (
          <section className="space-y-6 rounded-2xl border bg-card/70 p-6 shadow-sm backdrop-blur">
            {!selectedGroup && <p className="text-sm text-muted-foreground">Select a group to manage.</p>}

            {selectedGroup && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Selected group</p>
                    <h2 className="text-2xl font-semibold text-foreground">{selectedGroup.name}</h2>
                  </div>
                  {isStudent && (
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        if (!selectedGroupId) return;
                        const ok = window.confirm("Leave this group? You will lose access to its content.");
                        if (!ok) return;
                        setActionError(null);
                        try {
                          await leaveGroup(selectedGroupId);
                          await qc.invalidateQueries({ queryKey: ["groups"] });
                        } catch (e: any) {
                          setActionError(e?.message ?? "Failed to leave group");
                        }
                      }}
                    >
                      Leave group
                    </Button>
                  )}
                </div>

                {actionError && <p className="text-sm text-destructive">{actionError}</p>}

                {isTeacher && (
                  <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                    <div className="space-y-4 rounded-2xl border bg-background/70 p-5">
                      <div>
                        <p className="text-sm text-muted-foreground">Join code</p>
                        <p className="text-xl font-semibold text-foreground">
                          {groupDetailsQuery.data?.joinCode ?? "Loading..."}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Share this code with students who will join via the code form.
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          if (!selectedGroupId) return;
                          const ok = window.confirm("Regenerate join code? Previous code will stop working.");
                          if (!ok) return;
                          setActionError(null);
                          try {
                            const data = await resetJoinCode(selectedGroupId);
                            qc.setQueryData(["groupDetails", selectedGroupId], (old: any) =>
                              old ? { ...old, joinCode: data.joinCode } : old
                            );
                          } catch (e: any) {
                            setActionError(e?.message ?? "Failed to reset join code");
                          }
                        }}
                      >
                        Reset join code
                      </Button>
                    </div>

                    <div className="space-y-4 rounded-2xl border bg-background/70 p-5">
                      <div>
                        <p className="text-sm text-muted-foreground">Create invite link</p>
                        <p className="text-xs text-muted-foreground">
                          Invites can be limited by role, usage count, and expiry.
                        </p>
                      </div>
                      <div className="grid gap-3">
                        <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Role</label>
                        <select
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value as "DEFAULT" | GroupRole)}
                        >
                          <option value="DEFAULT">Default role</option>
                          <option value="STUDENT">Student</option>
                          <option value="TEACHER">Teacher</option>
                        </select>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input
                            placeholder="Max uses (empty = unlimited)"
                            value={inviteMaxUses}
                            onChange={(e) => setInviteMaxUses(e.target.value)}
                          />
                          <Input
                            placeholder="Expires in minutes"
                            value={inviteExpiresIn}
                            onChange={(e) => setInviteExpiresIn(e.target.value)}
                          />
                        </div>
                        <Button
                          onClick={async () => {
                            if (!selectedGroupId) return;
                            setActionError(null);
                            try {
                              const maxUses = inviteMaxUses.trim()
                                ? Number(inviteMaxUses.trim())
                                : null;
                              const expiresInMinutes = inviteExpiresIn.trim()
                                ? Number(inviteExpiresIn.trim())
                                : null;
                              const payload = {
                                roleGranted: inviteRole === "DEFAULT" ? null : inviteRole,
                                maxUses: Number.isNaN(maxUses) ? null : maxUses,
                                expiresInMinutes: Number.isNaN(expiresInMinutes) ? null : expiresInMinutes,
                              };
                              const created = await createInvite(selectedGroupId, payload);
                              setCreatedInviteToken(created.token);
                              setInviteMaxUses("");
                              setInviteExpiresIn("");
                              await invitesQuery.refetch();
                            } catch (e: any) {
                              setActionError(e?.message ?? "Failed to create invite");
                            }
                          }}
                        >
                          Create invite
                        </Button>
                        {createdInviteToken && (
                          <div className="rounded-xl border bg-muted/60 p-3 text-sm text-muted-foreground">
                            New invite token: <span className="font-semibold text-foreground">{createdInviteToken}</span>
                            <div className="mt-2 text-xs">
                              Link:{" "}
                              <span className="font-semibold text-foreground">
                                {typeof window !== "undefined"
                                  ? `${window.location.origin}/join?token=${createdInviteToken}`
                                  : `/join?token=${createdInviteToken}`}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {isTeacher && (
                  <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Members</p>
                        <h3 className="text-xl font-semibold text-foreground">Students and teachers</h3>
                      </div>
                      {membersQuery.isLoading && <p className="text-sm text-muted-foreground">Loading members...</p>}
                      {membersQuery.error && (
                        <p className="text-sm text-destructive">{String(membersQuery.error)}</p>
                      )}
                      {membersQuery.data && (
                        <ul className="space-y-3">
                          {membersQuery.data.map((m) => (
                            <li key={m.userId} className="flex items-center justify-between rounded-xl border bg-background/70 p-4">
                              <div>
                                <p className="text-sm font-semibold text-foreground">{m.email}</p>
                                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{m.role}</p>
                                {m.owner && <p className="text-xs font-semibold text-muted-foreground">Owner</p>}
                              </div>
                              {!m.owner && (
                                <Button
                                  variant="ghost"
                                  onClick={async () => {
                                    if (!selectedGroupId) return;
                                    const note =
                                      m.role === "TEACHER"
                                        ? " If this person is the group owner, the request will be rejected."
                                        : "";
                                    const ok = window.confirm(`Remove ${m.email} from this group?${note}`);
                                    if (!ok) return;
                                    setActionError(null);
                                    try {
                                      await removeMember(selectedGroupId, m.userId);
                                      await membersQuery.refetch();
                                    } catch (e: any) {
                                      setActionError(e?.message ?? "Failed to remove member");
                                    }
                                  }}
                                >
                                  Remove
                                </Button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Invites</p>
                        <h3 className="text-xl font-semibold text-foreground">Active invites</h3>
                      </div>
                      {invitesQuery.isLoading && <p className="text-sm text-muted-foreground">Loading invites...</p>}
                      {invitesQuery.error && <p className="text-sm text-destructive">{String(invitesQuery.error)}</p>}
                      {invitesQuery.data && (
                        <>
                          {inviteList.length > 0 && (
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                Showing {inviteSliceStart + 1}-{Math.min(inviteSliceEnd, inviteList.length)} of{" "}
                                {inviteList.length}
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  disabled={invitePageSafe <= 1}
                                  onClick={() => setInvitePage((p) => Math.max(1, p - 1))}
                                >
                                  Prev
                                </Button>
                                <span>
                                  Page {invitePageSafe} / {totalInvitePages}
                                </span>
                                <Button
                                  variant="ghost"
                                  disabled={invitePageSafe >= totalInvitePages}
                                  onClick={() => setInvitePage((p) => Math.min(totalInvitePages, p + 1))}
                                >
                                  Next
                                </Button>
                              </div>
                            </div>
                          )}
                          <ul className="space-y-3">
                            {pagedInvites.map((invite) => (
                              <li key={invite.inviteId} className="rounded-xl border bg-background/70 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">Role: {invite.roleGranted}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Used {invite.usedCount}
                                    {invite.maxUses ? ` / ${invite.maxUses}` : ""} · Expires{" "}
                                    {new Date(invite.expiresAt).toLocaleString()}
                                  </p>
                                  {invite.revoked && (
                                    <p className="text-xs font-semibold text-destructive">Revoked</p>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    variant="ghost"
                                    onClick={async () => {
                                      if (!selectedGroupId) return;
                                      const ok = window.confirm("Recreate this invite? It will invalidate the old one.");
                                      if (!ok) return;
                                      setActionError(null);
                                      try {
                                        const recreated = await recreateInvite(selectedGroupId, invite.inviteId);
                                        setCreatedInviteToken(recreated.token);
                                        await invitesQuery.refetch();
                                      } catch (e: any) {
                                        setActionError(e?.message ?? "Failed to recreate invite");
                                      }
                                    }}
                                  >
                                    Recreate
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    onClick={async () => {
                                      if (!selectedGroupId) return;
                                      const ok = window.confirm("Revoke this invite? It can no longer be used.");
                                      if (!ok) return;
                                      setActionError(null);
                                      try {
                                        await revokeInvite(selectedGroupId, invite.inviteId);
                                        await invitesQuery.refetch();
                                      } catch (e: any) {
                                        setActionError(e?.message ?? "Failed to revoke invite");
                                      }
                                    }}
                                  >
                                    Revoke
                                  </Button>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {activeTab === "vocab" && <VocabularyManager />}
        {activeTab === "tasks" && <TaskManager />}
      </div>
    </div>
  );
}
