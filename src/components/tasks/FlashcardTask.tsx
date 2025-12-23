import { useMemo, useState } from "react";
import type { VocabDirection } from "../../api/types";
import { Button } from "../ui/button";

type VocabItem = {
  id: number;
  termEn: string;
  termPl: string;
};

type FlashcardTaskProps = {
  items: VocabItem[];
  direction: VocabDirection;
  shuffle?: boolean;
};

function shuffleItems(items: VocabItem[]) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function FlashcardTask({ items, direction, shuffle }: FlashcardTaskProps) {
  const orderedItems = useMemo(() => {
    if (!shuffle) return items;
    return shuffleItems(items);
  }, [items, shuffle]);

  const deck = useMemo(() => {
    if (direction !== "BOTH") {
      return orderedItems.map((item) => ({ item, round: 1 }));
    }
    const firstRound = orderedItems.map((item) => ({ item, round: 1 }));
    const secondRound = orderedItems.map((item) => ({ item, round: 2 }));
    return [...firstRound, ...secondRound];
  }, [orderedItems, direction]);

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState(false);

  const total = deck.length;
  const current = deck[index]?.item;
  const round = deck[index]?.round ?? 1;

  if (!current) {
    return <p className="text-sm text-muted-foreground">No vocabulary selected.</p>;
  }

  const isBoth = direction === "BOTH";
  const useEnFirst = direction === "EN_TO_PL" || (isBoth && round === 1);
  const front = useEnFirst ? current.termEn : current.termPl;
  const back = useEnFirst ? current.termPl : current.termEn;

  if (completed) {
    return (
      <div className="rounded-lg border bg-background/70 p-4 text-sm">
        <p className="font-semibold">Task finished.</p>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() => {
            setCompleted(false);
            setIndex(0);
            setRevealed(false);
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
          Card {index + 1} / {total}
        </span>
        <span>
          {direction === "EN_TO_PL" && "English → Polish"}
          {direction === "PL_TO_EN" && "Polish → English"}
          {direction === "BOTH" && "Two rounds (EN → PL, then PL → EN)"}
        </span>
      </div>
      {direction === "BOTH" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Legend: round 1 is EN → PL, round 2 is PL → EN.
        </p>
      )}
      <div className="mt-4 rounded-xl border bg-muted/40 p-4 text-center">
        <p className="text-sm text-muted-foreground">{revealed ? "Answer" : "Prompt"}</p>
        <p className="mt-2 text-2xl font-semibold">{revealed ? back : front}</p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="flex justify-start">
          <Button
            variant="ghost"
            onClick={() => {
              if (index === 0) return;
              setIndex((prev) => Math.max(0, prev - 1));
              setRevealed(false);
            }}
            disabled={index === 0}
          >
            Previous
          </Button>
        </div>
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => setRevealed((prev) => !prev)}>
            {revealed ? "Hide answer" : "Show answer"}
          </Button>
        </div>
        <div className="flex justify-end">
          {index < total - 1 && (
            <Button
              onClick={() => {
                setIndex((prev) => Math.min(total - 1, prev + 1));
                setRevealed(false);
              }}
            >
              Next
            </Button>
          )}
          {index === total - 1 && revealed && (
            <Button onClick={() => setCompleted(true)}>Finish task</Button>
          )}
        </div>
      </div>
    </div>
  );
}
