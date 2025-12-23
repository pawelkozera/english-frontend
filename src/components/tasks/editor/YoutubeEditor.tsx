import { Input } from "../../ui/input";
import QuestionsEditor from "./QuestionsEditor";
import type { Question } from "../../../api/types";

type YoutubeEditorProps = {
  url: string;
  setUrl: (value: string) => void;
  hours: string;
  setHours: (value: string) => void;
  minutes: string;
  setMinutes: (value: string) => void;
  seconds: string;
  setSeconds: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  questions: Question[];
  setQuestions: (value: Question[]) => void;
};

export default function YoutubeEditor({
  url,
  setUrl,
  hours,
  setHours,
  minutes,
  setMinutes,
  seconds,
  setSeconds,
  notes,
  setNotes,
  questions,
  setQuestions,
}: YoutubeEditorProps) {
  return (
    <div className="mt-3 grid gap-3">
      <Input placeholder="Video URL" value={url} onChange={(e) => setUrl(e.target.value)} />
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Start (h)</p>
          <Input placeholder="Hours" value={hours} onChange={(e) => setHours(e.target.value)} />
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Start (m)</p>
          <Input placeholder="Minutes" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Start (s)</p>
          <Input placeholder="Seconds" value={seconds} onChange={(e) => setSeconds(e.target.value)} />
        </div>
      </div>
      <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <QuestionsEditor label="Questions" questions={questions} setQuestions={setQuestions} />
    </div>
  );
}
