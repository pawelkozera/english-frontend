import type { VocabDirection } from "../../../api/types";
import { VOCAB_DIRECTIONS } from "./taskConstants";

type TypingEditorProps = {
  direction: Exclude<VocabDirection, "BOTH">;
  setDirection: (value: Exclude<VocabDirection, "BOTH">) => void;
  caseSensitive: boolean;
  setCaseSensitive: (value: boolean) => void;
  trimWhitespace: boolean;
  setTrimWhitespace: (value: boolean) => void;
};

export default function TypingEditor({
  direction,
  setDirection,
  caseSensitive,
  setCaseSensitive,
  trimWhitespace,
  setTrimWhitespace,
}: TypingEditorProps) {
  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Direction</p>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={direction}
          onChange={(e) => setDirection(e.target.value as Exclude<VocabDirection, "BOTH">)}
        >
          {VOCAB_DIRECTIONS.filter((d) => d.value !== "BOTH").map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} />
          Case sensitive
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={trimWhitespace} onChange={(e) => setTrimWhitespace(e.target.checked)} />
          Trim whitespace
        </label>
      </div>
    </div>
  );
}
