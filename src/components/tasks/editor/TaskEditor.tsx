import type { Question, TaskResponse, TaskStatus, TaskType, VocabDirection } from "../../../api/types";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { TASK_STATUSES, TASK_TYPES } from "./taskConstants";
import FlashcardsEditor from "./FlashcardsEditor";
import MatchingEditor from "./MatchingEditor";
import McqEditor from "./McqEditor";
import TypingEditor from "./TypingEditor";
import EssayEditor from "./EssayEditor";
import ReadingEditor from "./ReadingEditor";
import YoutubeEditor from "./YoutubeEditor";
import CustomEditor from "./CustomEditor";
import VocabularyPicker from "./VocabularyPicker";

type TaskEditorProps = {
  editingTask: TaskResponse | null;
  title: string;
  setTitle: (value: string) => void;
  status: TaskStatus;
  setStatus: (value: TaskStatus) => void;
  type: TaskType;
  setType: (value: TaskType) => void;

  flashDirection: VocabDirection;
  setFlashDirection: (value: VocabDirection) => void;
  flashShuffle: boolean;
  setFlashShuffle: (value: boolean) => void;

  matchDirection: Exclude<VocabDirection, "BOTH">;
  setMatchDirection: (value: Exclude<VocabDirection, "BOTH">) => void;
  matchShuffle: boolean;
  setMatchShuffle: (value: boolean) => void;

  mcqDirection: Exclude<VocabDirection, "BOTH">;
  setMcqDirection: (value: Exclude<VocabDirection, "BOTH">) => void;
  mcqOptionsCount: string;
  setMcqOptionsCount: (value: string) => void;
  mcqShuffle: boolean;
  setMcqShuffle: (value: boolean) => void;

  typingDirection: Exclude<VocabDirection, "BOTH">;
  setTypingDirection: (value: Exclude<VocabDirection, "BOTH">) => void;
  typingCaseSensitive: boolean;
  setTypingCaseSensitive: (value: boolean) => void;
  typingTrimWhitespace: boolean;
  setTypingTrimWhitespace: (value: boolean) => void;

  essayPrompt: string;
  setEssayPrompt: (value: string) => void;
  essayMinWords: string;
  setEssayMinWords: (value: string) => void;
  essayMaxWords: string;
  setEssayMaxWords: (value: string) => void;
  essayAttachmentsAllowed: boolean;
  setEssayAttachmentsAllowed: (value: boolean) => void;

  readingTitle: string;
  setReadingTitle: (value: string) => void;
  readingText: string;
  setReadingText: (value: string) => void;
  readingQuestions: Question[];
  setReadingQuestions: (value: Question[]) => void;

  youtubeUrl: string;
  setYoutubeUrl: (value: string) => void;
  youtubeStartHours: string;
  setYoutubeStartHours: (value: string) => void;
  youtubeStartMinutes: string;
  setYoutubeStartMinutes: (value: string) => void;
  youtubeStartSeconds: string;
  setYoutubeStartSeconds: (value: string) => void;
  youtubeNotes: string;
  setYoutubeNotes: (value: string) => void;
  youtubeQuestions: Question[];
  setYoutubeQuestions: (value: Question[]) => void;

  customPayloadJson: string;
  setCustomPayloadJson: (value: string) => void;

  vocabSearch: string;
  setVocabSearch: (value: string) => void;
  vocabPage: number;
  setVocabPage: (value: number) => void;
  vocabItems: { id: number; termEn: string; termPl: string }[];
  vocabTotalElements: number;
  vocabTotalPages: number;
  selectedVocabIds: number[];
  toggleVocabId: (id: number) => void;

  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
};

