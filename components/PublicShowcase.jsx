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
  SiteLogoMark,
  StatCard,
  TopNav,
  inputClass,
  itemMotion,
  listMotion,
} from "@/components/ui/AppUI";

const textEncoder = new TextEncoder();

function sanitizeFileName(value, fallback = "asset") {
  return String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || fallback;
}

function proxiedMediaUrl(src) {
  if (!src) return "";
  if (/^https?:\/\//i.test(src)) {
    return `/api/media-proxy?url=${encodeURIComponent(src)}`;
  }
  return src;
}

function extensionFromContentType(contentType) {
  const type = String(contentType || "").split(";")[0].trim().toLowerCase();
  if (type === "image/png") return "png";
  if (type === "image/jpeg") return "jpg";
  if (type === "image/gif") return "gif";
  if (type === "image/webp") return "webp";
  if (type === "video/webm") return "webm";
  if (type === "video/mp4") return "mp4";
  if (type === "video/quicktime") return "mov";
  return "";
}

function extensionFromUrl(src, contentType) {
  const fromType = extensionFromContentType(contentType);
  if (fromType) return fromType;

  try {
    const path = new URL(src, window.location.origin).pathname;
    const match = path.match(/\.([a-z0-9]{2,5})$/i);
    return match ? match[1].toLowerCase() : "bin";
  } catch {
    return "bin";
  }
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function concatBytes(parts) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function createZipBlob(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = textEncoder.encode(file.name);
    const dataBytes = file.data instanceof Uint8Array ? file.data : new Uint8Array(file.data);
    const checksum = crc32(dataBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, 0);
    writeUint16(localHeader, 8, 0);
    writeUint16(localHeader, 10, 0);
    writeUint16(localHeader, 12, 0);
    writeUint32(localHeader, 14, checksum);
    writeUint32(localHeader, 18, dataBytes.length);
    writeUint32(localHeader, 22, dataBytes.length);
    writeUint16(localHeader, 26, nameBytes.length);
    writeUint16(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    writeUint32(centralHeader, 0, 0x02014b50);
    writeUint16(centralHeader, 4, 20);
    writeUint16(centralHeader, 6, 20);
    writeUint16(centralHeader, 8, 0);
    writeUint16(centralHeader, 10, 0);
    writeUint16(centralHeader, 12, 0);
    writeUint16(centralHeader, 14, 0);
    writeUint32(centralHeader, 16, checksum);
    writeUint32(centralHeader, 20, dataBytes.length);
    writeUint32(centralHeader, 24, dataBytes.length);
    writeUint16(centralHeader, 28, nameBytes.length);
    writeUint16(centralHeader, 30, 0);
    writeUint16(centralHeader, 32, 0);
    writeUint16(centralHeader, 34, 0);
    writeUint16(centralHeader, 36, 0);
    writeUint32(centralHeader, 38, 0);
    writeUint32(centralHeader, 42, offset);
    centralHeader.set(nameBytes, 46);

    localParts.push(localHeader, dataBytes);
    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralDirectory = concatBytes(centralParts);
  const endRecord = new Uint8Array(22);
  writeUint32(endRecord, 0, 0x06054b50);
  writeUint16(endRecord, 8, files.length);
  writeUint16(endRecord, 10, files.length);
  writeUint32(endRecord, 12, centralDirectory.length);
  writeUint32(endRecord, 16, offset);

  return new Blob([...localParts, centralDirectory, endRecord], { type: "application/zip" });
}

function buildInfoText(item) {
  const isFighter = item.assetType === "fighter";
  const rows = [
    `Type: ${isFighter ? "Fighter" : "Arena"}`,
    `Name: ${item.name || "Untitled"}`,
    `Created by: ${item.createdByUserName || "Teacher"}`,
    `Class: ${item.className || "Showcase"}`,
    `Description: ${item.description || "No description added."}`,
  ];

  if (isFighter) {
    rows.push(
      `Color: ${item.color || ""}`,
      `Lore: ${item.lore || ""}`,
      `Entrance quote: ${item.entranceQuote || ""}`
    );
  } else {
    rows.push(
      `Difficulty: ${item.difficulty || ""}`,
      `Subtitle: ${item.subtitle || ""}`,
      `Tags: ${Array.isArray(item.tags) ? item.tags.join(", ") : ""}`
    );
  }

  rows.push(
    `Created at: ${item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}`,
    "",
    "Downloaded from Digital Art Battle."
  );

  return rows.join("\n");
}

export default function PublicShowcase({ session = null }) {
  const [fighters, setFighters] = useState([]);
  const [arenas, setArenas] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadingId, setDownloadingId] = useState("");
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

  const playHref = "/showcase/play";
  const hasPublishedAssets = fighters.length > 0 && arenas.length > 0;

  async function copyShowcaseLink() {
    try {
      const playUrl = new URL(playHref, window.location.origin);
      await navigator.clipboard.writeText(playUrl.toString());
      setStatus("Public play link copied.");
      setError("");
    } catch {
      setError("Could not copy the showcase play link.");
    }
  }

  async function addMediaFile(files, folderName, label, src) {
    if (!src) return;

    const response = await fetch(proxiedMediaUrl(src), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Could not download ${label}.`);
    }

    const contentType = response.headers.get("Content-Type") || "";
    const extension = extensionFromUrl(src, contentType);
    const bytes = new Uint8Array(await response.arrayBuffer());
    files.push({
      name: `${folderName}/${label}.${extension}`,
      data: bytes,
    });
  }

  async function downloadAssetBundle(item) {
    const isFighter = item.assetType === "fighter";
    const itemId = `${item.assetType}-${item._id || item.id || item.name}`;
    const folderName = sanitizeFileName(item.name, isFighter ? "fighter" : "arena");
    setDownloadingId(itemId);
    setError("");
    setStatus("");

    try {
      const files = [
        {
          name: `${folderName}/info.txt`,
          data: textEncoder.encode(buildInfoText(item)),
        },
      ];

      if (isFighter) {
        await addMediaFile(files, folderName, "icon", item.iconSrc);
        await addMediaFile(files, folderName, "idle", item.artSrc);
        await addMediaFile(files, folderName, "move-left", item.moveLeftArtSrc);
        await addMediaFile(files, folderName, "move-right", item.moveRightArtSrc);
      } else {
        await addMediaFile(files, folderName, "arena-background", item.bgSrc);
      }

      const zipBlob = createZipBlob(files);
      const objectUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${folderName}-assets.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setStatus(`${item.name || "Asset"} assets downloaded.`);
    } catch (downloadError) {
      setError(downloadError.message || "Could not download assets.");
    } finally {
      setDownloadingId("");
    }
  }

  return (
    <AppShell>
      <TopNav session={session} />
      <div className="grid gap-5">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-stretch">
          <Panel className="relative overflow-hidden p-5 sm:p-7 lg:p-9">
            <div aria-hidden="true" className="absolute inset-0 bg-[image:var(--bg-grid-lines)] opacity-60" />
            <div className="relative z-10 max-w-4xl">
              <SiteLogoMark className="mb-5 h-24 w-36 border-[color:var(--gold-77)] bg-black/55" />
              <p className="text-xs font-black uppercase tracking-[0.32em] text-[var(--gold)]">Public showcase</p>
              <h1 className="mt-4 font-[var(--font-name)] text-6xl leading-[0.86] tracking-normal text-white sm:text-8xl">
                Press Start
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--color-text-muted)]">
                Choose published fighters, pick a classroom arena, and launch the battle scene.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button href={playHref} tone="gold" className="min-h-14 px-6 font-[var(--font-name)] text-3xl leading-none tracking-normal">
                  Press Start
                </Button>
                <Button onClick={copyShowcaseLink} tone="neutral">Share link</Button>
              </div>
              {!loading && !hasPublishedAssets ? (
                <p className="mt-5 max-w-xl rounded-md border border-[color:var(--gold-35)] bg-[color:var(--gold-06)] px-4 py-3 text-sm leading-6 text-[var(--color-text-muted)]">
                  Public play is using published artwork only. {fighters.length === 0 ? "No public fighters yet. " : ""}{arenas.length === 0 ? "No public arenas yet." : ""}
                </p>
              ) : null}
            </div>
          </Panel>

          <div className="grid content-start gap-3">
            <StatCard label="Fighters" value={loading ? "..." : fighters.length} tone={fighters.length > 0 ? "green" : "gold"} helper="Published to character select" />
            <StatCard label="Arenas" value={loading ? "..." : arenas.length} tone={arenas.length > 0 ? "green" : "gold"} helper="Published to stage select" />
            <Panel className="p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted-8)]">Teacher controls</p>
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
                Teachers add assets, approve student work, and remove anything that should not appear.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button href="/teacher-assets" tone="neutral">Teacher Assets</Button>
                <Button href="/student-work" tone="blue">Student Work</Button>
              </div>
            </Panel>
          </div>
        </section>

        <Panel className="overflow-hidden">
          <div className="grid gap-4 border-b border-[color:var(--color-surface-border-3)] p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <SectionHeader label="Live roster" title="What is published">
              This review area is secondary to play. It shows the fighters and arenas currently live in the public selector.
            </SectionHeader>
            <Field label="Search showcase" className="w-full min-w-0 lg:w-[360px]">
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Name, class, student" className={inputClass} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2 p-5 sm:p-6">
            {[
              ["all", "All"],
              ["fighter", "Fighters"],
              ["arena", "Arenas"],
            ].map(([value, label]) => (
              <Button key={value} tone={filter === value ? "gold" : "neutral"} onClick={() => setFilter(value)}>
                {label}
              </Button>
            ))}
          </div>
        </Panel>

        {error ? <Alert tone="red">{error}</Alert> : null}
        {status ? <Alert tone="gold">{status}</Alert> : null}

        {loading ? (
          <EmptyState title="Loading showcase">Fetching the latest approved artwork.</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState title="No public artwork yet" action={<Button href={playHref} tone="gold">Back to Play</Button>}>
            {fighters.length === 0 && arenas.length === 0
              ? "No public fighters or arenas yet. Add teacher assets or approve student submissions to fill the showcase."
              : "No artwork matches the current filter or search."}
          </EmptyState>
        ) : (
          <motion.div variants={listMotion.variants} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((item) => {
              const isFighter = item.assetType === "fighter";
              const itemId = `${item.assetType}-${item._id || item.id || item.name}`;
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
                      <div className="mt-auto flex flex-wrap justify-end gap-2 pt-2">
                        <Button tone="gold" disabled={downloadingId === itemId} onClick={() => downloadAssetBundle(item)}>
                          {downloadingId === itemId ? "Downloading" : "Download assets"}
                        </Button>
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
