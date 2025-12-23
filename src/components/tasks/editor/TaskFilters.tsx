import type { TaskStatus, TaskType } from "../../../api/types";
import { TASK_STATUSES, TASK_TYPES } from "./taskConstants";
import { Input } from "../../ui/input";

type TaskFiltersProps = {
  search: string;
  setSearch: (value: string) => void;
  type: TaskType | "ALL";
  setType: (value: TaskType | "ALL") => void;
  status: TaskStatus | "ALL";
  setStatus: (value: TaskStatus | "ALL") => void;
};

export default function TaskFilters({ search, setSearch, type, setType, status, setStatus }: TaskFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Input
        placeholder="Search tasks..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-xs"
      />
      <div className="grid w-full gap-3 sm:grid-cols-2 md:max-w-md">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Type</p>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as TaskType | "ALL")}
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
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus | "ALL")}
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
  );
}
