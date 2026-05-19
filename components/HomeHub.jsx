"use client";

import { AnimatePresence, motion } from "framer-motion";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import CustomCharactersManager from "@/components/CharacterSelects/CustomCharactersManager";
import SubmissionEditModal from "@/components/SubmissionEditModal";
import { uploadFileDirectToS3 } from "@/lib/direct-upload";
import {
  Alert,
  AppShell,
  Button,
  EmptyState,
  Field,
  MediaPreview,
  Panel,
  SectionHeader,
  SelectControl,
  SiteLogoMark,
  StatCard,
  TopNav,
  inputClass,
  isVideo,
  itemMotion,
  listMotion,
} from "@/components/ui/AppUI";

const emptyDraft = {
  assetType: "fighter",
  mode: "submit",
  joinCode: "",
  studentName: "",
  email: "",
  period: "",
  name: "",
  description: "",
  color: "#e8001a",
  accent: "#ff6644",
  element: "*",
  icon: "*",
  difficulty: 1,
  iconFile: null,
  artFile: null,
  moveLeftArtFile: null,
  moveRightArtFile: null,
  bgFile: null,
  lore: "",
  entranceQuote: "",
};

function previewUrl(file) {
  return file ? URL.createObjectURL(file) : "";
}

const submissionUploadFields = {
  fighter: [
    ["iconFile", "character-icons", "icon"],
    ["artFile", "character-art", "idle"],
    ["moveLeftArtFile", "character-art", "left"],
    ["moveRightArtFile", "character-art", "right"],
  ],
  arena: [["bgFile", "arena-backgrounds", "arena"]],
};

function DropZone({ label, value, file, accept, onFile, required = false, className = "aspect-[4/3]" }) {
  const src = file ? previewUrl(file) : value;
  return (
    <label className="group grid cursor-pointer gap-2">
      <span className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted-8)]">
        {label}{required ? " *" : ""}
      </span>
      <div className={`relative grid place-items-center overflow-hidden rounded-lg border border-dashed border-[color:var(--color-surface-border-7)] bg-black/35 transition group-hover:border-[color:var(--gold-55)] group-hover:bg-[color:var(--gold-06)] ${className}`}>
        {src ? (
          isVideo(src) ? (
            <video src={src} autoPlay loop muted playsInline className="h-full w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="h-full w-full object-cover" />
          )
        ) : (
          <span className="px-4 text-center text-xs font-black uppercase tracking-[0.24em] text-[var(--color-text-muted-9)]">
            Choose file
          </span>
        )}
      </div>
      <input type="file" accept={accept} onChange={(event) => onFile(event.target.files?.[0] || null)} className="sr-only" />
    </label>
  );
}

