"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button, Panel } from "@/components/ui/AppUI";

const GOLD = "#f0c020";
const RED = "#e8001a";

export default function ModeSelect({ onSelect }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg-app-shell)] text-white">
      <div aria-hidden="true" className="absolute inset-0 bg-[image:var(--bg-grid-lines)] opacity-70" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl content-center gap-6 px-4 py-8 sm:px-6 lg:px-8"
      >
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <span className="grid h-11 w-11 place-items-center rounded-md border border-[color:var(--gold-55)] bg-[color:var(--gold-10)] font-black text-[var(--gold)]">DA</span>
            <span>
              <span className="block font-[var(--font-name)] text-3xl leading-none tracking-normal">Digital Art Battle</span>
              <span className="block text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">arena setup</span>
            </span>
          </Link>
          <div className="flex flex-wrap gap-2">
            <Button href="/showcase" tone="blue">Showcase</Button>
            <Button href="/" tone="neutral">Dashboard</Button>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-stretch">
          <Panel className="relative overflow-hidden p-6 sm:p-8 lg:p-10">
            <div className="relative max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.32em] text-[var(--gold)]">Choose your battle flow</p>
              <h1 className="mt-5 font-[var(--font-name)] text-6xl leading-[0.88] tracking-normal text-white sm:text-8xl">
                Build the matchup.
                <span className="block" style={{ color: RED }}>Start the art battle.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--color-text-muted)]">
                Select fighters, choose a stage, and launch the classroom showcase without the clutter of the old menu screen.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <motion.button
                  type="button"
                  onClick={() => onSelect("1v1")}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  className="min-h-14 rounded-md border border-[color:var(--gold-77)] bg-[color:var(--gold-10)] px-6 py-3 font-[var(--font-name)] text-3xl leading-none tracking-normal text-[var(--gold)] shadow-[0_0_34px_rgba(240,192,32,0.12)] transition hover:bg-[color:var(--gold-16)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
                >
                  Play 1v1
                </motion.button>
                <Button onClick={() => onSelect("level-select")} tone="neutral">Select level</Button>
              </div>
            </div>
          </Panel>

          <div className="grid gap-4">
            {[
              ["1", "Pick", "Choose student or built-in fighters."],
              ["2", "Stage", "Load a classroom arena or public showcase stage."],
              ["3", "Present", "Use the battle screen as a polished classroom display."],
            ].map(([step, title, copy], index) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + index * 0.08 }}
              >
                <Panel hover className="p-5">
                  <div className="flex gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-[color:var(--gold-55)] bg-[color:var(--gold-10)] font-[var(--font-name)] text-2xl text-[var(--gold)]">{step}</span>
                    <div>
                      <h2 className="font-[var(--font-name)] text-3xl leading-none tracking-normal text-white">{title}</h2>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{copy}</p>
                    </div>
                  </div>
                </Panel>
              </motion.div>
            ))}
          </div>
        </section>
      </motion.div>
    </main>
  );
}
