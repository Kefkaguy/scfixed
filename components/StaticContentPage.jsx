"use client";

import { motion } from "framer-motion";
import { AppShell, Button, MediaPreview, Panel, SectionHeader, TopNav, itemMotion, listMotion } from "@/components/ui/AppUI";

function SectionCard({ section, accent }) {
  return (
    <motion.section variants={itemMotion}>
      <Panel hover className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[color:var(--color-surface-border-3)] p-5">
          <div className="grid h-11 w-11 place-items-center rounded-md border bg-[color:var(--color-surface-soft-3)] text-lg" style={{ borderColor: `${accent}66`, color: accent }}>
            {section.icon}
          </div>
          <h2 className="font-[var(--font-name)] text-3xl leading-none tracking-normal text-white">{section.title}</h2>
        </div>
        <div className="grid gap-6 p-5 sm:p-6">
          {section.content.map((block) => (
            <div key={block.heading} className="max-w-4xl">
              <h3 className="text-sm font-black uppercase tracking-[0.18em]" style={{ color: accent }}>{block.heading}</h3>
              {block.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">{paragraph}</p>
              ))}
              {block.bullets?.length ? (
                <ul className="mt-4 grid gap-2 pl-5 text-sm leading-7 text-[var(--color-text-muted)]">
                  {block.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                </ul>
              ) : null}
              {block.image ? (
                <figure className="mt-5">
                  <MediaPreview src={block.image.src} alt={block.image.alt} className="max-w-3xl rounded-lg" />
                  {block.image.caption ? (
                    <figcaption className="mt-3 text-xs leading-6 text-[var(--color-text-muted-7)]">{block.image.caption}</figcaption>
                  ) : null}
                </figure>
              ) : null}
            </div>
          ))}
        </div>
      </Panel>
    </motion.section>
  );
}

export default function StaticContentPage({ eyebrow, title, subtitle, badge, accent = "#60a5fa", sections }) {
  return (
    <AppShell>
      <TopNav />
      <div className="grid gap-5">
        <Panel className="p-5 sm:p-7">
          <SectionHeader
            label={eyebrow}
            title={title}
            action={
              <>
                <Button href="/" tone="gold">Home</Button>
                <Button href="/documentation" tone="neutral">Docs</Button>
                <Button href="/privacy-policy" tone="neutral">Privacy</Button>
              </>
            }
          >
            {subtitle}
          </SectionHeader>
          {badge ? (
            <span className="mt-5 inline-flex rounded-md border px-3 py-1 text-xs font-black uppercase tracking-[0.2em]" style={{ borderColor: `${accent}66`, background: `${accent}18`, color: accent }}>
              {badge}
            </span>
          ) : null}
        </Panel>

        <motion.div variants={listMotion.variants} initial="hidden" animate="show" className="grid gap-5">
          {sections.map((section) => (
            <SectionCard key={section.title} section={section} accent={accent} />
          ))}
        </motion.div>
      </div>
    </AppShell>
  );
}
