"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Field, MediaPreview, Panel, inputClass } from "@/components/ui/AppUI";

function previewUrl(file) {
  return file ? URL.createObjectURL(file) : "";
}

function DropZone({ label, src, file, accept, onFile, onClear, fallback = "logo", fit = "cover" }) {
  const preview = file ? previewUrl(file) : src;
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted-8)]">{label}</span>
        {onClear ? (
          <button type="button" onClick={onClear} className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-danger)]">
            Clear
          </button>
        ) : null}
      </div>
      <label className="block cursor-pointer">
        <MediaPreview src={preview} fallback={fallback} fit={fit} className="h-40 w-full" />
        <input type="file" accept={accept} onChange={(event) => onFile(event.target.files?.[0] || null)} className="sr-only" />
      </label>
    </div>
  );
}

export default function SubmissionEditModal({ item, onClose, onSaved }) {
  const isFighter = item?.assetType === "fighter";
  const [draft, setDraft] = useState(() => ({
    name: item?.name || "",
    description: item?.description || "",
    studentName: item?.studentName || "",
    email: item?.email || "",
    period: item?.period || "",
    color: item?.color || "#e8001a",
    lore: item?.lore || "",
    entranceQuote: item?.entranceQuote || "",
    icon: item?.icon || "*",
    difficulty: item?.difficulty || 1,
  }));
  const [files, setFiles] = useState({});
  const [clearMoves, setClearMoves] = useState({ left: false, right: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSave = useMemo(() => draft.name.trim() && draft.description.trim(), [draft.description, draft.name]);

  function updateDraft(patch) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function updateFile(key, file) {
    setFiles((current) => ({ ...current, [key]: file }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const id = item?._id || item?.id;
      const formData = new FormData();
      formData.set("action", "edit");
      formData.set("assetType", item?.assetType || "fighter");
      Object.entries(draft).forEach(([key, value]) => formData.set(key, String(value ?? "")));
      if (files.iconFile) formData.set("iconFile", files.iconFile);
      if (files.artFile) formData.set("artFile", files.artFile);
      if (files.moveLeftArtFile) formData.set("moveLeftArtFile", files.moveLeftArtFile);
      if (files.moveRightArtFile) formData.set("moveRightArtFile", files.moveRightArtFile);
      if (files.bgFile) formData.set("bgFile", files.bgFile);
      if (clearMoves.left) formData.set("clearMoveLeftArt", "1");
      if (clearMoves.right) formData.set("clearMoveRightArt", "1");

      const response = await fetch(`/api/general-submissions/${id}`, { method: "PATCH", body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to edit submission.");
      onSaved?.(payload.submission);
    } catch (saveError) {
      setError(saveError.message || "Failed to edit submission.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:p-6" onClick={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <div className="mx-auto w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
        <Panel className="overflow-hidden">
          <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-3 border-b border-[color:var(--color-surface-border-3)] p-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[var(--color-text-muted-7)]">Edit Asset</p>
              <h2 className="mt-2 font-[var(--font-name)] text-4xl leading-none tracking-normal text-white">{draft.name || "Untitled"}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" tone="neutral" onClick={onClose}>Cancel</Button>
              <Button type="submit" tone="gold" disabled={!canSave || saving}>{saving ? "Saving" : "Save changes"}</Button>
            </div>
          </div>

          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="grid content-start gap-4">
              {error ? <Alert tone="red">{error}</Alert> : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Asset name">
                  <input value={draft.name} onChange={(event) => updateDraft({ name: event.target.value.toUpperCase() })} className={inputClass} />
                </Field>
                <Field label="Period / class">
                  <input value={draft.period} onChange={(event) => updateDraft({ period: event.target.value })} className={inputClass} />
                </Field>
              </div>
              <Field label="Description">
                <textarea value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} rows={4} className={`${inputClass} resize-none leading-6`} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Student name">
                  <input value={draft.studentName} onChange={(event) => updateDraft({ studentName: event.target.value })} className={inputClass} />
                </Field>
                <Field label="Email">
                  <input value={draft.email || ""} onChange={(event) => updateDraft({ email: event.target.value })} className={inputClass} />
                </Field>
              </div>

              {isFighter ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Theme color">
                      <input type="color" value={draft.color} onChange={(event) => updateDraft({ color: event.target.value })} className={`${inputClass} h-12 p-1`} />
                    </Field>
                    <Field label="Entrance quote">
                      <input value={draft.entranceQuote} onChange={(event) => updateDraft({ entranceQuote: event.target.value })} className={inputClass} />
                    </Field>
                  </div>
                  <Field label="Lore">
                    <textarea value={draft.lore} onChange={(event) => updateDraft({ lore: event.target.value })} rows={3} className={`${inputClass} resize-none leading-6`} />
                  </Field>
                </>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Arena symbol">
                    <input value={draft.icon} onChange={(event) => updateDraft({ icon: event.target.value.slice(0, 4) || "*" })} className={inputClass} />
                  </Field>
                  <Field label={`Difficulty ${draft.difficulty}`}>
                    <input type="range" min="1" max="10" value={draft.difficulty} onChange={(event) => updateDraft({ difficulty: Number.parseInt(event.target.value, 10) || 1 })} className="h-12 w-full accent-[var(--gold)]" />
                  </Field>
                </div>
              )}
            </div>

            <div className="grid content-start gap-4">
              {isFighter ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DropZone label="Icon" src={item?.iconSrc} file={files.iconFile} accept="image/*" fit="contain" fallback={item?.element || "*"} onFile={(file) => updateFile("iconFile", file)} />
                    <DropZone label="Idle GIF / video" src={item?.artSrc} file={files.artFile} accept="image/gif,video/*" fit="contain" fallback={item?.element || "*"} onFile={(file) => updateFile("artFile", file)} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DropZone label="Move left" src={clearMoves.left ? "" : item?.moveLeftArtSrc} file={files.moveLeftArtFile} accept="image/gif,video/*" fit="contain" fallback="L" onFile={(file) => { updateFile("moveLeftArtFile", file); setClearMoves((current) => ({ ...current, left: false })); }} onClear={() => { updateFile("moveLeftArtFile", null); setClearMoves((current) => ({ ...current, left: true })); }} />
                    <DropZone label="Move right" src={clearMoves.right ? "" : item?.moveRightArtSrc} file={files.moveRightArtFile} accept="image/gif,video/*" fit="contain" fallback="R" onFile={(file) => { updateFile("moveRightArtFile", file); setClearMoves((current) => ({ ...current, right: false })); }} onClear={() => { updateFile("moveRightArtFile", null); setClearMoves((current) => ({ ...current, right: true })); }} />
                  </div>
                </>
              ) : (
                <DropZone label="Arena background" src={item?.bgSrc} file={files.bgFile} accept="image/*,video/*" fallback={item?.icon || "*"} onFile={(file) => updateFile("bgFile", file)} />
              )}
            </div>
          </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}
