import type { Dispatch, SetStateAction } from "react";
import type { Question } from "../../../api/types";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";

type QuestionsEditorProps = {
  label: string;
  questions: Question[];
  setQuestions: Dispatch<SetStateAction<Question[]>>;
};

function updateQuestionAt(
  setter: Dispatch<SetStateAction<Question[]>>,
  index: number,
  updater: (prev: Question) => Question
) {
  setter((prev) => prev.map((q, i) => (i === index ? updater(q) : q)));
}

export default function QuestionsEditor({ label, questions, setQuestions }: QuestionsEditorProps) {
  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">⇅ Drag to reorder</span>
          <Button
            variant="ghost"
            onClick={() => setQuestions((prev) => [...prev, { kind: "OPEN", prompt: "", sampleAnswer: "" }])}
          >
            Add question
          </Button>
        </div>
      </div>
      {questions.length === 0 && <p className="text-sm text-muted-foreground">No questions yet.</p>}
      <div className="space-y-3">
        {questions.map((q, index) => (
          <div
            key={`${q.kind}-${index}`}
            className="rounded-xl border bg-background/70 p-3"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", String(index));
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const fromIndex = Number(e.dataTransfer.getData("text/plain"));
              if (Number.isNaN(fromIndex) || fromIndex === index) return;
              setQuestions((prev) => {
                const next = [...prev];
                const [moved] = next.splice(fromIndex, 1);
                next.splice(index, 0, moved);
                return next;
              });
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="cursor-grab select-none text-sm text-muted-foreground">⋮⋮</span>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={q.kind}
                  onChange={(e) => {
                    const kind = e.target.value as Question["kind"];
                    updateQuestionAt(setQuestions, index, (prev) => {
                      if (kind === "OPEN") {
                        return { kind, prompt: prev.prompt ?? "", sampleAnswer: "" };
                      }
                      if (kind === "MCQ") {
                        return { kind, prompt: prev.prompt ?? "", options: ["", ""], correctIndex: undefined };
                      }
                      return { kind, prompt: prev.prompt ?? "", correct: undefined };
                    });
                  }}
                >
                  <option value="OPEN">Open</option>
                  <option value="MCQ">Multiple choice</option>
                  <option value="TRUE_FALSE">True / False</option>
                </select>
              </div>
              <Button variant="ghost" onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== index))}>
                Remove
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              <Input
                placeholder="Question prompt"
                value={q.prompt}
                onChange={(e) =>
                  updateQuestionAt(setQuestions, index, (prev) => ({ ...prev, prompt: e.target.value }))
                }
              />
              {q.kind === "OPEN" && (
                <Input
                  placeholder="Sample answer (optional)"
                  value={q.sampleAnswer ?? ""}
                  onChange={(e) =>
                    updateQuestionAt(setQuestions, index, (prev) => ({
                      ...prev,
                      sampleAnswer: e.target.value,
                    }))
                  }
                />
              )}
              {q.kind === "MCQ" && (
                <div className="space-y-2">
                  <div className="space-y-2">
                    {(q.options ?? []).map((opt, optIndex) => (
                      <div key={`${index}-opt-${optIndex}`} className="flex items-center gap-2">
                        <Input
                          placeholder={`Option ${optIndex + 1}`}
                          value={opt}
                          onChange={(e) =>
                            updateQuestionAt(setQuestions, index, (prev) => {
                              const nextOptions = [...(prev.options ?? [])];
                              nextOptions[optIndex] = e.target.value;
                              return { ...prev, options: nextOptions };
                            })
                          }
                        />
                        <Button
                          variant="ghost"
                          onClick={() =>
                            updateQuestionAt(setQuestions, index, (prev) => {
                              const nextOptions = [...(prev.options ?? [])].filter((_, i) => i !== optIndex);
                              if (nextOptions.length === 0) return prev;
                              const nextCorrect =
                                typeof prev.correctIndex === "number" && prev.correctIndex >= optIndex
                                  ? Math.max(0, prev.correctIndex - 1)
                                  : prev.correctIndex;
                              return { ...prev, options: nextOptions, correctIndex: nextCorrect };
                            })
                          }
                          disabled={(q.options ?? []).length <= 1}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      onClick={() =>
                        updateQuestionAt(setQuestions, index, (prev) => ({
                          ...prev,
                          options: [...(prev.options ?? []), ""],
                        }))
                      }
                    >
                      Add option
                    </Button>
                  </div>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={typeof q.correctIndex === "number" ? String(q.correctIndex) : ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      updateQuestionAt(setQuestions, index, (prev) => ({
                        ...prev,
                        correctIndex: raw === "" ? undefined : Number(raw),
                      }));
                    }}
                  >
                    <option value="">Correct answer (optional)</option>
                    {(q.options ?? []).map((opt, optIndex) => (
                      <option key={`${index}-correct-${optIndex}`} value={String(optIndex)}>
                        {opt.trim() ? opt : `Option ${optIndex + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {q.kind === "TRUE_FALSE" && (
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={q.correct === undefined ? "" : q.correct ? "true" : "false"}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateQuestionAt(setQuestions, index, (prev) => ({
                      ...prev,
                      correct: value === "" ? undefined : value === "true",
                    }));
                  }}
                >
                  <option value="">Correct answer (optional)</option>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
