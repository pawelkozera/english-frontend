import { Input } from "../../ui/input";

type CustomEditorProps = {
  payloadJson: string;
  setPayloadJson: (value: string) => void;
};

export default function CustomEditor({ payloadJson, setPayloadJson }: CustomEditorProps) {
  return (
    <div className="mt-3 grid gap-3">
      <textarea
        className="min-h-[140px] w-full rounded-md border border-input bg-background p-3 text-sm"
        placeholder="Custom payload JSON"
        value={payloadJson}
        onChange={(e) => setPayloadJson(e.target.value)}
      />
    </div>
  );
}
