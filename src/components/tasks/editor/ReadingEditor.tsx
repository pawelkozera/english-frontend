import { Input } from "../../ui/input";
import QuestionsEditor from "./QuestionsEditor";
import type { Question } from "../../../api/types";

type ReadingEditorProps = {
  title: string;
  setTitle: (value: string) => void;
  text: string;
  setText: (value: string) => void;
  questions: Question[];
  setQuestions: (value: Question[]) => void;
};

export default function ReadingEditor({
  title,
  setTitle,
  text,
  setText,
  questions,
  setQuestions,
}: ReadingEditorProps) {
  return (
    <div className="mt-3 grid gap-3">
      <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea
        className="min-h-[140px] w-full rounded-md border border-input bg-background p-3 text-sm"
        placeholder="Reading text"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <QuestionsEditor label="Questions" questions={questions} setQuestions={setQuestions} />
    </div>
  );
}
