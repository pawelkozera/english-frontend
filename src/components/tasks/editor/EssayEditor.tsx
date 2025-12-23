import { Input } from "../../ui/input";

type EssayEditorProps = {
  prompt: string;
  setPrompt: (value: string) => void;
  minWords: string;
  setMinWords: (value: string) => void;
  maxWords: string;
  setMaxWords: (value: string) => void;
  attachmentsAllowed: boolean;
  setAttachmentsAllowed: (value: boolean) => void;
};

export default function EssayEditor({
  prompt,
  setPrompt,
  minWords,
  setMinWords,
  maxWords,
  setMaxWords,
  attachmentsAllowed,
  setAttachmentsAllowed,
}: EssayEditorProps) {
  return (
    <div className="mt-3 grid gap-3">
      <Input placeholder="Prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <div className="grid gap-3 md:grid-cols-3">
        <Input placeholder="Min words" value={minWords} onChange={(e) => setMinWords(e.target.value)} />
        <Input placeholder="Max words" value={maxWords} onChange={(e) => setMaxWords(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={attachmentsAllowed}
            onChange={(e) => setAttachmentsAllowed(e.target.checked)}
          />
          Attachments allowed
        </label>
      </div>
    </div>
  );
}
