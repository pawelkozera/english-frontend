import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createGroup, myGroups } from "../api/groupsApi";
import { logout } from "../api/authApi"
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const GROUPS_QUERY_KEY = ["groups"];

const groupsQueryOptions = {
  queryKey: GROUPS_QUERY_KEY,
  queryFn: myGroups,
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchOnMount: false,
} as const;

export default function GroupsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const q = useQuery(groupsQueryOptions);

  return (
    <div className="mx-auto mt-12 w-full max-w-4xl space-y-8 px-6 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card/70 p-6 shadow-sm backdrop-blur">
        <div>
          <p className="text-sm text-muted-foreground">Your workspace</p>
          <h2 className="text-2xl font-semibold text-foreground">My groups</h2>
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

      <section className="space-y-4 rounded-2xl border bg-card/70 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="New group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="sm:max-w-xs"
          />
          <Button
            onClick={async () => {
              const trimmed = name.trim();
              if (!trimmed) return;

              const created = await createGroup({ name: trimmed });
              setName("");
              qc.setQueryData(["groups"], (old: any) => (old ? [created, ...old] : [created]));
              setName("");
              await qc.invalidateQueries({ queryKey: ["groups"] });
            }}
          >
            Create group
          </Button>
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
      </section>

      <section className="rounded-2xl border bg-card/70 p-5 text-sm text-muted-foreground shadow-sm backdrop-blur">
        Have invite link? Open: <code className="rounded bg-muted px-2 py-1">/join?token=...</code>
      </section>
    </div>
  );
}