export default function TaskEditor(props: TaskEditorProps) {
  const selectedTypeMeta = TASK_TYPES.find((t) => t.value === props.type);
  const isVocabType = props.type.startsWith("VOCAB_");

  return (
    <div className="rounded-2xl border bg-background/70 p-5">
      <h3 className="text-lg font-semibold text-foreground">{props.editingTask ? "Edit task" : "Create task"}</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Input placeholder="Title" value={props.title} onChange={(e) => props.setTitle(e.target.value)} />
        <div className="grid gap-3 md:grid-cols-2">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={props.type}
            onChange={(e) => props.setType(e.target.value as TaskType)}
            disabled={!!props.editingTask}
          >
            {TASK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={props.status}
            onChange={(e) => props.setStatus(e.target.value as TaskStatus)}
          >
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedTypeMeta && <p className="mt-2 text-sm text-muted-foreground">{selectedTypeMeta.description}</p>}

      <div className="mt-4 rounded-xl border bg-muted/40 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Task setup</p>

        {props.type === "VOCAB_FLASHCARDS" && (
          <FlashcardsEditor
            direction={props.flashDirection}
            setDirection={props.setFlashDirection}
            shuffle={props.flashShuffle}
            setShuffle={props.setFlashShuffle}
          />
        )}

        {props.type === "VOCAB_MATCHING" && (
          <MatchingEditor
            direction={props.matchDirection}
            setDirection={props.setMatchDirection}
            shuffle={props.matchShuffle}
            setShuffle={props.setMatchShuffle}
          />
        )}

        {props.type === "VOCAB_MCQ" && (
          <McqEditor
            direction={props.mcqDirection}
            setDirection={props.setMcqDirection}
            optionsCount={props.mcqOptionsCount}
            setOptionsCount={props.setMcqOptionsCount}
            shuffle={props.mcqShuffle}
            setShuffle={props.setMcqShuffle}
          />
        )}

        {props.type === "VOCAB_TYPING" && (
          <TypingEditor
            direction={props.typingDirection}
            setDirection={props.setTypingDirection}
            caseSensitive={props.typingCaseSensitive}
            setCaseSensitive={props.setTypingCaseSensitive}
            trimWhitespace={props.typingTrimWhitespace}
            setTrimWhitespace={props.setTypingTrimWhitespace}
          />
        )}

        {props.type === "ESSAY" && (
          <EssayEditor
            prompt={props.essayPrompt}
            setPrompt={props.setEssayPrompt}
            minWords={props.essayMinWords}
            setMinWords={props.setEssayMinWords}
            maxWords={props.essayMaxWords}
            setMaxWords={props.setEssayMaxWords}
            attachmentsAllowed={props.essayAttachmentsAllowed}
            setAttachmentsAllowed={props.setEssayAttachmentsAllowed}
          />
        )}

        {props.type === "READING_TEXT" && (
          <ReadingEditor
            title={props.readingTitle}
            setTitle={props.setReadingTitle}
            text={props.readingText}
            setText={props.setReadingText}
            questions={props.readingQuestions}
            setQuestions={props.setReadingQuestions}
          />
        )}

        {props.type === "YOUTUBE_VIDEO" && (
          <YoutubeEditor
            url={props.youtubeUrl}
            setUrl={props.setYoutubeUrl}
            hours={props.youtubeStartHours}
            setHours={props.setYoutubeStartHours}
            minutes={props.youtubeStartMinutes}
            setMinutes={props.setYoutubeStartMinutes}
            seconds={props.youtubeStartSeconds}
            setSeconds={props.setYoutubeStartSeconds}
            notes={props.youtubeNotes}
            setNotes={props.setYoutubeNotes}
            questions={props.youtubeQuestions}
            setQuestions={props.setYoutubeQuestions}
          />
        )}

        {props.type === "CUSTOM" && (
          <CustomEditor payloadJson={props.customPayloadJson} setPayloadJson={props.setCustomPayloadJson} />
        )}
      </div>

      {isVocabType && (
        <VocabularyPicker
          vocabSearch={props.vocabSearch}
          setVocabSearch={props.setVocabSearch}
          vocabPage={props.vocabPage}
          setVocabPage={props.setVocabPage}
          vocabItems={props.vocabItems}
          totalElements={props.vocabTotalElements}
          totalPages={props.vocabTotalPages}
          selectedIds={props.selectedVocabIds}
          toggleId={props.toggleVocabId}
        />
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={props.saving} onClick={props.onSave}>
          {props.editingTask ? "Save changes" : "Create task"}
        </Button>
        {props.editingTask && (
          <Button variant="ghost" disabled={props.saving} onClick={props.onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
