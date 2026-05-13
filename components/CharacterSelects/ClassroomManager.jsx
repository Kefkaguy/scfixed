"use client";

import { signOut } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Alert,
  AppShell,
  Button,
  EmptyState,
  Field,
  Panel,
  SectionHeader,
  StatCard,
  TopNav,
  inputClass,
  itemMotion,
  listMotion,
} from "@/components/ui/AppUI";

function ClassCard({ classItem, isActiveClass, updatingId, onCopy, onActivate, onOpenShowcase, onToggleLock, onDelete, onCapacity }) {
  const disabled = updatingId === classItem._id;
  return (
    <motion.article variants={itemMotion}>
      <Panel hover className="p-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-[var(--font-name)] text-4xl leading-none tracking-normal text-white">{classItem.name}</h3>
              {isActiveClass ? <span className="rounded-md border border-[color:var(--gold-55)] bg-[color:var(--gold-10)] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">Active</span> : null}
              <span className={`rounded-md border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${classItem.isLocked ? "border-[color:var(--danger-66)] bg-[color:var(--color-danger-bg-2)] text-[var(--color-danger)]" : "border-[color:var(--success-52)] bg-[rgba(103,224,143,0.12)] text-[var(--color-success)]"}`}>
                {classItem.isLocked ? "Locked" : "Open"}
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Join code <span className="font-black text-[var(--gold)]">{classItem.joinCode}</span> / {classItem.memberCount} of {classItem.maxMembers} students
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[90px_repeat(5,auto)] sm:items-center">
            <input
              defaultValue={classItem.maxMembers}
              aria-label={`Capacity for ${classItem.name}`}
              onBlur={(event) => {
                const nextValue = event.target.value;
                if (String(nextValue) !== String(classItem.maxMembers)) onCapacity(classItem, nextValue);
              }}
              className={`${inputClass} text-center`}
            />
            <Button tone="neutral" disabled={disabled} onClick={() => onCopy(classItem)}>Copy</Button>
            <Button tone={isActiveClass ? "neutral" : "gold"} disabled={disabled} onClick={() => onActivate(classItem)}>{disabled ? "Updating" : isActiveClass ? "Active" : "Activate"}</Button>
            <Button tone="blue" disabled={disabled} onClick={() => onOpenShowcase(classItem)}>{disabled ? "Opening" : "Showcase"}</Button>
            <Button tone={classItem.isLocked ? "gold" : "red"} disabled={disabled} onClick={() => onToggleLock(classItem)}>{classItem.isLocked ? "Unlock" : "Lock"}</Button>
            <Button tone="red" disabled={disabled} onClick={() => onDelete(classItem)}>Delete</Button>
          </div>
        </div>
      </Panel>
    </motion.article>
  );
}

