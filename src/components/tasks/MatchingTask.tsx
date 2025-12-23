import { useMemo, useState } from "react";
import type { VocabDirection } from "../../api/types";
import { Button } from "../ui/button";

type VocabItem = {
  id: number;
  termEn: string;
  termPl: string;
};

type MatchingTaskProps = {
  items: VocabItem[];
  direction: Exclude<VocabDirection, "BOTH">;
  shuffle?: boolean;
};

const PAIR_COLORS = [
  "border-amber-400 bg-amber-100/60",
  "border-emerald-400 bg-emerald-100/60",
  "border-sky-400 bg-sky-100/60",
  "border-rose-400 bg-rose-100/60",
  "border-violet-400 bg-violet-100/60",
  "border-lime-400 bg-lime-100/60",
  "border-orange-400 bg-orange-100/60",
  "border-teal-400 bg-teal-100/60",
];

function shuffleItems(items: VocabItem[]) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function MatchingTask({ items, direction, shuffle }: MatchingTaskProps) {
  const leftItems = useMemo(() => items, [items]);
  const rightItems = useMemo(() => (shuffle ? shuffleItems(items) : items), [items, shuffle]);

  const [matchedIds, setMatchedIds] = useState<number[]>([]);
  const [pairColors, setPairColors] = useState<Record<number, string>>({});
  const [selectedLeftId, setSelectedLeftId] = useState<number | null>(null);
  const [selectedRightId, setSelectedRightId] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const allMatched = matchedIds.length > 0 && matchedIds.length === items.length;

  function isMatched(id: number) {
    return matchedIds.includes(id);
  }

  function assignColor(id: number) {
    if (pairColors[id]) return pairColors[id];
    const nextColor = PAIR_COLORS[matchedIds.length % PAIR_COLORS.length];
    setPairColors((prev) => ({ ...prev, [id]: nextColor }));
    return nextColor;
  }

  function handleDrop(targetId: number, draggedId: number) {
    if (targetId !== draggedId) return;
    if (isMatched(targetId)) return;
    setMatchedIds((prev) => [...prev, targetId]);
    assignColor(targetId);
  }

  function handleMatchAttempt(leftId: number | null, rightId: number | null) {
    if (leftId === null || rightId === null) return;
    if (leftId !== rightId) {
      setSelectedLeftId(null);
      setSelectedRightId(null);
      return;
    }
    if (isMatched(leftId)) return;
    setMatchedIds((prev) => [...prev, leftId]);
    assignColor(leftId);
    setSelectedLeftId(null);
    setSelectedRightId(null);
  }

  if (finished) {
    return (
      <div className="rounded-lg border bg-background/70 p-4 text-sm">
        <p className="font-semibold">Task finished.</p>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() => {
            setFinished(false);
            setMatchedIds([]);
            setPairColors({});
          }}
        >
          Restart
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-background/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Matches {matchedIds.length} / {items.length}
        </span>
        <span>{direction === "EN_TO_PL" ? "English → Polish" : "Polish → English"}</span>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          {leftItems.map((item) => {
            const id = item.id;
            const color = pairColors[id];
            const text = direction === "EN_TO_PL" ? item.termEn : item.termPl;
            return (
              <div
                key={`left-${id}`}
                className={`rounded-lg border bg-background/70 p-2 text-sm ${
                  color ?? ""
                } ${selectedLeftId === id ? "ring-2 ring-primary" : ""}`}
                draggable={!isMatched(id)}
                onDragStart={(e) => {
                  if (isMatched(id)) return;
                  e.dataTransfer.setData("text/plain", String(id));
                  e.dataTransfer.effectAllowed = "move";
                }}
                onClick={() => {
                  if (isMatched(id)) return;
                  const next = selectedLeftId === id ? null : id;
                  setSelectedLeftId(next);
                  if (selectedRightId !== null) {
                    handleMatchAttempt(next, selectedRightId);
                  }
                }}
              >
                {text}
              </div>
            );
          })}
        </div>
        <div className="space-y-2">
          {rightItems.map((item) => {
            const id = item.id;
            const color = pairColors[id];
            const text = direction === "EN_TO_PL" ? item.termPl : item.termEn;
            return (
              <div
                key={`right-${id}`}
                className={`rounded-lg border bg-background/70 p-2 text-sm ${
                  color ?? ""
                } ${selectedRightId === id ? "ring-2 ring-primary" : ""}`}
                onDragOver={(e) => {
                  if (isMatched(id)) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  if (isMatched(id)) return;
                  const dragged = Number(e.dataTransfer.getData("text/plain"));
                  if (!Number.isFinite(dragged)) return;
                  handleDrop(id, dragged);
                }}
                onClick={() => {
                  if (isMatched(id)) return;
                  const next = selectedRightId === id ? null : id;
                  setSelectedRightId(next);
                  if (selectedLeftId !== null) {
                    handleMatchAttempt(selectedLeftId, next);
                  }
                }}
              >
                {text}
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Drag a left item onto its match on the right.</p>
      {allMatched && (
        <div className="mt-4">
          <Button onClick={() => setFinished(true)}>Finish task</Button>
        </div>
      )}
    </div>
  );
}
