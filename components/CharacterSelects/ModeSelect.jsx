"use client";

import { motion } from "framer-motion";
import { TopNav } from "@/components/ui/AppUI";

export default function ModeSelect({ onSelect, session, onSignOut }) {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#212121] text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/digital-art-battle-logo.png"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain opacity-20"
      />
      <div aria-hidden="true" className="absolute inset-0 grid-lines opacity-80" />
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.08)_42%,rgba(0,0,0,0.28))]" />

      <header className="absolute left-0 right-0 top-0 z-20 px-4 py-4 sm:px-6 lg:px-8">
        <TopNav session={session} onSignOut={onSignOut} />
      </header>

      <section className="relative z-10 grid min-h-screen place-items-center px-4 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="grid justify-items-center gap-5"
        >
          <motion.button
            type="button"
            onClick={() => onSelect("1v1")}
            whileTap={{ scale: 0.98 }}
            className="inline-flex min-h-24 min-w-[min(78vw,420px)] items-center justify-center rounded-md border px-10 pb-4 pt-6 text-center font-[var(--font-name)] text-6xl font-black uppercase leading-none tracking-normal text-white shadow-[0_0_42px_rgba(232,0,26,0.24)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--gold)] sm:text-7xl"
            style={{
              backgroundColor: "var(--color-danger)",
              borderColor: "var(--color-danger)",
            }}
          >
            PLAY
          </motion.button>

          <button
            type="button"
            onClick={() => onSelect("level-select")}
            className="px-5 py-3 text-xs font-black uppercase tracking-[0.28em] text-white/78 transition hover:text-[var(--blue)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
          >
            Choose Arena
          </button>
        </motion.div>
      </section>
    </main>
  );
}