export default function ClassroomManager() {
  const [session, setSession] = useState(null);
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({ name: "", joinCode: "", maxMembers: "30" });
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const loadSession = useCallback(async () => {
    const response = await fetch("/api/session", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Failed to load session.");
    setSession(payload);
    return payload;
  }, []);

  const loadClasses = useCallback(async () => {
    const response = await fetch("/api/classes", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Failed to load classes.");
    setClasses(Array.isArray(payload.classes) ? payload.classes : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      setIsLoading(true);
      setError("");
      try {
        const nextSession = await loadSession();
        if (!cancelled && nextSession.isAdmin) await loadClasses();
      } catch (bootError) {
        if (!cancelled) setError(bootError.message || "Failed to load teacher controls.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [loadClasses, loadSession]);

  const totals = useMemo(() => ({
    classes: classes.length,
    students: classes.reduce((total, item) => total + Number(item.memberCount || 0), 0),
    uploads: classes.reduce((total, item) => total + Number(item.uploadedByCount || 0), 0),
    locked: classes.filter((item) => item.isLocked).length,
  }), [classes]);

  async function refreshAfterChange(message) {
    await loadSession();
    await loadClasses();
    setStatus(message);
  }

  async function handleCreateClass(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to create class.");
      setForm({ name: "", joinCode: "", maxMembers: "30" });
      await refreshAfterChange(`Created ${payload.class.name}.`);
    } catch (createError) {
      setError(createError.message || "Failed to create class.");
    } finally {
      setSaving(false);
    }
  }

  async function postActiveClass(classItem, nextPath = null) {
    setUpdatingId(classItem._id);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/session/class", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: classItem._id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to activate class.");
      if (nextPath) window.location.href = nextPath;
      else await refreshAfterChange(`${classItem.name} is now active.`);
    } catch (activateError) {
      setError(activateError.message || "Failed to activate class.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleUpdateCapacity(classItem, nextValue) {
    setUpdatingId(classItem._id);
    setError("");
    setStatus("");
    try {
      const response = await fetch(`/api/classes/${classItem._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxMembers: nextValue }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to update class.");
      await refreshAfterChange(`Updated ${payload.class.name}.`);
    } catch (updateError) {
      setError(updateError.message || "Failed to update class.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleToggleLock(classItem) {
    setUpdatingId(classItem._id);
    setError("");
    setStatus("");
    try {
      const response = await fetch(`/api/classes/${classItem._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLocked: !classItem.isLocked }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to update class lock.");
      await refreshAfterChange(`${payload.class.name} ${payload.class.isLocked ? "locked" : "unlocked"}.`);
    } catch (updateError) {
      setError(updateError.message || "Failed to update class lock.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteClass(classItem) {
    if (!window.confirm(`Delete ${classItem.name}? This will also remove its student GIFs.`)) return;
    setUpdatingId(classItem._id);
    setError("");
    setStatus("");
    try {
      const response = await fetch(`/api/classes/${classItem._id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to delete class.");
      await refreshAfterChange(`${classItem.name} deleted.`);
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete class.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCopyJoinCode(classItem) {
    setError("");
    setStatus("");
    try {
      await navigator.clipboard.writeText(classItem.joinCode);
      setStatus(`Copied join code for ${classItem.name}.`);
    } catch {
      setError("Could not copy the join code.");
    }
  }

  return (
    <AppShell>
      <TopNav session={session} onSignOut={() => signOut({ callbackUrl: "/login" })} />

      <div className="grid gap-5">
        <Panel className="p-5 sm:p-7">
          <SectionHeader
            label="Teacher control room"
            title="Classroom Manager"
            action={<Button href="/" tone="gold">Dashboard</Button>}
          >
            Create class rooms, activate showcases, lock submissions, and copy join codes from one focused workspace.
          </SectionHeader>
        </Panel>

        {error ? <Alert tone="red">{error}</Alert> : null}
        {status ? <Alert tone="gold">{status}</Alert> : null}

        {!session?.user && !isLoading ? (
          <EmptyState title="Teacher login required" action={<Button href="/login?callbackUrl=/classes" tone="gold">Login</Button>}>
            Class management uses real teacher accounts.
          </EmptyState>
        ) : null}

        {session?.user && !session.isAdmin ? (
          <EmptyState title="Teacher access only" action={<Button onClick={() => signOut({ callbackUrl: "/login" })} tone="neutral">Sign out</Button>}>
            This account is not marked as a teacher yet.
          </EmptyState>
        ) : null}

        {session?.isAdmin ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Classes" value={totals.classes} tone="gold" />
              <StatCard label="Students" value={totals.students} tone="blue" />
              <StatCard label="Uploads" value={totals.uploads} tone="green" />
              <StatCard label="Locked" value={totals.locked} tone="red" />
            </div>

            <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
              <Panel className="p-5">
                <div className="mb-5">
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--color-text-muted-7)]">Create class</p>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">Logged in as {session.user.name || session.user.username}</p>
                </div>
                <form onSubmit={handleCreateClass} className="grid gap-4">
                  <Field label="Class name">
                    <input value={form.name} onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))} placeholder="Period 2 Digital Art" className={inputClass} />
                  </Field>
                  <Field label="Join code">
                    <input value={form.joinCode} onChange={(event) => setForm((previous) => ({ ...previous, joinCode: event.target.value.toUpperCase() }))} placeholder="Auto-generate if blank" className={inputClass} />
                  </Field>
                  <Field label="Max students">
                    <input value={form.maxMembers} onChange={(event) => setForm((previous) => ({ ...previous, maxMembers: event.target.value }))} placeholder="30" className={inputClass} />
                  </Field>
                  <Button type="submit" disabled={saving} tone="gold">{saving ? "Creating" : "Create class"}</Button>
                  <Button onClick={() => signOut({ callbackUrl: "/login" })} disabled={saving} tone="neutral">Sign out</Button>
                </form>
              </Panel>

              <section className="grid content-start gap-4">
                <SectionHeader label={isLoading ? "Loading classes" : `${classes.length} classes`} title="Active classrooms" />
                {classes.length ? (
                  <motion.div variants={listMotion.variants} initial="hidden" animate="show" className="grid gap-3">
                    {classes.map((classItem) => (
                      <ClassCard
                        key={classItem._id}
                        classItem={classItem}
                        isActiveClass={session?.currentClass?._id === classItem._id}
                        updatingId={updatingId}
                        onCopy={handleCopyJoinCode}
                        onActivate={(item) => postActiveClass(item)}
                        onOpenShowcase={(item) => postActiveClass(item, "/custom-characters")}
                        onToggleLock={handleToggleLock}
                        onDelete={handleDeleteClass}
                        onCapacity={handleUpdateCapacity}
                      />
                    ))}
                  </motion.div>
                ) : !isLoading ? (
                  <EmptyState title="No classes yet">Create your first class to generate a join code.</EmptyState>
                ) : (
                  <EmptyState title="Loading classes">Fetching teacher classrooms.</EmptyState>
                )}
              </section>
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
