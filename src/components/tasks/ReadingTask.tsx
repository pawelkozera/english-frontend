import { useMemo, useState } from "react";
import type { Question } from "../../api/types";

type ReadingTaskProps = {
  text: string;
  questions: Question[];
};

export default function ReadingTask({ text, questions }: ReadingTaskProps) {
  const [answers, setAnswers] = useState<Array<string | number | boolean | null>>(
    questions.map(() => null)
  );

  return (
    <div className="rounded-lg border bg-background/70 p-4">
      <div className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-sm">{text}</div>

      {questions.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No questions provided.</p>}

      {questions.length > 0 && (
        <div className="mt-4 space-y-4">
          {questions.map((question, idx) => (
            <div key={`reading-question-${idx}`} className="rounded-lg border bg-background/70 p-3">
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
                        onChange={() =>
                          setAnswers((prev) => prev.map((val, i) => (i === idx ? optIndex : val)))
                        }
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
                      onChange={() =>
                        setAnswers((prev) => prev.map((val, i) => (i === idx ? true : val)))
                      }
                    />
                    True
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={answers[idx] === false}
                      onChange={() =>
                        setAnswers((prev) => prev.map((val, i) => (i === idx ? false : val)))
                      }
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
