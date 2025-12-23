import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createVocabulary, deleteVocabulary, searchVocabulary, updateVocabulary } from "../api/vocabularyApi";
import { deleteMedia, fetchMediaBlob, uploadMedia } from "../api/mediaApi";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const VOCAB_PAGE_SIZE = 10;

export default function VocabularyManager() {
  const [vocabSearch, setVocabSearch] = useState("");
  const [vocabPage, setVocabPage] = useState(0);
  const [editingVocabId, setEditingVocabId] = useState<number | null>(null);
  const [termEn, setTermEn] = useState("");
  const [termPl, setTermPl] = useState("");
  const [exampleEn, setExampleEn] = useState("");
  const [examplePl, setExamplePl] = useState("");
  const [imageMediaId, setImageMediaId] = useState<number | null>(null);
  const [audioMediaId, setAudioMediaId] = useState<number | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingAudioFile, setPendingAudioFile] = useState<File | null>(null);
  const [removeImageOnSave, setRemoveImageOnSave] = useState(false);
  const [removeAudioOnSave, setRemoveAudioOnSave] = useState(false);
  const [pendingRemoveImageId, setPendingRemoveImageId] = useState<number | null>(null);
  const [pendingRemoveAudioId, setPendingRemoveAudioId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<number, string>>({});
  const [audioPreviewUrls, setAudioPreviewUrls] = useState<Record<number, string>>({});
  const [imagePreviewVisible, setImagePreviewVisible] = useState<Record<number, boolean>>({});
  const [audioPreviewVisible, setAudioPreviewVisible] = useState<Record<number, boolean>>({});
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [imageModalAlt, setImageModalAlt] = useState<string | null>(null);

  const vocabularyQuery = useQuery({
    queryKey: ["vocabulary", vocabSearch, vocabPage, VOCAB_PAGE_SIZE],
    queryFn: () => searchVocabulary({ q: vocabSearch, page: vocabPage, size: VOCAB_PAGE_SIZE }),
  });

  useEffect(() => {
    setVocabPage(0);
  }, [vocabSearch]);

  useEffect(() => {
    return () => {
      Object.values(imagePreviewUrls).forEach((url) => URL.revokeObjectURL(url));
      Object.values(audioPreviewUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviewUrls, audioPreviewUrls]);

  async function removeMediaBestEffort(id: number) {
    try {
      await deleteMedia(id);
    } catch {
      // Best-effort cleanup; ignore failures.
    }
  }

  const imageWillBeRemoved = !!pendingRemoveImageId;
  const audioWillBeRemoved = !!pendingRemoveAudioId;

  return (
    <section className="space-y-6 rounded-2xl border bg-card/70 p-6 shadow-sm backdrop-blur">
      {imageModalUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setImageModalUrl(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl rounded-2xl border bg-background p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 pb-3">
              <p className="text-sm font-medium text-foreground">{imageModalAlt ?? "Preview"}</p>
              <Button variant="ghost" onClick={() => setImageModalUrl(null)}>
                Close
              </Button>
            </div>
            <div className="max-h-[75vh] overflow-auto">
              <img src={imageModalUrl} alt={imageModalAlt ?? "Preview"} className="w-full rounded-lg" />
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Vocabulary bank</p>
          <h2 className="text-2xl font-semibold text-foreground">Manage vocabulary</h2>
        </div>
        <Input
          placeholder="Search..."
          value={vocabSearch}
          onChange={(e) => setVocabSearch(e.target.value)}
          className="w-full max-w-xs"
        />
      </div>

      <div className="rounded-2xl border bg-background/70 p-5">
        <h3 className="text-lg font-semibold text-foreground">
          {editingVocabId ? "Edit vocabulary" : "Add new vocabulary"}
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input placeholder="Term (EN)" value={termEn} onChange={(e) => setTermEn(e.target.value)} />
          <Input placeholder="Term (PL)" value={termPl} onChange={(e) => setTermPl(e.target.value)} />
          <Input
            placeholder="Example (EN, optional)"
            value={exampleEn}
            onChange={(e) => setExampleEn(e.target.value)}
          />
          <Input
            placeholder="Example (PL, optional)"
            value={examplePl}
            onChange={(e) => setExamplePl(e.target.value)}
          />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Image (optional)</p>
            <Input
              type="file"
              accept="image/*"
              ref={imageInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setPendingImageFile(file);
                setRemoveImageOnSave(false);
              }}
              disabled={saving}
            />
            {(imageMediaId || pendingImageFile || imageWillBeRemoved) && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {pendingImageFile && <span>Pending image: {pendingImageFile.name}</span>}
                {pendingImageFile && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setPendingImageFile(null);
                      if (imageInputRef.current) imageInputRef.current.value = "";
                    }}
                    disabled={saving}
                  >
                    Clear
                  </Button>
                )}
                {!pendingImageFile && imageMediaId && <span>Image attached</span>}
                {imageWillBeRemoved && <span>File will be removed on save</span>}
                {!imageWillBeRemoved && imageMediaId && (
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      setPendingImageFile(null);
                      if (imageMediaId) {
                        setRemoveImageOnSave(true);
                        setPendingRemoveImageId(imageMediaId);
                        setImageMediaId(null);
                      }
                      if (imageInputRef.current) imageInputRef.current.value = "";
                    }}
                    disabled={saving}
                  >
                    Remove on save
                  </Button>
                )}
                {imageWillBeRemoved && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setRemoveImageOnSave(false);
                      if (pendingRemoveImageId) setImageMediaId(pendingRemoveImageId);
                      setPendingRemoveImageId(null);
                    }}
                    disabled={saving}
                  >
                    Undo
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Audio (optional)</p>
            <Input
              type="file"
              accept="audio/*"
              ref={audioInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setPendingAudioFile(file);
                setRemoveAudioOnSave(false);
              }}
              disabled={saving}
            />
            {(audioMediaId || pendingAudioFile || audioWillBeRemoved) && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {pendingAudioFile && <span>Pending audio: {pendingAudioFile.name}</span>}
                {pendingAudioFile && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setPendingAudioFile(null);
                      if (audioInputRef.current) audioInputRef.current.value = "";
                    }}
                    disabled={saving}
                  >
                    Clear
                  </Button>
                )}
                {!pendingAudioFile && audioMediaId && <span>Audio attached</span>}
                {audioWillBeRemoved && <span>File will be removed on save</span>}
                {!audioWillBeRemoved && audioMediaId && (
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      setPendingAudioFile(null);
                      if (audioMediaId) {
                        setRemoveAudioOnSave(true);
                        setPendingRemoveAudioId(audioMediaId);
                        setAudioMediaId(null);
                      }
                      if (audioInputRef.current) audioInputRef.current.value = "";
                    }}
                    disabled={saving}
                  >
                    Remove on save
                  </Button>
                )}
                {audioWillBeRemoved && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setRemoveAudioOnSave(false);
                      if (pendingRemoveAudioId) setAudioMediaId(pendingRemoveAudioId);
                      setPendingRemoveAudioId(null);
                    }}
                    disabled={saving}
                  >
                    Undo
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={async () => {
              setActionError(null);
              setSaving(true);
              const payload = {
                termEn: termEn.trim(),
                termPl: termPl.trim(),
                exampleEn: exampleEn.trim() ? exampleEn.trim() : null,
                examplePl: examplePl.trim() ? examplePl.trim() : null,
                imageMediaId,
                audioMediaId,
              };
              if (!payload.termEn || !payload.termPl) {
                setActionError("Provide both EN and PL terms.");
                setSaving(false);
                return;
              }

              try {
                let nextImageId = payload.imageMediaId;
                let nextAudioId = payload.audioMediaId;
                const prevImageId = pendingRemoveImageId ?? imageMediaId;
                const prevAudioId = pendingRemoveAudioId ?? audioMediaId;
                let newImageId: number | null = null;
                let newAudioId: number | null = null;

                if (pendingImageFile) {
                  const uploaded = await uploadMedia(pendingImageFile);
                  if (uploaded.type !== "IMAGE") throw new Error("Uploaded image has invalid type.");
                  nextImageId = uploaded.id;
                  newImageId = uploaded.id;
                } else if (removeImageOnSave) {
                  nextImageId = null;
                }

                if (pendingAudioFile) {
                  const uploaded = await uploadMedia(pendingAudioFile);
                  if (uploaded.type !== "AUDIO") throw new Error("Uploaded audio has invalid type.");
                  nextAudioId = uploaded.id;
                  newAudioId = uploaded.id;
                } else if (removeAudioOnSave) {
                  nextAudioId = null;
                }

                try {
                  if (editingVocabId) {
                    await updateVocabulary(editingVocabId, {
                      ...payload,
                      imageMediaId: nextImageId,
                      audioMediaId: nextAudioId,
                    });

                    if (removeImageOnSave && prevImageId) await removeMediaBestEffort(prevImageId);
                    if (removeAudioOnSave && prevAudioId) await removeMediaBestEffort(prevAudioId);
                    if (pendingImageFile && prevImageId && prevImageId !== nextImageId) {
                      await removeMediaBestEffort(prevImageId);
                    }
                    if (pendingAudioFile && prevAudioId && prevAudioId !== nextAudioId) {
                      await removeMediaBestEffort(prevAudioId);
                    }
                  } else {
                    await createVocabulary({
                      ...payload,
                      imageMediaId: nextImageId,
                      audioMediaId: nextAudioId,
                    });
                  }
                } catch (e) {
                  if (newImageId) await removeMediaBestEffort(newImageId);
                  if (newAudioId) await removeMediaBestEffort(newAudioId);
                  throw e;
                }
                setEditingVocabId(null);
                setTermEn("");
                setTermPl("");
                setExampleEn("");
                setExamplePl("");
                setImageMediaId(null);
                setAudioMediaId(null);
                setPendingImageFile(null);
                setPendingAudioFile(null);
                setRemoveImageOnSave(false);
                setRemoveAudioOnSave(false);
                setPendingRemoveImageId(null);
                setPendingRemoveAudioId(null);
                if (imageInputRef.current) imageInputRef.current.value = "";
                if (audioInputRef.current) audioInputRef.current.value = "";
                await vocabularyQuery.refetch();
              } catch (e: any) {
                setActionError(e?.message ?? "Failed to save vocabulary");
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
          >
            {editingVocabId ? "Save changes" : "Create vocabulary"}
          </Button>
          {editingVocabId && (
            <Button
              variant="ghost"
              onClick={() => {
                setEditingVocabId(null);
                setTermEn("");
                setTermPl("");
                setExampleEn("");
                setExamplePl("");
                setImageMediaId(null);
                setAudioMediaId(null);
                setPendingImageFile(null);
                setPendingAudioFile(null);
                setRemoveImageOnSave(false);
                setRemoveAudioOnSave(false);
                setPendingRemoveImageId(null);
                setPendingRemoveAudioId(null);
                if (imageInputRef.current) imageInputRef.current.value = "";
                if (audioInputRef.current) audioInputRef.current.value = "";
              }}
              disabled={saving}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Entries</p>
            <h3 className="text-xl font-semibold text-foreground">All vocabulary</h3>
          </div>
          {vocabularyQuery.data && (
            <p className="text-xs text-muted-foreground">{vocabularyQuery.data.totalElements} items</p>
          )}
        </div>

        {vocabularyQuery.isLoading && <p className="text-sm text-muted-foreground">Loading vocabulary...</p>}
        {vocabularyQuery.error && <p className="text-sm text-destructive">{String(vocabularyQuery.error)}</p>}
        {vocabularyQuery.data && (
          <>
            <ul className="space-y-3">
              {vocabularyQuery.data.content.map((item) => (
                <li key={item.id} className="rounded-xl border bg-background/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        {item.termEn} - {item.termPl}
                      </p>
                      {(item.exampleEn || item.examplePl) && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.exampleEn ?? ""} {item.examplePl ? ` / ${item.examplePl}` : ""}
                        </p>
                      )}
                      <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                        {item.imageMediaId && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span>Image attached</span>
                            {imagePreviewVisible[item.imageMediaId] ? (
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  setImagePreviewVisible((prev) => ({
                                    ...prev,
                                    [item.imageMediaId as number]: false,
                                  }));
                                }}
                              >
                                Hide
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                onClick={async () => {
                                  const id = item.imageMediaId as number;
                                  if (!imagePreviewUrls[id]) {
                                    try {
                                      const blob = await fetchMediaBlob(id);
                                      const url = URL.createObjectURL(blob);
                                      setImagePreviewUrls((prev) => ({ ...prev, [id]: url }));
                                    } catch {
                                      setActionError("Failed to load image preview");
                                      return;
                                    }
                                  }
                                  setImagePreviewVisible((prev) => ({ ...prev, [id]: true }));
                                }}
                              >
                                Preview
                              </Button>
                            )}
                          </div>
                        )}
                        {item.imageMediaId &&
                          imagePreviewUrls[item.imageMediaId] &&
                          imagePreviewVisible[item.imageMediaId] && (
                          <img
                            src={imagePreviewUrls[item.imageMediaId]}
                            alt={item.termEn}
                            className="mt-2 max-h-40 cursor-zoom-in rounded-lg border object-cover"
                            onClick={() => {
                              setImageModalUrl(imagePreviewUrls[item.imageMediaId as number]);
                              setImageModalAlt(item.termEn);
                            }}
                          />
                        )}
                        {item.audioMediaId && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span>Audio attached</span>
                            {audioPreviewVisible[item.audioMediaId] ? (
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  setAudioPreviewVisible((prev) => ({
                                    ...prev,
                                    [item.audioMediaId as number]: false,
                                  }));
                                }}
                              >
                                Hide
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                onClick={async () => {
                                  const id = item.audioMediaId as number;
                                  if (!audioPreviewUrls[id]) {
                                    try {
                                      const blob = await fetchMediaBlob(id);
                                      const url = URL.createObjectURL(blob);
                                      setAudioPreviewUrls((prev) => ({ ...prev, [id]: url }));
                                    } catch {
                                      setActionError("Failed to load audio preview");
                                      return;
                                    }
                                  }
                                  setAudioPreviewVisible((prev) => ({ ...prev, [id]: true }));
                                }}
                              >
                                Listen
                              </Button>
                            )}
                          </div>
                        )}
                        {item.audioMediaId &&
                          audioPreviewUrls[item.audioMediaId] &&
                          audioPreviewVisible[item.audioMediaId] && (
                          <audio className="mt-2 w-full" controls src={audioPreviewUrls[item.audioMediaId]} />
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingVocabId(item.id);
                          setTermEn(item.termEn);
                          setTermPl(item.termPl);
                          setExampleEn(item.exampleEn ?? "");
                          setExamplePl(item.examplePl ?? "");
                          setImageMediaId(item.imageMediaId ?? null);
                          setAudioMediaId(item.audioMediaId ?? null);
                          setPendingImageFile(null);
                          setPendingAudioFile(null);
                          setRemoveImageOnSave(false);
                          setRemoveAudioOnSave(false);
                          setPendingRemoveImageId(null);
                          setPendingRemoveAudioId(null);
                          if (imageInputRef.current) imageInputRef.current.value = "";
                          if (audioInputRef.current) audioInputRef.current.value = "";
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          const ok = window.confirm(`Delete "${item.termEn}"?`);
                          if (!ok) return;
                          setActionError(null);
                          try {
                            await deleteVocabulary(item.id);
                            if (item.imageMediaId) await removeMediaBestEffort(item.imageMediaId);
                            if (item.audioMediaId) await removeMediaBestEffort(item.audioMediaId);
                            await vocabularyQuery.refetch();
                          } catch (e: any) {
                            setActionError(e?.message ?? "Failed to delete vocabulary");
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                Page {vocabularyQuery.data.number + 1} / {vocabularyQuery.data.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  disabled={vocabularyQuery.data.number <= 0}
                  onClick={() => setVocabPage((p) => Math.max(0, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  variant="ghost"
                  disabled={vocabularyQuery.data.number + 1 >= vocabularyQuery.data.totalPages}
                  onClick={() => setVocabPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}



