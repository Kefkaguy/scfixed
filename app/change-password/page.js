"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, AppShell, Button, Field, Panel, inputClass } from "@/components/ui/AppUI";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      const response = await fetch("/api/session", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (cancelled) return;
      if (!payload?.user) router.replace("/login?callbackUrl=/change-password");
      else if (!payload.user.mustChangePassword) router.replace("/");
    }
    checkSession().catch(() => router.replace("/login?callbackUrl=/change-password"));
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setSubmitting(false);

    if (!response.ok) {
      setError(payload.error || "Failed to change password.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <AppShell className="grid place-items-center">
      <Panel className="mx-auto w-full max-w-xl overflow-hidden">
        <div className="border-b border-[color:var(--color-surface-border-3)] p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.32em] text-[var(--color-text-muted-7)]">Password required</p>
          <h1 className="mt-3 font-[var(--font-name)] text-5xl leading-none tracking-normal text-white">Secure teacher access</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">Set a new password before entering teacher controls.</p>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-4 p-5 sm:p-6">
          {error ? <Alert tone="red">{error}</Alert> : null}
          <Field label="Temporary password">
            <input value={form.currentPassword} onChange={(event) => setForm((previous) => ({ ...previous, currentPassword: event.target.value }))} placeholder="Current temporary password" type="password" autoComplete="current-password" className={inputClass} />
          </Field>
          <Field label="New password">
            <input value={form.newPassword} onChange={(event) => setForm((previous) => ({ ...previous, newPassword: event.target.value }))} placeholder="At least 12 characters" type="password" autoComplete="new-password" className={inputClass} />
          </Field>
          <Field label="Confirm new password">
            <input value={form.confirmPassword} onChange={(event) => setForm((previous) => ({ ...previous, confirmPassword: event.target.value }))} placeholder="Repeat new password" type="password" autoComplete="new-password" className={inputClass} />
          </Field>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button tone="neutral" onClick={() => signOut({ callbackUrl: "/login" })}>Sign out</Button>
            <Button type="submit" disabled={submitting} tone="gold">{submitting ? "Saving" : "Change password"}</Button>
          </div>
        </form>
      </Panel>
    </AppShell>
  );
}
