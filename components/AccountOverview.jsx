"use client";

import { signOut } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AppShell,
  Button,
  EmptyState,
  MediaPreview,
  Panel,
  SectionHeader,
  StatCard,
  TopNav,
  itemMotion,
  listMotion,
} from "@/components/ui/AppUI";
import { motion } from "framer-motion";

function ClassSummary({ classItem }) {
  return (
    <motion.article variants={itemMotion}>
      <Panel hover className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-[var(--font-name)] text-3xl leading-none tracking-normal text-white">{classItem.name}</h3>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted-7)]">
              Code {classItem.joinCode} / {classItem.memberCount} of {classItem.maxMembers} students
            </p>
          </div>
          <span className="w-fit rounded-md border border-[color:var(--gold-55)] bg-[color:var(--gold-10)] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[var(--gold)]">
            {classItem.uploadedByCount || 0} uploads
          </span>
        </div>
      </Panel>
    </motion.article>
  );
}

function UploadRow({ upload, type }) {
  const isArena = type === "arena";
  const media = isArena ? upload.bgSrc : upload.iconSrc;
  return (
    <motion.article variants={itemMotion}>
      <Panel hover className="overflow-hidden">
        <div className="grid gap-0 sm:grid-cols-[140px_minmax(0,1fr)]">
          <MediaPreview src={media} fallback={isArena ? upload.icon : upload.element} fit={isArena ? "cover" : "cover"} className="h-36 rounded-none border-0 border-b border-[color:var(--color-surface-border-3)] sm:border-b-0 sm:border-r" />
          <div className="p-4">
            <h3 className="font-[var(--font-name)] text-3xl leading-none tracking-normal" style={{ color: upload.color || "var(--gold)" }}>
              {upload.name || "Untitled"}
            </h3>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              {isArena ? `Difficulty ${upload.difficulty || 1}` : upload.title || "Uploaded fighter"}
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted-7)]">
              Class {upload.className || "Unknown"}
            </p>
          </div>
        </div>
      </Panel>
    </motion.article>
  );
}

export default function AccountOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAccount = useCallback(async () => {
    const response = await fetch("/api/account", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Failed to load account.");
    setData(payload);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      setLoading(true);
      setError("");
      try {
        await loadAccount();
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || "Failed to load account.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [loadAccount]);

  const role = String(data?.user?.role || "student").toLowerCase();
  const isTeacherView = role === "teacher" && !data?.user?.mustChangePassword;
  const classes = useMemo(
    () => (isTeacherView ? data?.managedClasses || [] : data?.joinedClasses || []),
    [data, isTeacherView]
  );
  const uploads = Array.isArray(data?.uploads) ? data.uploads : [];
  const arenas = Array.isArray(data?.arenas) ? data.arenas : [];

  return (
    <AppShell>
      <TopNav session={data} onSignOut={() => signOut({ callbackUrl: "/login" })} />

      <div className="grid gap-5">
        <Panel className="overflow-hidden">
          <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <SectionHeader label="Account" title={data?.user ? data.user.name || data.user.username : "Your studio"}>
              Track joined classes, submitted fighters, arenas, and teacher progress from one place.
            </SectionHeader>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button href="/" tone="gold">Dashboard</Button>
              <Button onClick={() => signOut({ callbackUrl: "/login" })} tone="neutral">Sign out</Button>
            </div>
          </div>
        </Panel>

        {error ? <Alert tone="red">{error}</Alert> : null}

        {loading ? (
          <EmptyState title="Loading account">Collecting your classes and artwork.</EmptyState>
        ) : !data?.user ? (
          <EmptyState title="Login required" action={<Button href="/login?callbackUrl=/account">Login</Button>}>
            Sign in to see your account dashboard.
          </EmptyState>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Role" value={String(data.user.role || "student").toUpperCase()} tone="gold" />
              <StatCard label={isTeacherView ? "Managed classes" : "Joined classes"} value={classes.length} tone="blue" />
              <StatCard label="Fighters" value={uploads.length} tone="green" />
              <StatCard label="Arenas" value={arenas.length} tone="red" />
            </div>

            <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
              <Panel className="p-5">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--color-text-muted-7)]">Profile</p>
                <h2 className="mt-3 font-[var(--font-name)] text-4xl leading-none tracking-normal text-[var(--gold)]">{data.user.name}</h2>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">{data.user.username || data.user.email}</p>
                <div className="mt-5 rounded-lg border border-[color:var(--color-surface-border-4)] bg-[color:var(--color-surface-soft-3)] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--color-text-muted-8)]">Active class</p>
                  <p className="mt-2 font-[var(--font-name)] text-3xl tracking-normal text-white">{data.activeClass ? data.activeClass.name : "None"}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button href="/arena" tone="gold">Arena</Button>
                  <Button href="/showcase" tone="blue">Showcase</Button>
                </div>
              </Panel>

              <div className="grid gap-5">
                <section className="grid gap-3">
                  <SectionHeader label={isTeacherView ? "Teacher classes" : "Student classes"} title={isTeacherView ? "Managed class rooms" : "Joined class rooms"} />
                  {classes.length ? (
                    <motion.div variants={listMotion.variants} initial="hidden" animate="show" className="grid gap-3">
                      {classes.map((classItem) => <ClassSummary key={classItem._id} classItem={classItem} />)}
                    </motion.div>
                  ) : (
                    <EmptyState title="No classes yet">Class activity will appear here.</EmptyState>
                  )}
                </section>

                {isTeacherView ? (
                  <section className="grid gap-3">
                    <SectionHeader label="Progress" title="Class upload tracking" />
                    {classes.length ? (
                      <motion.div variants={listMotion.variants} initial="hidden" animate="show" className="grid gap-3 md:grid-cols-2">
                        {classes.map((classItem) => (
                          <motion.div key={`${classItem._id}_tracking`} variants={itemMotion}>
                            <Panel hover className="p-4">
                              <h3 className="font-[var(--font-name)] text-3xl tracking-normal text-[var(--gold)]">{classItem.name}</h3>
                              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                                {classItem.memberCount} users / {classItem.uploadedByCount} uploaded fighters
                              </p>
                              <p className={`mt-3 text-xs font-black uppercase tracking-[0.18em] ${classItem.remainingToUploadCount > 0 ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"}`}>
                                {classItem.remainingToUploadCount > 0 ? `${classItem.remainingToUploadCount} students left to upload` : "All current students have uploaded"}
                              </p>
                            </Panel>
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : null}
                  </section>
                ) : null}

                <section className="grid gap-3">
                  <SectionHeader label="Artwork" title="Your fighters" />
                  {uploads.length ? (
                    <motion.div variants={listMotion.variants} initial="hidden" animate="show" className="grid gap-3 md:grid-cols-2">
                      {uploads.map((upload) => <UploadRow key={upload._id} upload={upload} type="fighter" />)}
                    </motion.div>
                  ) : (
                    <EmptyState title="No fighters uploaded">Uploaded fighters appear here after submission.</EmptyState>
                  )}
                </section>

                <section className="grid gap-3">
                  <SectionHeader label="Artwork" title="Your arenas" />
                  {arenas.length ? (
                    <motion.div variants={listMotion.variants} initial="hidden" animate="show" className="grid gap-3 md:grid-cols-2">
                      {arenas.map((arena) => <UploadRow key={arena._id} upload={arena} type="arena" />)}
                    </motion.div>
                  ) : (
                    <EmptyState title="No arenas uploaded">Uploaded arenas appear here after submission.</EmptyState>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
