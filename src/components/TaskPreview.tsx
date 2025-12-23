import { useEffect, useMemo, useState } from "react";
import type { Question, TaskResponse, TaskType } from "../api/types";
import { getVocabulary } from "../api/vocabularyApi";
import FlashcardTask from "./tasks/FlashcardTask";
import MatchingTask from "./tasks/MatchingTask";
import McqTask from "./tasks/McqTask";
import TypingTask from "./tasks/TypingTask";
import ReadingTask from "./tasks/ReadingTask";
import YoutubeTask from "./tasks/YoutubeTask";

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

function questionLabel(kind: Question["kind"]) {
  if (kind === "OPEN") return "Open question";
  if (kind === "MCQ") return "Multiple choice";
  return "True / False";
}

function isVocabTask(type: TaskType) {
  return type.startsWith("VOCAB_");
}

export default function TaskPreview({ task }: { task: TaskResponse }) {
  const [vocabItems, setVocabItems] = useState<VocabItem[]>([]);
  const [vocabLoading, setVocabLoading] = useState(false);
  const [vocabError, setVocabError] = useState<string | null>(null);
  const [youtubeAnswers, setYoutubeAnswers] = useState<Array<string | number | boolean | null>>([]);

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

  const mcqOptions = useMemo(() => {
    if (vocabItems.length === 0) return [];
    return vocabItems.slice(0, 4).map((item) => item.termPl);
  }, [vocabItems]);

  const questions = (payload as { questions?: Question[] }).questions ?? [];

  useEffect(() => {
    if (task.type === "YOUTUBE_VIDEO") {
      setYoutubeAnswers(questions.map(() => null));
    }
  }, [task.id, task.type, questions]);

  useEffect(() => {
    if (task.type === "YOUTUBE_VIDEO") {
      // Keep existing behaviour for YouTube for now.
    }
  }, [task.id, task.type]);

  return (
    <div className="mt-3 rounded-xl border bg-muted/40 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Preview</p>
      <p className="mt-1 text-xs text-muted-foreground">Interactive preview (no submission).</p>
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
            />
          </div>
        )}

        {task.type === "READING_TEXT" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Reading</p>
            <ReadingTask
              text={(payload as any).text ?? "Reading text"}
              questions={questions}
            />
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
              questions={questions}
              answers={youtubeAnswers}
              setAnswers={setYoutubeAnswers}
            />
          </div>
        )}

        {task.type === "CUSTOM" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Custom payload</p>
            <pre className="whitespace-pre-wrap rounded-lg border bg-background/70 p-3 text-xs">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