function SubmissionCard({ item, onAction, busyId }) {
  const id = item._id || item.id;
  const isFighter = item.assetType === "fighter";
  const media = isFighter ? item.artSrc || item.iconSrc : item.bgSrc;
  const statusTone = item.status === "approved" ? "green" : item.status === "pending" ? "gold" : "red";

  return (
    <motion.article variants={itemMotion}>
      <Panel hover className="overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[180px_minmax(0,1fr)]">
          <MediaPreview src={media} fit={isFighter ? "contain" : "cover"} fallback={isFighter ? item.element : item.icon} className="h-44 rounded-none border-0 border-b border-[color:var(--color-surface-border-3)] md:h-full md:border-b-0 md:border-r" />
          <div className="grid gap-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-[var(--font-name)] text-2xl leading-none tracking-normal" style={{ color: isFighter ? item.color || "var(--gold)" : "var(--gold)" }}>
                  {item.name || "Untitled"}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  {item.studentName || item.createdByUserName || "Student"} / {item.period || "No period"} / {item.email || "No email"}
                </p>
              </div>
              <span className={`w-fit rounded-md border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${statusTone === "green" ? "border-[color:var(--success-52)] text-[var(--color-success)]" : statusTone === "gold" ? "border-[color:var(--gold-55)] text-[var(--gold)]" : "border-[color:var(--danger-66)] text-[var(--color-danger)]"}`}>
                {String(item.status || "pending").toUpperCase()}{item.isHidden ? " / HIDDEN" : ""}
              </span>
            </div>
            <p className="text-sm leading-6 text-[var(--color-text-muted)]">{item.description || "No description added."}</p>
            <div className="flex flex-wrap gap-2">
              <Button tone="green" disabled={busyId === id} onClick={() => onAction(id, "approve")}>Approve</Button>
              <Button tone="red" disabled={busyId === id} onClick={() => onAction(id, "deny")}>Deny</Button>
              <Button tone="blue" disabled={busyId === id} onClick={() => onAction(id, "edit", item)}>Edit</Button>
              <Button tone="neutral" disabled={busyId === id} onClick={() => onAction(id, item.isHidden ? "show" : "hide")}>
                {item.isHidden ? "Show" : "Hide"}
              </Button>
              <Button tone="red" disabled={busyId === id} onClick={() => onAction(id, "delete")}>Delete</Button>
            </div>
          </div>
        </div>
      </Panel>
    </motion.article>
  );
}

