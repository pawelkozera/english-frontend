import { useEffect, useMemo, useRef, useState } from "react";
import type { Question, TaskResponse, TaskType } from "../api/types";
import { getVocabulary } from "../api/vocabularyApi";
import FlashcardTask from "./tasks/FlashcardTask";
import MatchingTask from "./tasks/MatchingTask";
import McqTask from "./tasks/McqTask";
import TypingTask from "./tasks/TypingTask";
import ReadingTask from "./tasks/ReadingTask";
import YoutubeTask from "./tasks/YoutubeTask";
import { Button } from "./ui/button";

function buildWatchUrl(url: string, startSeconds?: number) {
  try {
    const parsed = new URL(url);
    let videoId = "";
    if (parsed.hostname.includes("youtu.be")) {
      videoId = parsed.pathname.replace("/", "");
    } else if (parsed.hostname.includes("youtube.com")) {
      videoId = parsed.searchParams.get("v") ?? "";
    }
    if (!videoId) return url;
    const watch = new URL("https://www.youtube.com/watch");
    watch.searchParams.set("v", videoId);
    if (startSeconds) watch.searchParams.set("t", String(Math.max(0, Math.floor(startSeconds))));
    return watch.toString();
  } catch {
    return url;
  }
}

type VocabItem = {
  id: number;
  termEn: string;
  termPl: string;
};

function isVocabTask(type: TaskType) {
  return type.startsWith("VOCAB_");
}

type TaskRunnerProps = {
  task: TaskResponse;
  onComplete: () => void;
  completed?: boolean;
  initialAnswer?: unknown | null;
  seedKey?: string | null;
  onAnswerChange?: (answer: unknown) => void;
  onSubmitAnswer?: (answer: unknown) => void;
};

