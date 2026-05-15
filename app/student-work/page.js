"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import SubmissionEditModal from "@/components/SubmissionEditModal";
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
  StatCard,
  TopNav,
  inputClass,
  itemMotion,
  listMotion,
} from "@/components/ui/AppUI";

function formatRecovery(value) {
  if (!value) return "Recovery window unknown";
  const until = new Date(value);
  if (Number.isNaN(until.getTime())) return "Recovery window unknown";
  const hours = Math.max(0, Math.ceil((until.getTime() - Date.now()) / (60 * 60 * 1000)));
  return `${hours}h left to recover`;
}

function actionMessage(action) {
  if (action === "delete") return "Asset moved to deleted. It can be restored for 24 hours.";
  if (action === "restore") return "Asset restored.";
  if (action === "edit") return "Asset edited.";
  if (action === "hide") return "Asset hidden.";
  if (action === "show") return "Asset shown.";
  return "Asset updated.";
}

function StudentWorkCard({ item, mode, onAction, busyId }) {
  const id = item._id || item.id;
  const isFighter = item.assetType === "fighter";
  const media = isFighter ? item.artSrc || item.iconSrc : item.bgSrc;
  const toneClass =
    mode === "deleted"
      ? "border-[color:var(--danger-66)] text-[var(--color-danger)] bg-[color:var(--color-danger-bg-2)]"
      : mode === "hidden"
        ? "border-[color:var(--gold-55)] text-[var(--gold)] bg-[color:var(--gold-10)]"
        : "border-[color:var(--success-52)] text-[var(--color-success)] bg-[rgba(103,224,143,0.12)]";

  return (
    <motion.article variants={itemMotion}>
      <Panel hover className="overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
          <MediaPreview src={media} fit={isFighter ? "contain" : "cover"} fallback={isFighter ? item.element : item.icon} className="h-52 rounded-none border-0 border-b border-[color:var(--color-surface-border-3)] lg:h-full lg:border-b-0 lg:border-r" />
          <div className="grid gap-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-[var(--font-name)] text-4xl leading-none tracking-normal" style={{ color: isFighter ? item.color || "var(--gold)" : "var(--gold)" }}>
                  {item.name || "Untitled"}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  {item.studentName || item.createdByUserName || "Student"} / {item.period || "No period"} / {item.email || "No email"}
                </p>
              </div>
              <span className={`w-fit rounded-md border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${toneClass}`}>
                {mode === "deleted" ? `Deleted / ${formatRecovery(item.recoverUntil)}` : mode === "hidden" ? "Hidden" : "Approved"}
              </span>
            </div>
            <p className="text-sm leading-6 text-[var(--color-text-muted)]">{item.description || "No description."}</p>
            <div className="flex flex-wrap gap-2">
              {mode === "deleted" ? (
                <Button tone="green" disabled={busyId === id} onClick={() => onAction(id, "restore")}>Restore</Button>
              ) : (
                <>
                  <Button tone="blue" disabled={busyId === id} onClick={() => onAction(id, "edit", item)}>Edit</Button>
                  <Button tone="neutral" disabled={busyId === id} onClick={() => onAction(id, mode === "hidden" ? "show" : "hide")}>
                    {mode === "hidden" ? "Show" : "Hide"}
                  </Button>
                  <Button tone="red" disabled={busyId === id} onClick={() => onAction(id, "delete")}>Delete</Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Panel>
    </motion.article>
  );
}

export default function StudentWorkPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [deletedSubmissions, setDeletedSubmissions] = useState([]);
  const [assetFilter, setAssetFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("approved");
  const [editingSubmission, setEditingSubmission] = useState(null);

  const isTeacher = Boolean(session?.isAdmin || (session?.user?.role === "teacher" && !session?.user?.mustChangePassword));

  const loadSession = useCallback(async () => {
    const response = await fetch("/api/session", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Failed to load session.");
    setSession(payload);
    if (payload?.user?.role === "teacher" && payload.user.mustChangePassword) router.replace("/change-password");
    return payload;
  }, [router]);

  const loadSubmissions = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("status", "all");
    params.set("assetType", assetFilter);
    if (periodFilter.trim()) params.set("period", periodFilter.trim());
    const deletedParams = new URLSearchParams(params);
    deletedParams.set("includeDeleted", "1");

    const [activeResponse, deletedResponse] = await Promise.all([
      fetch(`/api/general-submissions?${params.toString()}`, { cache: "no-store" }),
      fetch(`/api/general-submissions?${deletedParams.toString()}`, { cache: "no-store" }),
    ]);
    const activePayload = await activeResponse.json();
    const deletedPayload = await deletedResponse.json();
    if (!activeResponse.ok) throw new Error(activePayload.error || "Failed to load student work.");
    if (!deletedResponse.ok) throw new Error(deletedPayload.error || "Failed to load deleted work.");

    setSubmissions(Array.isArray(activePayload.submissions) ? activePayload.submissions : []);
    setDeletedSubmissions(Array.isArray(deletedPayload.submissions) ? deletedPayload.submissions : []);
  }, [assetFilter, periodFilter]);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      setLoading(true);
      setError("");
      try {
        const nextSession = await loadSession();
        if (!cancelled && nextSession?.isAdmin) await loadSubmissions();
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || "Failed to load student work.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [loadSession, loadSubmissions]);

  const studentSubmissions = useMemo(() => submissions.filter((item) => String(item?.createdByRole || "student").toLowerCase() !== "teacher"), [submissions]);
  const studentDeletedSubmissions = useMemo(() => deletedSubmissions.filter((item) => String(item?.createdByRole || "student").toLowerCase() !== "teacher"), [deletedSubmissions]);
  const teacherSubmissions = useMemo(() => submissions.filter((item) => String(item?.createdByRole || "").toLowerCase() === "teacher"), [submissions]);
  const teacherDeletedSubmissions = useMemo(() => deletedSubmissions.filter((item) => String(item?.createdByRole || "").toLowerCase() === "teacher"), [deletedSubmissions]);
  const visibleWork = useMemo(() => studentSubmissions.filter((item) => item.status === "approved" && !item.isHidden), [studentSubmissions]);
  const hiddenWork = useMemo(() => studentSubmissions.filter((item) => item.status === "approved" && item.isHidden), [studentSubmissions]);
  const pendingWork = useMemo(() => studentSubmissions.filter((item) => item.status === "pending"), [studentSubmissions]);
  const teacherAssets = useMemo(() => teacherSubmissions.filter((item) => item.status !== "deleted"), [teacherSubmissions]);

  const tabConfig = useMemo(
    () => ({
      approved: { label: "Approved", title: "Approved submissions", count: visibleWork.length, mode: "visible", items: visibleWork, empty: "No approved student work matches this filter.", tone: "green" },
      hidden: { label: "Hidden", title: "Hidden submissions", count: hiddenWork.length, mode: "hidden", items: hiddenWork, empty: "No hidden student work matches this filter.", tone: "gold" },
      deleted: { label: "Deleted", title: "Deleted submissions", count: studentDeletedSubmissions.length, mode: "deleted", items: studentDeletedSubmissions, empty: "No recoverable deleted student work.", tone: "red" },
      teacher: { label: "Teacher Assets", title: "Teacher Assets", count: teacherAssets.length, mode: "visible", items: teacherAssets, empty: "No teacher showcase assets match this filter.", tone: "blue" },
      teacherDeleted: { label: "Deleted Teacher Assets", title: "Deleted Teacher Assets", count: teacherDeletedSubmissions.length, mode: "deleted", items: teacherDeletedSubmissions, empty: "No recoverable deleted teacher assets.", tone: "red" },
    }),
    [hiddenWork, studentDeletedSubmissions, teacherAssets, teacherDeletedSubmissions, visibleWork]
  );
  const activeTabConfig = tabConfig[activeTab] || tabConfig.approved;

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
      if (!response.ok) throw new Error(payload.error || "Failed to update student work.");
      setStatus(actionMessage(action));
      await loadSubmissions();
    } catch (actionError) {
      setError(actionError.message || "Failed to update student work.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <AppShell>
      <TopNav session={session} />
      <div className="grid gap-5">
        <Panel className="p-5 sm:p-7">
          <SectionHeader label="Assets" title="Student Submissions">
            Review approved, hidden, and recently deleted student submissions without leaving the teacher workspace.
          </SectionHeader>
        </Panel>

        {error ? <Alert tone="red">{error}</Alert> : null}
        {status ? <Alert tone="gold">{status}</Alert> : null}

        {!loading && !isTeacher ? (
          <EmptyState title="Teacher login required" action={<Button href="/login?callbackUrl=/student-work" tone="gold">Login</Button>}>
            Student submission controls are limited to teachers.
          </EmptyState>
        ) : null}

        {isTeacher ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Approved" value={visibleWork.length} tone="green" />
              <StatCard label="Pending" value={pendingWork.length} tone="gold" />
              <StatCard label="Hidden" value={hiddenWork.length} tone="gold" />
              <StatCard label="Deleted" value={studentDeletedSubmissions.length} tone="red" />
            </div>

            <Panel className="p-4">
              <div className="grid gap-3 lg:grid-cols-[240px_240px_minmax(0,1fr)] lg:items-end">
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
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {Object.entries(tabConfig).map(([key, tab]) => (
                    <Button key={key} tone={activeTab === key ? tab.tone : "neutral"} onClick={() => setActiveTab(key)}>
                      {tab.label} ({tab.count})
                    </Button>
                  ))}
                </div>
              </div>
            </Panel>

            <section className="grid gap-4">
              <SectionHeader label={`${activeTabConfig.count} items`} title={activeTabConfig.title} />
              {activeTabConfig.items.length ? (
                <motion.div variants={listMotion.variants} initial="hidden" animate="show" className="grid gap-4">
                  {activeTabConfig.items.map((item) => (
                    <StudentWorkCard key={item._id || item.id} item={item} mode={activeTabConfig.mode} onAction={handleAction} busyId={busyId} />
                  ))}
                </motion.div>
              ) : (
                <EmptyState title="Nothing here yet">{activeTabConfig.empty}</EmptyState>
              )}
            </section>
          </>
        ) : null}
      </div>
      {editingSubmission ? (
        <SubmissionEditModal
          item={editingSubmission}
          onClose={() => setEditingSubmission(null)}
          onSaved={async () => {
            setEditingSubmission(null);
            setStatus(actionMessage("edit"));
            await loadSubmissions();
          }}
        />
      ) : null}
    </AppShell>
  );
}
