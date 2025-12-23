import { useEffect, useMemo, useState } from "react";
import type { VocabDirection } from "../../api/types";
import { Button } from "../ui/button";

type VocabItem = {
  id: number;
  termEn: string;
  termPl: string;
};

type TypingTaskProps = {
  items: VocabItem[];
  direction: Exclude<VocabDirection, "BOTH">;
  shuffle?: boolean;
  caseSensitive?: boolean;
  trimWhitespace?: boolean;
};

function shuffleItems<T>(items: T[]) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function stripDiacritics(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalize(input: string, trimWhitespace: boolean, caseSensitive: boolean) {
  let result = input;
  if (trimWhitespace) result = result.trim();
  if (!caseSensitive) result = result.toLowerCase();
  result = stripDiacritics(result);
  return result;
}

export default function TypingTask({
  items,
  direction,
  shuffle,
  caseSensitive = false,
  trimWhitespace = true,
}: TypingTaskProps) {
  const orderedItems = useMemo(() => {
    if (!shuffle) return items;
    return shuffleItems(items);
  }, [items, shuffle]);

  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const [queue, setQueue] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [wrongIds, setWrongIds] = useState<number[]>([]);
  const [round, setRound] = useState(1);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    setQueue(orderedItems.map((item) => item.id));
    setCurrentIndex(0);
    setAnswer("");
    setSubmitted(false);
    setLastCorrect(null);
    setWrongIds([]);
    setRound(1);
    setCompleted(false);
  }, [orderedItems]);

  const currentId = queue[currentIndex];
  const currentItem = currentId ? itemsById.get(currentId) : undefined;

  const prompt = currentItem
    ? direction === "EN_TO_PL"
      ? currentItem.termEn
      : currentItem.termPl
    : "";
  const expectedRaw = currentItem
    ? direction === "EN_TO_PL"
      ? currentItem.termPl
      : currentItem.termEn
    : "";
  const expected = normalize(expectedRaw, trimWhitespace, caseSensitive);
  const normalizedAnswer = normalize(answer, trimWhitespace, caseSensitive);

  const comparison = useMemo(() => {
    const chars = normalizedAnswer.split("");
    const expectedChars = expected.split("");
    const maxLen = Math.max(chars.length, expectedChars.length);
    const results = [];
    let correctCount = 0;
    for (let i = 0; i < maxLen; i += 1) {
      const userChar = chars[i];
      const expectedChar = expectedChars[i];
      if (userChar === undefined) continue;
      const ok = userChar === expectedChar;
      if (ok) correctCount += 1;
      results.push({ char: userChar, ok });
    }
    const ratio = expected.length > 0 ? correctCount / expected.length : 0;
    return { results, ratio };
  }, [normalizedAnswer, expected]);

  if (!currentItem) {
    return <p className="text-sm text-muted-foreground">No vocabulary selected.</p>;
  }

  if (completed) {
    return (
      <div className="rounded-lg border bg-background/70 p-4 text-sm">
        <p className="font-semibold">All answers correct.</p>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() => {
            setQueue(orderedItems.map((item) => item.id));
            setCurrentIndex(0);
            setAnswer("");
            setSubmitted(false);
            setLastCorrect(null);
            setWrongIds([]);
            setRound(1);
            setCompleted(false);
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
          Round {round} / Question {currentIndex + 1} / {queue.length}
        </span>
        <span>{direction === "EN_TO_PL" ? "English -> Polish" : "Polish -> English"}</span>
      </div>
      <div className="mt-4 rounded-xl border bg-muted/40 p-4">
        <p className="text-sm text-muted-foreground">Translate</p>
        <p className="mt-2 text-2xl font-semibold">{prompt}</p>
        <input
          className="mt-4 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          placeholder="Type answer"
          value={answer}
          onChange={(e) => {
            if (submitted) return;
            setAnswer(e.target.value);
          }}
        />
        {submitted && (
          <div className="mt-3 rounded-md border bg-background/80 p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Your answer</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {comparison.results.length === 0 && <span className="text-muted-foreground">No input</span>}
              {comparison.results.map((part, idx) => (
                <span key={`${part.char}-${idx}`} className={part.ok ? "text-emerald-600" : "text-rose-600"}>
                  {part.char}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Correct letters: {(comparison.ratio * 100).toFixed(0)}%</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Correct answer: <span className="font-semibold text-foreground">{expectedRaw}</span>
            </p>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          onClick={() => {
            if (!submitted) {
              const isCorrect = comparison.ratio >= 0.9;
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
              setAnswer("");
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
              setAnswer("");
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
    </div>
  );
}