export default function TaskRunner({
  task,
  onComplete,
  completed,
  initialAnswer,
  seedKey,
  onAnswerChange,
  onSubmitAnswer,
}: TaskRunnerProps) {
  const [vocabItems, setVocabItems] = useState<VocabItem[]>([]);
  const [vocabLoading, setVocabLoading] = useState(false);
  const [vocabError, setVocabError] = useState<string | null>(null);
  const [youtubeAnswers, setYoutubeAnswers] = useState<Array<string | number | boolean | null>>([]);
  const [readingAnswers, setReadingAnswers] = useState<Array<string | number | boolean | null>>([]);
  const [essayAnswer, setEssayAnswer] = useState("");
  const [customAnswer, setCustomAnswer] = useState("");
  const lastSeedTaskId = useRef<number | null>(null);
  const lastSeedKey = useRef<string | null>(null);

  const vocabIds = task.vocabularyIds ?? [];

  useEffect(() => {
    if (!isVocabTask(task.type) || vocabIds.length === 0) {
      setVocabItems([]);
      setVocabLoading(false);
      setVocabError(null);
      return;
    }

    let cancelled = false;
    setVocabLoading(true);
    setVocabError(null);

    Promise.all(vocabIds.map((id) => getVocabulary(id)))
      .then((items) => {
        if (cancelled) return;
        setVocabItems(items);
        setVocabLoading(false);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setVocabError(err?.message ?? "Failed to load vocabulary");
        setVocabLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [task.type, vocabIds]);

  const payload = task.payload ?? {};
  const questions = (payload as { questions?: Question[] }).questions ?? [];
  const questionMeta = useMemo(() => {
    return questions.map((q: any, idx) => ({
      id: q?.id ?? String(idx),
      type: q?.type ?? q?.kind ?? "OPEN",
      prompt: q?.prompt ?? "",
      options: q?.options ?? [],
    }));
  }, [questions]);

  const normalizedQuestions = useMemo(() => {
    return questionMeta.map((q) => ({
      kind: q.type,
      prompt: q.prompt,
      options: q.options,
    })) as Question[];
  }, [questionMeta]);

  useEffect(() => {
    const taskChanged = lastSeedTaskId.current !== task.id;
    const seedChanged = lastSeedKey.current !== (seedKey ?? null);

    if (!taskChanged && !seedChanged) return;

    lastSeedTaskId.current = task.id;
    lastSeedKey.current = seedKey ?? null;

    if (task.type === "YOUTUBE_VIDEO") {
      if (Array.isArray(initialAnswer)) {
        setYoutubeAnswers(initialAnswer as Array<string | number | boolean | null>);
        return;
      }
      if (initialAnswer && typeof initialAnswer === "object") {
        const container = initialAnswer as Record<string, any>;
        const list = (container.responses ?? container.answers ?? []) as Array<Record<string, any>>;
        if (Array.isArray(list) && list.length > 0) {
          const byId = new Map<string, any>();
          list.forEach((item, idx) => {
            const rawId = item.id != null ? String(item.id) : String(idx);
            byId.set(rawId, item.answer ?? item.value ?? item.response ?? null);
          });
          setYoutubeAnswers(questionMeta.map((q, idx) => byId.get(String(q.id)) ?? byId.get(String(idx)) ?? null));
          return;
        }
        if (Array.isArray(container.answer)) {
          setYoutubeAnswers(container.answer as Array<string | number | boolean | null>);
          return;
        }
        return;
      }
      setYoutubeAnswers(questions.map(() => null));
      return;
    }
    if (task.type === "READING_TEXT") {
      if (Array.isArray(initialAnswer)) {
        setReadingAnswers(initialAnswer as Array<string | number | boolean | null>);
        return;
      }
      if (initialAnswer && typeof initialAnswer === "object") {
        const container = initialAnswer as Record<string, any>;
        const list = (container.responses ?? container.answers ?? []) as Array<Record<string, any>>;
        if (Array.isArray(list) && list.length > 0) {
          const byId = new Map<string, any>();
          list.forEach((item, idx) => {
            const rawId = item.id != null ? String(item.id) : String(idx);
            byId.set(rawId, item.answer ?? item.value ?? item.response ?? null);
          });
          setReadingAnswers(questionMeta.map((q, idx) => byId.get(String(q.id)) ?? byId.get(String(idx)) ?? null));
          return;
        }
        if (Array.isArray(container.answer)) {
          setReadingAnswers(container.answer as Array<string | number | boolean | null>);
          return;
        }
        return;
      }
      setReadingAnswers(questions.map(() => null));
      return;
    }
    if (task.type === "ESSAY") {
      if (initialAnswer && typeof initialAnswer === "object") {
        const container = initialAnswer as Record<string, any>;
        const nestedAnswer = container.answer as Record<string, any> | string | undefined;
        const textValue =
          typeof container.text === "string"
            ? container.text
            : typeof nestedAnswer === "string"
              ? nestedAnswer
              : typeof nestedAnswer?.text === "string"
                ? nestedAnswer.text
                : "";
        setEssayAnswer(textValue);
      } else {
        setEssayAnswer(typeof initialAnswer === "string" ? initialAnswer : "");
      }
      return;
    }
    if (task.type === "CUSTOM") {
      if (typeof initialAnswer === "string") {
        setCustomAnswer(initialAnswer);
      } else if (initialAnswer) {
        setCustomAnswer(JSON.stringify(initialAnswer, null, 2));
      } else {
        setCustomAnswer("");
      }
    }
  }, [initialAnswer, questionMeta, questions, task.id, task.type]);

  return (
    <div className="mt-4 rounded-xl border bg-muted/40 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Task</p>
      <div className="mt-3 space-y-4">
        {task.type === "VOCAB_FLASHCARDS" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Flashcards</p>
            {vocabLoading && <p className="text-sm text-muted-foreground">Loading vocabulary...</p>}
            {vocabError && <p className="text-sm text-destructive">{vocabError}</p>}
            {vocabItems.length > 0 && (
              <FlashcardTask
                items={vocabItems}
                direction={(payload as any).direction ?? "EN_TO_PL"}
                shuffle={Boolean((payload as any).shuffle)}
                onComplete={onComplete}
              />
            )}
          </div>
        )}

        {task.type === "VOCAB_MATCHING" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Matching pairs</p>
            {vocabLoading && <p className="text-sm text-muted-foreground">Loading vocabulary...</p>}
            {vocabError && <p className="text-sm text-destructive">{vocabError}</p>}
            {vocabItems.length > 0 && (
              <MatchingTask
                items={vocabItems}
                direction={(payload as any).direction ?? "EN_TO_PL"}
                shuffle={(payload as any).shuffle ?? true}
                onComplete={onComplete}
              />
            )}
          </div>
        )}

        {task.type === "VOCAB_MCQ" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Multiple choice</p>
            {vocabLoading && <p className="text-sm text-muted-foreground">Loading vocabulary...</p>}
            {vocabError && <p className="text-sm text-destructive">{vocabError}</p>}
            {vocabItems.length > 0 && (
              <McqTask
                items={vocabItems}
                direction={(payload as any).direction ?? "EN_TO_PL"}
                shuffle={Boolean((payload as any).shuffle)}
                optionsCount={(payload as any).optionsCount ?? 4}
                onComplete={onComplete}
              />
            )}
          </div>
        )}

        {task.type === "VOCAB_TYPING" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Typing</p>
            {vocabLoading && <p className="text-sm text-muted-foreground">Loading vocabulary...</p>}
            {vocabError && <p className="text-sm text-destructive">{vocabError}</p>}
            {vocabItems.length > 0 && (
              <TypingTask
                items={vocabItems}
                direction={(payload as any).direction ?? "EN_TO_PL"}
                shuffle={Boolean((payload as any).shuffle)}
                caseSensitive={Boolean((payload as any).caseSensitive)}
                trimWhitespace={(payload as any).trimWhitespace !== false}
                onComplete={onComplete}
              />
            )}
          </div>
        )}

        {task.type === "ESSAY" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Essay</p>
            <p className="text-sm">{(payload as any).prompt ?? "Write your response"}</p>
            <textarea
              className="min-h-[120px] w-full rounded-md border border-input bg-background p-3 text-sm"
              placeholder="Student answer"
              value={essayAnswer}
              onChange={(e) => {
                setEssayAnswer(e.target.value);
                onAnswerChange?.(e.target.value);
              }}
            />
            <Button onClick={() => onSubmitAnswer?.({ text: essayAnswer })}>
              Submit
            </Button>
          </div>
        )}

        {task.type === "READING_TEXT" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Reading</p>
            <ReadingTask
              text={(payload as any).text ?? "Reading text"}
              questions={normalizedQuestions}
              answers={readingAnswers}
              onAnswersChange={(next) => {
                setReadingAnswers(next);
                onAnswerChange?.(next);
              }}
            />
            <Button
              onClick={() =>
                onSubmitAnswer?.({
                  responses: questionMeta.map((q, idx) => ({
                    id: q.id,
                    type: q.type,
                    answer: readingAnswers[idx] ?? null,
                  })),
                })
              }
            >
              Submit
            </Button>
          </div>
        )}

        {task.type === "YOUTUBE_VIDEO" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">YouTube video</p>
            {(() => {
              const url = (payload as any).url ?? "";
              const startSeconds = (payload as any).startSeconds;
              const watchUrl = buildWatchUrl(url, startSeconds);
              return (
                <p className="text-sm">
                  Video URL:{" "}
                  <a className="font-semibold text-primary underline" href={watchUrl} target="_blank" rel="noreferrer">
                    Open in new tab
                  </a>
                </p>
              );
            })()}
            {(payload as any).notes && <p className="text-sm text-muted-foreground">{(payload as any).notes}</p>}
            <YoutubeTask
              url={(payload as any).url ?? ""}
              startSeconds={(payload as any).startSeconds}
              questions={normalizedQuestions}
              answers={youtubeAnswers}
              setAnswers={(next) => {
                setYoutubeAnswers((prev) => {
                  const base = Array.isArray(prev) ? prev : [];
                  const resolved = typeof next === "function" ? next(base) : next;
                  onAnswerChange?.(resolved);
                  return resolved;
                });
              }}
            />
            <Button
              onClick={() =>
                onSubmitAnswer?.({
                  responses: questionMeta.map((q, idx) => ({
                    id: q.id,
                    type: q.type,
                    answer: youtubeAnswers[idx] ?? null,
                  })),
                })
              }
            >
              Submit
            </Button>
          </div>
        )}

        {task.type === "CUSTOM" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Custom payload</p>
            <textarea
              className="min-h-[120px] w-full rounded-md border border-input bg-background p-3 text-sm"
              placeholder="Answer payload"
              value={customAnswer}
              onChange={(e) => {
                setCustomAnswer(e.target.value);
                onAnswerChange?.(e.target.value);
              }}
            />
            <Button onClick={() => onSubmitAnswer?.(customAnswer)}>
              Submit
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
