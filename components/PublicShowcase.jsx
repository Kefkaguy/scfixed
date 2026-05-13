"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AppShell,
  Button,
  EmptyState,
  Field,
  MediaPreview,
  Panel,
  SectionHeader,
  TopNav,
  inputClass,
  itemMotion,
  listMotion,
} from "@/components/ui/AppUI";

export default function PublicShowcase() {
  const [fighters, setFighters] = useState([]);
  const [arenas, setArenas] = useState([]);
  const [filter, setFilter] = useState("all");
  const [allowPreloadedAssets, setAllowPreloadedAssets] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadShowcase() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/public-gallery", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Failed to load public showcase.");
        if (!cancelled) {
          setFighters(Array.isArray(payload.fighters) ? payload.fighters : []);
          setArenas(Array.isArray(payload.arenas) ? payload.arenas : []);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || "Failed to load public showcase.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadShowcase();
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return [
      ...fighters.map((item) => ({ ...item, assetType: "fighter" })),
      ...arenas.map((item) => ({ ...item, assetType: "arena" })),
    ]
      .filter((item) => filter === "all" || item.assetType === filter)
      .filter((item) => {
        if (!query) return true;
        return `${item.name || ""} ${item.description || ""} ${item.className || ""} ${item.createdByUserName || ""}`.toLowerCase().includes(query);
      })
      .sort((left, right) => new Date(right?.createdAt || 0).getTime() - new Date(left?.createdAt || 0).getTime());
  }, [arenas, fighters, filter, searchTerm]);

  const playHref = allowPreloadedAssets ? "/showcase/play?builtins=1" : "/showcase/play";

  async function copyShowcaseLink() {
    try {
      const playUrl = new URL("/showcase/play", window.location.origin);
      if (allowPreloadedAssets) playUrl.searchParams.set("builtins", "1");
      await navigator.clipboard.writeText(playUrl.toString());
      setStatus(allowPreloadedAssets ? "Public play link with preloaded assets copied." : "Public play link copied.");
      setError("");
    } catch {
      setError("Could not copy the showcase play link.");
    }
  }

  return (
    <AppShell>
      <TopNav />
      <div className="grid gap-5">
        <Panel className="overflow-hidden">
          <div className="grid gap-5 border-b border-[color:var(--color-surface-border-3)] p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <SectionHeader label="Public gallery" title="Teacher Showcase">
              Approved student work and teacher-created assets appear here for everyone to view or load into the public battle screen.
            </SectionHeader>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button href={playHref} tone="gold">Play</Button>
              <Button onClick={copyShowcaseLink} tone="neutral">Share link</Button>
            </div>
          </div>
          <div className="grid gap-4 p-5 sm:p-7 lg:grid-cols-[auto_minmax(260px,360px)] lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All"],
                ["fighter", "Fighters"],
                ["arena", "Arenas"],
              ].map(([value, label]) => (
                <Button key={value} tone={filter === value ? "gold" : "neutral"} onClick={() => setFilter(value)}>
                  {label}
                </Button>
              ))}
              <Button tone={allowPreloadedAssets ? "blue" : "neutral"} onClick={() => setAllowPreloadedAssets((current) => !current)}>
                {allowPreloadedAssets ? "Preloaded on" : "Preloaded off"}
              </Button>
            </div>
            <Field label="Search showcase">
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Name, class, student" className={inputClass} />
            </Field>
          </div>
        </Panel>

        {error ? <Alert tone="red">{error}</Alert> : null}
        {status ? <Alert tone="gold">{status}</Alert> : null}

        {loading ? (
          <EmptyState title="Loading showcase">Fetching the latest approved artwork.</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState title="No public artwork yet">Approved submissions will appear here once a teacher publishes them.</EmptyState>
        ) : (
          <motion.div variants={listMotion.variants} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const isFighter = item.assetType === "fighter";
              const accentColor = isFighter ? item.color || "var(--gold)" : "var(--gold)";
              const media = isFighter ? item.artSrc || item.iconSrc : item.bgSrc;
              return (
                <motion.article key={`${item.assetType}-${item._id || item.id}`} variants={itemMotion}>
                  <Panel hover className="flex h-full flex-col overflow-hidden">
                    <div className="h-48 border-b border-[color:var(--color-surface-border-3)] bg-black/35">
                      <MediaPreview src={media} fit={isFighter ? "contain" : "cover"} fallback={isFighter ? item.element : item.icon} className="h-full rounded-none border-0" />
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="min-w-0 truncate font-[var(--font-name)] text-3xl leading-none tracking-normal" style={{ color: accentColor }}>
                          {item.name || "Untitled"}
                        </h3>
                        <span className="shrink-0 rounded-md border border-[color:var(--color-surface-border-5)] bg-[color:var(--color-surface-soft-3)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                          {isFighter ? "Fighter" : "Arena"}
                        </span>
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted-7)]">
                        By {item.createdByUserName || "Teacher"} / {item.className || "Showcase"}
                      </p>
                      <p className="line-clamp-3 text-sm leading-6 text-[var(--color-text-muted)]">{item.description || "No description added yet."}</p>
                      <div className="mt-auto flex justify-end pt-2">
                        <Button href={playHref} tone="gold">Play</Button>
                      </div>
                    </div>
                  </Panel>
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}
