import { Button } from "../../ui/button";
import { Input } from "../../ui/input";

type VocabItem = {
  id: number;
  termEn: string;
  termPl: string;
};

type VocabularyPickerProps = {
  vocabSearch: string;
  setVocabSearch: (value: string) => void;
  vocabPage: number;
  setVocabPage: (value: number) => void;
  vocabItems: VocabItem[];
  totalElements: number;
  totalPages: number;
  selectedIds: number[];
  toggleId: (id: number) => void;
};

export default function VocabularyPicker({
  vocabSearch,
  setVocabSearch,
  vocabPage,
  setVocabPage,
  vocabItems,
  totalElements,
  totalPages,
  selectedIds,
  toggleId,
}: VocabularyPickerProps) {
  const selectedSet = new Set(selectedIds);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Vocabulary selection</p>
          <h4 className="text-lg font-semibold text-foreground">Choose vocabulary</h4>
        </div>
        <Input
          placeholder="Filter vocabulary..."
          value={vocabSearch}
          onChange={(e) => setVocabSearch(e.target.value)}
          className="w-full max-w-xs"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {vocabItems.map((item) => {
          const selected = selectedSet.has(item.id);
          return (
            <button
              type="button"
              key={item.id}
              className={`rounded-xl border p-4 text-left transition ${
                selected ? "border-primary bg-primary/10" : "bg-background/70 hover:border-primary/50"
              }`}
              onClick={() => toggleId(item.id)}
            >
              <p className="text-sm font-semibold text-foreground">{item.termEn}</p>
              <p className="text-xs text-muted-foreground">{item.termPl}</p>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          Selected {selectedIds.length} / {totalElements}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" disabled={vocabPage <= 0} onClick={() => setVocabPage(Math.max(0, vocabPage - 1))}>
            Prev
          </Button>
          <Button
            variant="ghost"
            disabled={vocabPage + 1 >= totalPages}
            onClick={() => setVocabPage(vocabPage + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
