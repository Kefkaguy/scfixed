"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export const siteLogoSrc = "/digital-art-battle-logo.png";

export function SiteLogoMark({ className = "h-11 w-16" }) {
  return (
    <span className={`grid place-items-center overflow-hidden rounded-md border border-[color:var(--gold-55)] bg-black/35 shadow-[0_0_28px_rgba(240,192,32,0.12)] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={siteLogoSrc} alt="Digital Art Battle" className="h-full w-full object-contain p-1" />
    </span>
  );
}

export const tones = {
  gold: {
    text: "text-[var(--gold)]",
    border: "border-[color:var(--gold-55)]",
    bg: "bg-[color:var(--gold-10)]",
    hover: "hover:bg-[color:var(--gold-16)]",
  },
  blue: {
    text: "text-[var(--blue)]",
    border: "border-[color:var(--blue-66)]",
    bg: "bg-[color:var(--color-blue-bg)]",
    hover: "hover:bg-[color:var(--blue-33)]",
  },
  green: {
    text: "text-[var(--color-success)]",
    border: "border-[color:var(--success-52)]",
    bg: "bg-[rgba(103,224,143,0.12)]",
    hover: "hover:bg-[rgba(103,224,143,0.18)]",
  },
  red: {
    text: "text-[var(--color-danger)]",
    border: "border-[color:var(--danger-66)]",
    bg: "bg-[color:var(--color-danger-bg-2)]",
    hover: "hover:bg-[color:var(--color-danger-bg-3)]",
  },
  neutral: {
    text: "text-[var(--color-text-tertiary)]",
    border: "border-[color:var(--color-surface-border-5)]",
    bg: "bg-[color:var(--color-surface-soft-3)]",
    hover: "hover:bg-[color:var(--color-surface-soft-4)]",
  },
};

export const pageMotion = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
};

export const listMotion = {
  initial: "hidden",
  animate: "show",
  variants: {
    hidden: {},
    show: { transition: { staggerChildren: 0.045 } },
  },
};

export const itemMotion = {
  variants: {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
  },
};

export function AppShell({ children, className = "" }) {
  return (
    <main className={`min-h-screen overflow-x-hidden bg-[var(--bg-app-shell)] text-white ${className}`}>
      
      <motion.div {...pageMotion} className="relative z-10 mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 2xl:px-10">
        {children}
      </motion.div>
    </main>
  );
}

export function TopNav({ session, onSignOut }) {
  const publicNav = [
    ["Home", "/"],
    ["Showcase", "/showcase"],
    ["Play", "/showcase/play"],
    ["GIF Editor", "/gif-editor"],
  ];
  const teacherNav = [
    ...publicNav,
  ];
  const isTeacher = Boolean(session?.isAdmin || (session?.user?.role === "teacher" && !session?.user?.mustChangePassword));
  const nav = isTeacher ? teacherNav : publicNav;

  return (
    <header className="mb-5 rounded-lg border border-[color:var(--color-surface-border-4)] bg-[rgba(5,7,16,0.78)] px-4 py-3 shadow-[var(--shadow-panel)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="group flex items-center gap-3 no-underline">
          <span className="grid h-11 w-11 place-items-center rounded-md border border-[color:var(--gold-55)] bg-[color:var(--gold-10)] text-xl font-black text-[var(--gold)] shadow-[0_0_28px_rgba(240,192,32,0.12)] transition group-hover:scale-105">
            DA
          </span>
          <span>
            <span className="block font-[var(--font-name)] text-2xl leading-none tracking-normal text-white sm:text-3xl">
              Digital Art Battle
            </span>
            <span className="block text-xs font-semibold tracking-[0.18em] text-[var(--color-text-muted)]">
              public character select
            </span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-2">
          {nav.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-md border border-transparent px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-text-tertiary)] transition hover:border-[color:var(--color-surface-border-5)] hover:bg-[color:var(--color-surface-soft-3)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
            >
              {label}
            </Link>
          ))}
          {session?.user ? (
            <button
              type="button"
              onClick={onSignOut}
              className="rounded-md border border-[color:var(--color-surface-border-5)] bg-[color:var(--color-surface-soft-3)] px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-text-tertiary)] transition hover:bg-[color:var(--color-surface-soft-4)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login?callbackUrl=/"
              className="rounded-md border border-[color:var(--gold-55)] bg-[color:var(--gold-10)] px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)] transition hover:bg-[color:var(--gold-16)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
            >
              Teacher Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function Panel({ children, className = "", accent = "border-[color:var(--color-surface-border-4)]", hover = false }) {
  const Component = hover ? motion.section : "section";
  const motionProps = hover ? { whileHover: { y: -3 }, transition: { duration: 0.2 } } : {};
  return (
    <Component
      {...motionProps}
      className={`rounded-lg border ${accent} bg-[var(--bg-panel)] shadow-[var(--shadow-panel)] ${className}`}
    >
      {children}
    </Component>
  );
}

export function SectionHeader({ label, title, children, action }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {label ? <p className="text-xs font-black uppercase tracking-[0.32em] text-[var(--color-text-muted-7)]">{label}</p> : null}
        <h2 className="mt-2 font-[var(--font-name)] text-3xl leading-none tracking-normal text-white sm:text-4xl">{title}</h2>
        {children ? <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">{children}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function Button({ children, href, onClick, type = "button", disabled = false, tone = "gold", className = "" }) {
  const palette = tones[tone] || tones.gold;
  const classes = `inline-flex min-h-10 items-center justify-center rounded-md border px-4 py-2 text-center text-xs font-black uppercase tracking-[0.2em] transition focus:outline-none focus:ring-2 focus:ring-[var(--gold)] disabled:pointer-events-none disabled:opacity-50 ${palette.border} ${palette.bg} ${palette.text} ${palette.hover} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <motion.button whileTap={{ scale: 0.98 }} type={type} onClick={disabled ? undefined : onClick} disabled={disabled} className={classes}>
      {children}
    </motion.button>
  );
}

export function Field({ label, children, className = "" }) {
  return (
    <label className={`grid gap-2 ${className}`}>
      <span className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted-8)]">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-[color:var(--color-surface-border-5)] bg-[color:var(--color-surface-soft-3)] px-3 py-3 text-sm text-white outline-none transition placeholder:text-[var(--color-text-muted-10)] focus:border-[color:var(--gold-55)] focus:ring-2 focus:ring-[rgba(240,192,32,0.18)]";

export function Alert({ children, tone = "gold", className = "" }) {
  const palette = tones[tone] || tones.gold;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-md border px-4 py-3 text-sm font-semibold ${palette.border} ${palette.bg} ${palette.text} ${className}`}
      role={tone === "red" ? "alert" : "status"}
    >
      {children}
    </motion.div>
  );
}

export function StatCard({ label, value, tone = "gold", helper }) {
  const palette = tones[tone] || tones.gold;
  return (
    <Panel hover className="p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted-8)]">{label}</p>
      <div className={`mt-3 font-[var(--font-name)] text-4xl leading-none ${palette.text}`}>{value}</div>
      {helper ? <p className="mt-2 text-xs text-[var(--color-text-muted)]">{helper}</p> : null}
    </Panel>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <Panel className="grid place-items-center p-8 text-center">
      <div className="max-w-lg">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-md border border-[color:var(--gold-35)] bg-[color:var(--gold-10)] font-[var(--font-name)] text-2xl text-[var(--gold)]">
          DA
        </div>
        <h3 className="mt-4 font-[var(--font-name)] text-2xl tracking-normal text-white">{title}</h3>
        {children ? <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{children}</p> : null}
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </Panel>
  );
}

export function isVideo(value) {
  if (typeof value !== "string") return false;
  const lower = value.toLowerCase();
  return lower.startsWith("blob:video") || lower.endsWith(".webm") || lower.endsWith(".mp4") || lower.endsWith(".mov");
}

export function MediaPreview({ src, fallback = "DA", fit = "cover", className = "", alt = "" }) {
  const fitClass = fit === "contain" ? "object-contain" : "object-cover";
  return (
    <div className={`grid place-items-center overflow-hidden rounded-md border border-[color:var(--color-surface-border-4)] bg-black/40 ${className}`}>
      {src ? (
        isVideo(src) ? (
          <video src={src} autoPlay loop muted playsInline className={`h-full w-full ${fitClass}`} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className={`h-full w-full ${fitClass}`} />
        )
      ) : (
        <span className="font-[var(--font-name)] text-4xl text-[var(--gold)]">{fallback}</span>
      )}
    </div>
  );
}

export function SelectControl({ value, onChange, options, label }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} cursor-pointer`}>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#080a12] text-white">
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
