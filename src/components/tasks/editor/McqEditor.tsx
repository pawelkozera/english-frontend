import type { VocabDirection } from "../../../api/types";
import { VOCAB_DIRECTIONS } from "./taskConstants";
import { Input } from "../../ui/input";

type McqEditorProps = {
  direction: Exclude<VocabDirection, "BOTH">;
  setDirection: (value: Exclude<VocabDirection, "BOTH">) => void;
  optionsCount: string;
  setOptionsCount: (value: string) => void;
  shuffle: boolean;
  setShuffle: (value: boolean) => void;
};

export default function McqEditor({
  direction,
  setDirection,
  optionsCount,
  setOptionsCount,
  shuffle,
  setShuffle,
}: McqEditorProps) {
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
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Options count</p>
        <Input value={optionsCount} onChange={(e) => setOptionsCount(e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} />
        Shuffle answers
      </label>
    </div>
  );
}
