import { useMemo } from "react";
import type { Question } from "../../api/types";

type YoutubeTaskProps = {
  url: string;
  startSeconds?: number;
  questions: Question[];
  answers: Array<string | number | boolean | null>;
  setAnswers: React.Dispatch<React.SetStateAction<Array<string | number | boolean | null>>>;
};

function buildEmbedUrl(url: string, startSeconds?: number) {
  try {
    const parsed = new URL(url);
    let videoId = "";
    if (parsed.hostname.includes("youtu.be")) {
      videoId = parsed.pathname.replace("/", "");
    } else if (parsed.hostname.includes("youtube.com")) {
      videoId = parsed.searchParams.get("v") ?? "";
    }
    if (!videoId) return "";
    const start = startSeconds ? `?start=${Math.max(0, Math.floor(startSeconds))}` : "";
    return `https://www.youtube.com/embed/${videoId}${start}`;
  } catch {
    return "";
  }
}

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

export default function YoutubeTask({ url, startSeconds, questions, answers, setAnswers }: YoutubeTaskProps) {
  const embedUrl = useMemo(() => buildEmbedUrl(url, startSeconds), [url, startSeconds]);
  const watchUrl = useMemo(() => buildWatchUrl(url, startSeconds), [url, startSeconds]);

  return (
    <div className="space-y-4">
      {embedUrl ? (
        <div className="aspect-square w-full max-w-xl overflow-hidden rounded-lg border bg-background">
          <iframe
            className="h-full w-full"
            src={embedUrl}
            title="YouTube preview"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Invalid YouTube URL.</p>
      )}

      {questions.length > 0 && (
        <div className="space-y-3">
          {questions.map((question, idx) => (
            <div key={`yt-question-${idx}`} className="rounded-lg border bg-background/70 p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Question {idx + 1}</span>
                <span>
                  {question.kind === "OPEN" && "Open"}
                  {question.kind === "MCQ" && "Multiple choice"}
                  {question.kind === "TRUE_FALSE" && "True / False"}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold">{question.prompt}</p>

              {question.kind === "OPEN" && (
                <textarea
                  className="mt-3 min-h-[100px] w-full rounded-md border border-input bg-background p-2 text-sm"
                  value={(answers[idx] as string) ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => prev.map((val, i) => (i === idx ? e.target.value : val)))
                  }
                />
              )}

              {question.kind === "MCQ" && (
                <div className="mt-3 grid gap-2">
                  {(question.options ?? []).map((opt, optIndex) => (
                    <label key={optIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="radio"
                        checked={answers[idx] === optIndex}
                        onChange={() => setAnswers((prev) => prev.map((val, i) => (i === idx ? optIndex : val)))}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}

              {question.kind === "TRUE_FALSE" && (
                <div className="mt-3 flex gap-3 text-sm text-muted-foreground">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={answers[idx] === true}
                      onChange={() => setAnswers((prev) => prev.map((val, i) => (i === idx ? true : val)))}
                    />
                    True
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={answers[idx] === false}
                      onChange={() => setAnswers((prev) => prev.map((val, i) => (i === idx ? false : val)))}
                    />
                    False
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
