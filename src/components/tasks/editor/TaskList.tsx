import type { TaskResponse, TaskStatus, TaskType } from "../../../api/types";
import { Button } from "../../ui/button";
import TaskPreview from "../../TaskPreview";
import { typeLabel } from "./taskConstants";

type TaskListProps = {
  tasks: TaskResponse[];
  totalElements: number;
  totalPages: number;
  page: number;
  onPrev: () => void;
  onNext: () => void;
  onEdit: (task: TaskResponse) => void;
  onDelete: (task: TaskResponse) => void;
  previewOpenIds: number[];
  setPreviewOpenIds: (value: number[]) => void;
  loading?: boolean;
  error?: string | null;
};

export default function TaskList({
  tasks,
  totalElements,
  totalPages,
  page,
  onPrev,
  onNext,
  onEdit,
  onDelete,
  previewOpenIds,
  setPreviewOpenIds,
  loading,
  error,
}: TaskListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Entries</p>
          <h3 className="text-xl font-semibold text-foreground">All tasks</h3>
        </div>
        <p className="text-xs text-muted-foreground">{totalElements} items</p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading tasks...</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && (
        <>
          <ul className="space-y-3">
            {tasks.map((task) => (
              <li key={task.id} className="rounded-xl border bg-background/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-foreground">{task.title}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {typeLabel(task.type as TaskType)}
                    </p>
                    <p className="text-xs text-muted-foreground">Status: {task.status as TaskStatus}</p>
                    {task.vocabularyIds?.length ? (
                      <p className="text-xs text-muted-foreground">Vocabulary: {task.vocabularyIds.length}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setPreviewOpenIds(
                          previewOpenIds.includes(task.id)
                            ? previewOpenIds.filter((id) => id !== task.id)
                            : [...previewOpenIds, task.id]
                        );
                      }}
                    >
                      {previewOpenIds.includes(task.id) ? "Hide preview" : "Preview"}
                    </Button>
                    <Button variant="ghost" onClick={() => onEdit(task)}>
                      Edit
                    </Button>
                    <Button variant="ghost" onClick={() => onDelete(task)}>
                      Delete
                    </Button>
                  </div>
                </div>
                {previewOpenIds.includes(task.id) && <TaskPreview task={task} />}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              Page {page + 1} / {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" disabled={page <= 0} onClick={onPrev}>
                Prev
              </Button>
              <Button variant="ghost" disabled={page + 1 >= totalPages} onClick={onNext}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