export default function HomeHub() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [generalClass, setGeneralClass] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [submissions, setSubmissions] = useState([]);
  const [assetFilter, setAssetFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [managerOpen, setManagerOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState(null);

  const isTeacher = Boolean(session?.isAdmin || (session?.user?.role === "teacher" && !session?.user?.mustChangePassword));

  const studentSubmissions = useMemo(
    () => submissions.filter((item) => String(item?.createdByRole || "student").toLowerCase() !== "teacher"),
    [submissions]
  );
  const counts = useMemo(
    () => ({
      total: studentSubmissions.length,
      pending: studentSubmissions.filter((item) => item.status === "pending").length,
      approved: studentSubmissions.filter((item) => item.status === "approved" && !item.isHidden).length,
      hidden: studentSubmissions.filter((item) => item.isHidden).length,
    }),
    [studentSubmissions]
  );
  const approvalQueue = useMemo(
    () => studentSubmissions.filter((item) => item.status === "pending"),
    [studentSubmissions]
  );

  const loadSession = useCallback(async () => {
    const response = await fetch("/api/session", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Failed to load session.");
    setSession(payload);
    setGeneralClass(payload.currentClass || null);
    return payload;
  }, []);

  const loadSubmissions = useCallback(async () => {
    if (!isTeacher) return;
    const params = new URLSearchParams();
    params.set("status", "all");
    params.set("assetType", assetFilter);
    if (periodFilter.trim()) params.set("period", periodFilter.trim());
    const response = await fetch(`/api/general-submissions?${params.toString()}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Failed to load submissions.");
    setSubmissions(Array.isArray(payload.submissions) ? payload.submissions : []);
  }, [assetFilter, isTeacher, periodFilter]);

  useEffect(() => {
    loadSession().catch((loadError) => setError(loadError.message || "Failed to load."));
  }, [loadSession]);

  useEffect(() => {
    if (session?.user?.role === "teacher" && session.user.mustChangePassword) {
      router.replace("/change-password");
    }
  }, [router, session]);

  useEffect(() => {
    loadSubmissions().catch((loadError) => setError(loadError.message || "Failed to load submissions."));
  }, [loadSubmissions]);

  const canSubmit = useMemo(() => {
    if (!draft.name.trim() || !draft.description.trim()) return false;
    if (draft.assetType === "fighter" && (!draft.iconFile || !draft.artFile)) return false;
    if (draft.assetType === "arena" && !draft.bgFile) return false;
    if (draft.mode === "test") return true;
    return isTeacher || Boolean(draft.studentName.trim() && draft.period.trim());
  }, [draft, isTeacher]);

  function updateDraft(patch) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setStatus("");
    try {
      if (!canSubmit) throw new Error("Complete all required fields before submitting.");
      const formData = new FormData();
      Object.entries(draft).forEach(([key, value]) => {
        if (!(value instanceof File) && value !== null && value !== undefined) formData.append(key, String(value));
      });
      for (const [field, folder, suffix] of submissionUploadFields[draft.assetType] || []) {
        const file = draft[field];
        if (!(file instanceof File)) continue;
        const upload = await uploadFileDirectToS3({
          file,
          folder,
          namePrefix: `${draft.name || "upload"}-${suffix}`,
        });
        formData.set(field.replace("File", "Src"), upload.url);
        formData.set(field.replace("File", "Key"), upload.key);
      }
      formData.set("joinCode", generalClass?.joinCode || "");
      const response = await fetch("/api/general-submissions", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to upload.");
      setStatus(draft.mode === "test" ? "Test upload saved for 12 hours. Open the arena to try it." : isTeacher ? "Teacher upload added to showcase." : "Submitted for teacher approval.");
      setDraft({
        ...emptyDraft,
        joinCode: generalClass?.joinCode || "",
        studentName: draft.studentName,
        email: draft.email,
        period: draft.period,
        mode: draft.mode,
        assetType: draft.assetType,
      });
      await loadSubmissions();
    } catch (submitError) {
      setError(submitError.message || "Failed to upload.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAction(id, action, item = null) {
    if (action === "edit") {
      setEditingSubmission(item);
      return;
    }

    setBusyId(id);
    setError("");
    setStatus("");
    try {
      let body = { action };
      const response = await fetch(`/api/general-submissions/${id}`, {
        method: action === "delete" ? "DELETE" : "PATCH",
        headers: action === "delete" ? undefined : { "Content-Type": "application/json" },
        body: action === "delete" ? undefined : JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to update submission.");
      setStatus(action === "delete" ? "Submission moved to deleted work. You have 24 hours to recover it." : action === "edit" ? "Submission edited." : `Submission ${action}d.`);
      await loadSubmissions();
    } catch (actionError) {
      setError(actionError.message || "Failed to update submission.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <AppShell>
      <TopNav session={session} onSignOut={() => signOut({ callbackUrl: "/" })} />

      <div className="grid gap-5">
        <Panel className="overflow-hidden">
          <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.32em] text-[var(--gold)]">Arcade classroom showcase</p>
              <h1 className="mt-4 font-[var(--font-name)] text-5xl leading-[0.9] tracking-normal text-white sm:text-7xl">
                Press Start
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--color-text-muted)]">
                Pick fighters. Choose a stage. Launch the scene.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button href="/showcase" tone="blue">Showcase</Button>
                
              </div>
            </div>
            <div className="grid gap-3 rounded-lg border border-[color:var(--color-surface-border-4)] bg-black/25 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black uppercase tracking-[0.3em] text-[var(--color-text-muted-7)]">Class code</span>
                <span className="rounded-md border border-[color:var(--success-52)] bg-[rgba(103,224,143,0.12)] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-success)]">Public</span>
              </div>
              <div>
                <p className="font-[var(--font-name)] text-4xl leading-none tracking-normal text-[var(--gold)]">
                  {generalClass?.joinCode || "Loading"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Pending" value={counts.pending} tone="gold" />
                <StatCard label="Approved" value={counts.approved} tone="green" />
              </div>
            </div>
          </div>
        </Panel>

        {error ? <Alert tone="red">{error}</Alert> : null}
        {status ? <Alert tone="gold">{status}</Alert> : null}

        <section className="grid gap-4">
            <SectionHeader
              label="Assets"
              title="Submit"
            action={
              <>
                <Button href="/gif-editor" tone="neutral">GIF Editor</Button>
                <Button tone={uploadOpen ? "neutral" : "gold"} onClick={() => setUploadOpen((open) => !open)}>{uploadOpen ? "Close upload" : "Open upload"}</Button>
              </>
            }
          />

          <AnimatePresence initial={false}>
            {uploadOpen ? (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.28 }}
                onSubmit={handleSubmit}
                className="overflow-hidden"
              >
                <Panel className="overflow-hidden">
                  <div className="grid gap-4 border-b border-[color:var(--color-surface-border-3)] p-4 lg:grid-cols-2 lg:items-center">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" tone={draft.mode === "submit" ? "gold" : "neutral"} onClick={() => updateDraft({ mode: "submit" })}>Submit to showcase</Button>
                      <Button type="button" tone={draft.mode === "test" ? "blue" : "neutral"} onClick={() => updateDraft({ mode: "test" })}>Test for 12h</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <Button type="button" tone={draft.assetType === "fighter" ? "gold" : "neutral"} onClick={() => updateDraft({ assetType: "fighter" })}>Fighter</Button>
                      <Button type="button" tone={draft.assetType === "arena" ? "gold" : "neutral"} onClick={() => updateDraft({ assetType: "arena" })}>Arena</Button>
                    </div>
                  </div>

                  <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-[0.85fr_1.15fr]">
                    <div className="grid content-start gap-4">
                      <h3 className="font-[var(--font-name)] text-3xl tracking-normal text-white">Student</h3>
                      {draft.mode !== "test" ? (
                        <>
                          <div className="rounded-lg border border-[color:var(--gold-35)] bg-[color:var(--gold-06)] p-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted-8)]">Class code</p>
                            <p className="mt-2 font-[var(--font-name)] text-3xl text-[var(--gold)]">{generalClass?.joinCode || "Loading"}</p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Student name *">
                              <input value={draft.studentName} onChange={(event) => updateDraft({ studentName: event.target.value })} placeholder="Your name" className={inputClass} />
                            </Field>
                            <Field label="Period / class *">
                              <input value={draft.period} onChange={(event) => updateDraft({ period: event.target.value })} placeholder="Period 2" className={inputClass} />
                            </Field>
                          </div>
                          <Field label="Email optional">
                            <input value={draft.email} onChange={(event) => updateDraft({ email: event.target.value })} placeholder="name@example.com" className={inputClass} />
                          </Field>
                        </>
                      ) : (
                        <p className="rounded-lg border border-[color:var(--blue-33)] bg-[color:var(--color-blue-bg)] p-4 text-sm leading-6 text-[var(--color-text-muted)]">
                          Test mode skips class details and saves the upload temporarily so it can be tried in the arena.
                        </p>
                      )}
                    </div>

                    <div className="grid content-start gap-4">
                      <h3 className="font-[var(--font-name)] text-3xl tracking-normal text-white">Artwork</h3>
                      {draft.assetType === "fighter" ? (
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <DropZone label="Icon" file={draft.iconFile} accept="image/*" onFile={(file) => updateDraft({ iconFile: file })} required />
                          <DropZone label="Idle GIF/video" file={draft.artFile} accept="image/gif,video/*" onFile={(file) => updateDraft({ artFile: file })} required />
                          <DropZone label="Move left" file={draft.moveLeftArtFile} accept="image/gif,video/*" onFile={(file) => updateDraft({ moveLeftArtFile: file })} />
                          <DropZone label="Move right" file={draft.moveRightArtFile} accept="image/gif,video/*" onFile={(file) => updateDraft({ moveRightArtFile: file })} />
                        </div>
                      ) : (
                        <DropZone label="Arena background" file={draft.bgFile} accept="image/*,video/*" onFile={(file) => updateDraft({ bgFile: file })} required className="aspect-[16/7]" />
                      )}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label={draft.assetType === "arena" ? "Arena name *" : "Fighter name *"}>
                          <input value={draft.name} onChange={(event) => updateDraft({ name: event.target.value.toUpperCase() })} placeholder="Name" className={inputClass} />
                        </Field>
                        {draft.assetType === "fighter" ? (
                          <Field label="Theme color">
                            <input value={draft.color} onChange={(event) => updateDraft({ color: event.target.value })} type="color" className={`${inputClass} h-12 p-1`} />
                          </Field>
                        ) : (
                          <Field label={`Difficulty ${draft.difficulty}`}>
                            <input value={draft.difficulty} onChange={(event) => updateDraft({ difficulty: Number.parseInt(event.target.value, 10) || 1 })} type="range" min="1" max="10" step="1" className="h-12 w-full accent-[var(--gold)]" />
                          </Field>
                        )}
                      </div>
                      <Field label="Description *">
                        <textarea value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} rows={3} placeholder="Short description" className={`${inputClass} resize-none leading-6`} />
                      </Field>
                      {draft.assetType === "fighter" ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Lore optional">
                            <textarea value={draft.lore} onChange={(event) => updateDraft({ lore: event.target.value })} rows={2} maxLength={260} placeholder="Optional backstory" className={`${inputClass} resize-none leading-6`} />
                          </Field>
                          <Field label="Entrance quote optional">
                            <input value={draft.entranceQuote} onChange={(event) => updateDraft({ entranceQuote: event.target.value })} maxLength={120} placeholder="One-line quote" className={inputClass} />
                          </Field>
                        </div>
                      ) : (
                        <Field label="Arena symbol">
                          <input value={draft.icon} onChange={(event) => updateDraft({ icon: event.target.value.slice(0, 4) || "*" })} placeholder="*" className={inputClass} />
                        </Field>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end border-t border-[color:var(--color-surface-border-3)] p-4">
                    <Button type="submit" disabled={!canSubmit || saving} tone="green">
                      {saving ? "Uploading" : draft.mode === "test" ? "Save test" : isTeacher ? "Add to showcase" : "Send for approval"}
                    </Button>
                  </div>
                </Panel>
              </motion.form>
            ) : null}
          </AnimatePresence>
        </section>

        {isTeacher ? (
          <section className="grid gap-4">
            <SectionHeader
              label="Moderation"
              title="Approvals"
              action={
                <>
                  <Button href="/student-work" tone="blue">Student Work</Button>
                  <Button onClick={() => setManagerOpen(true)} tone="gold">Teacher Assets</Button>
                </>
              }
            />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Uploads" value={counts.total} tone="gold" />
              <StatCard label="Pending" value={counts.pending} tone="gold" />
              <StatCard label="Approved" value={counts.approved} tone="green" />
              <StatCard label="Hidden" value={counts.hidden} tone="red" />
            </div>

            <Panel className="p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectControl
                  label="Asset type"
                  value={assetFilter}
                  onChange={setAssetFilter}
                  options={[
                    { value: "all", label: "All" },
                    { value: "fighter", label: "Fighters" },
                    { value: "arena", label: "Arenas" },
                  ]}
                />
                <Field label="Period">
                  <input value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)} placeholder="Period 2" className={inputClass} />
                </Field>
              </div>
            </Panel>

            {approvalQueue.length === 0 ? (
              <EmptyState title="No pending uploads" />
            ) : (
              <motion.div variants={listMotion.variants} initial="hidden" animate="show" className="grid gap-4">
                {approvalQueue.map((item) => (
                  <SubmissionCard key={item._id || item.id} item={item} onAction={handleAction} busyId={busyId} />
                ))}
              </motion.div>
            )}
          </section>
        ) : null}
      </div>

      {managerOpen ? <CustomCharactersManager modal onClose={() => setManagerOpen(false)} initialTab="my-gallery" /> : null}
      {editingSubmission ? (
        <SubmissionEditModal
          item={editingSubmission}
          onClose={() => setEditingSubmission(null)}
          onSaved={async () => {
            setEditingSubmission(null);
            setStatus("Submission edited.");
            await loadSubmissions();
          }}
        />
      ) : null}
    </AppShell>
  );
}
