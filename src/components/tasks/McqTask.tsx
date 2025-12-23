import { useEffect, useMemo, useState } from "react";
import type { VocabDirection } from "../../api/types";
import { Button } from "../ui/button";

type VocabItem = {
  id: number;
  termEn: string;
  termPl: string;
};

type McqTaskProps = {
  items: VocabItem[];
  direction: Exclude<VocabDirection, "BOTH">;
  shuffle?: boolean;
  optionsCount?: number;
};

function shuffleItems<T>(items: T[]) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function McqTask({ items, direction, shuffle, optionsCount = 4 }: McqTaskProps) {
  const orderedItems = useMemo(() => {
    if (!shuffle) return items;
    return shuffleItems(items);
  }, [items, shuffle]);

  const itemsById = useMemo(() => {
    return new Map(items.map((item) => [item.id, item]));
  }, [items]);

  const optionsById = useMemo(() => {
    const pool = items.map((item) => (direction === "EN_TO_PL" ? item.termPl : item.termEn));
    const byId = new Map<number, string[]>();

    items.forEach((item) => {
      const correct = direction === "EN_TO_PL" ? item.termPl : item.termEn;
      const distractors = pool.filter((value) => value !== correct);
      const shuffled = shuffleItems(distractors);
      const needed = Math.max(0, optionsCount - 1);
      const options = shuffleItems([correct, ...shuffled.slice(0, needed)]);
      byId.set(item.id, options);
    });

    return byId;
  }, [items, direction, optionsCount]);

  const [queue, setQueue] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [wrongIds, setWrongIds] = useState<number[]>([]);
  const [round, setRound] = useState(1);
  const [completed, setCompleted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    setQueue(orderedItems.map((item) => item.id));
    setCurrentIndex(0);
    setSelectedOption(null);
    setWrongIds([]);
    setRound(1);
    setCompleted(false);
    setSubmitted(false);
    setLastCorrect(null);
  }, [orderedItems]);

  const currentId = queue[currentIndex];
  const currentItem = currentId ? itemsById.get(currentId) : undefined;

  if (!currentItem) {
    return <p className="text-sm text-muted-foreground">No vocabulary selected.</p>;
  }

  function resetAll() {
    setQueue(orderedItems.map((item) => item.id));
    setCurrentIndex(0);
    setSelectedOption(null);
    setWrongIds([]);
    setRound(1);
    setCompleted(false);
    setSubmitted(false);
    setLastCorrect(null);
  }

  if (completed) {
    return (
      <div className="rounded-lg border bg-background/70 p-4 text-sm">
        <p className="font-semibold">All answers correct.</p>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={resetAll}
        >
          Restart
        </Button>
      </div>
    );
  }

  const prompt = direction === "EN_TO_PL" ? currentItem.termEn : currentItem.termPl;
  const correct = direction === "EN_TO_PL" ? currentItem.termPl : currentItem.termEn;
  const options = optionsById.get(currentItem.id) ?? [correct];

  return (
    <div className="rounded-lg border bg-background/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Round {round} · Question {currentIndex + 1} / {queue.length}
        </span>
        <span>{direction === "EN_TO_PL" ? "English → Polish" : "Polish → English"}</span>
      </div>
      <div className="mt-4 rounded-xl border bg-muted/40 p-4">
        <p className="text-sm text-muted-foreground">Translate</p>
        <p className="mt-2 text-2xl font-semibold">{prompt}</p>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {options.map((opt, idx) => (
            <button
              key={`${currentItem.id}-${idx}`}
              type="button"
              className={`rounded-md border px-3 py-2 text-sm ${
                selectedOption === opt ? "border-primary bg-primary/10" : ""
              } ${
                submitted && opt === correct ? "border-emerald-500 bg-emerald-100/60" : ""
              } ${
                submitted && selectedOption === opt && opt !== correct ? "border-rose-500 bg-rose-100/60" : ""
              }`}
              onClick={() => {
                if (submitted) return;
                setSelectedOption(opt);
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
      {selectedOption && (
        <div className="mt-4 flex justify-end">
          <Button
            onClick={() => {
              if (!submitted) {
                const isCorrect = selectedOption === correct;
                setSubmitted(true);
                setLastCorrect(isCorrect);
                if (!isCorrect) {
                  setWrongIds((prev) => [...prev, currentItem.id]);
                }
                return;
              }

              const nextIsWrong = lastCorrect === false;

              if (currentIndex < queue.length - 1) {
                setCurrentIndex((prev) => prev + 1);
                setSelectedOption(null);
                setSubmitted(false);
                setLastCorrect(null);
                return;
              }

              const pendingWrong = [...wrongIds];
              if (nextIsWrong && !pendingWrong.includes(currentItem.id)) {
                pendingWrong.push(currentItem.id);
              }

              if (pendingWrong.length > 0) {
                setQueue(pendingWrong);
                setWrongIds([]);
                setCurrentIndex(0);
                setSelectedOption(null);
                setSubmitted(false);
                setLastCorrect(null);
                setRound((prev) => prev + 1);
                return;
              }

              setCompleted(true);
            }}
          >
            {submitted ? "Next" : "Check answer"}
          </Button>
        </div>
      )}
    </div>
  );
}
