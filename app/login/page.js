"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Alert, AppShell, Button, Field, Panel, inputClass } from "@/components/ui/AppUI";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const result = await signIn("credentials", {
      username: form.username,
      password: form.password,
      redirect: false,
      callbackUrl,
    });

    setSubmitting(false);
    if (result?.error) {
      setError("Invalid username or password.");
      return;
    }

    const sessionResponse = await fetch("/api/session", { cache: "no-store" }).catch(() => null);
    const sessionPayload = sessionResponse ? await sessionResponse.json().catch(() => ({})) : {};
    if (sessionPayload?.user?.mustChangePassword) {
      router.push("/change-password");
      return;
    }

    router.push(result?.url || callbackUrl);
    router.refresh();
  }

  return (
    <AppShell className="grid place-items-center">
      <Panel className="mx-auto w-full max-w-xl overflow-hidden">
        <div className="border-b border-[color:var(--color-surface-border-3)] p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.32em] text-[var(--color-text-muted-7)]">Teacher access</p>
          <h1 className="mt-3 font-[var(--font-name)] text-5xl leading-none tracking-normal text-white">Digital Art Battle</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
            Sign in to approve student work, manage classes, and control the showcase. Students can upload from the home page without an account.
          </p>
        </div>
        <form onSubmit={handleLogin} className="grid gap-4 p-5 sm:p-6">
          {error ? <Alert tone="red">{error}</Alert> : null}
          <Field label="Username">
            <input value={form.username} onChange={(event) => setForm((previous) => ({ ...previous, username: event.target.value }))} placeholder="teacher_username" type="text" autoComplete="username" className={inputClass} />
          </Field>
          <Field label="Password">
            <input value={form.password} onChange={(event) => setForm((previous) => ({ ...previous, password: event.target.value }))} placeholder="Password" type="password" autoComplete="current-password" className={inputClass} />
          </Field>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button href="/" tone="neutral">Home</Button>
            <Button type="submit" disabled={submitting} tone="gold">{submitting ? "Working" : "Login"}</Button>
          </div>
        </form>
      </Panel>
    </AppShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AppShell className="grid place-items-center"><p className="text-sm font-black uppercase tracking-[0.3em] text-[var(--color-text-muted)]">Loading login</p></AppShell>}>
      <LoginContent />
    </Suspense>
  );
}
