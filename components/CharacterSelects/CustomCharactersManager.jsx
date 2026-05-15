"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Alert,
  Button,
  EmptyState,
  MediaPreview,
  Panel,
  SectionHeader,
  SelectControl,
  inputClass,
  itemMotion,
  listMotion,
} from "@/components/ui/AppUI";

const GOLD = "#f0c020";
const RED = "#e8001a";
const INPUT_STYLE = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
  padding: "10px 12px",
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.08em",
  width: "100%",
  outline: "none",
};
const ELEMENT_OPTIONS = ["🔥", "⚡", "❄️", "🌊", "🌪️", "☠️", "🌙", "🧪", "🎯", "🏹", "🐾", "🕷️", "🐎", "🌌", "🔮", "⚔️", "🛡️"];
const ARENA_ICONS = ["⚔️", "🏟️", "🔥", "🌙", "👑", "🌌", "☠️", "🗿", "🌋", "🧊", "🕯️", "🌸"];
const DEFAULT_COLORS = ["#e8001a", "#0077ff", "#ff8800", "#22cc66", "#9933cc", "#00ddcc", "#ffcc00", "#ff44aa"];

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 9, letterSpacing: "0.35em", color: "#677087", fontFamily: "var(--font-display)", textTransform: "uppercase" }}>{label}</label>
      {children}
    </div>
  );
}

function CustomSelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) || options[0];
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        style={{ ...INPUT_STYLE, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left" }}
      >
        <span>{selected?.label || ""}</span>
        <span style={{ color: GOLD, fontSize: 10 }}>V</span>
      </button>
      {open ? (
        <div style={{ position: "absolute", zIndex: 30, left: 0, right: 0, top: "calc(100% + 6px)", border: "1px solid rgba(255,255,255,0.14)", background: "#080a12", boxShadow: "0 18px 44px rgba(0,0,0,0.45)" }}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              style={{ width: "100%", padding: "10px 12px", border: "none", borderBottom: "1px solid rgba(255,255,255,0.06)", background: option.value === value ? `${GOLD}12` : "transparent", color: option.value === value ? GOLD : "#c2c8d8", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.18em", textAlign: "left", cursor: "pointer" }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function isVideoPreview(value) {
  if (typeof value !== "string") {
    return false;
  }

  const previewType = value.includes("#") ? decodeURIComponent(value.split("#").pop() || "").toLowerCase() : "";
  if (previewType) {
    return previewType.startsWith("video/");
  }

  const lowerValue = value.toLowerCase();
  return lowerValue.endsWith(".webm") || lowerValue.endsWith(".mp4") || lowerValue.endsWith(".mov");
}

function DropZone({ label, value, onFile, accept, hint, aspectRatio = "1 / 1", onClear = null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 9, letterSpacing: "0.35em", color: "#677087", fontFamily: "var(--font-display)" }}>{label}</div>
        {value && onClear ? (
          <button
            type="button"
            onClick={onClear}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "#9aa2b7",
              padding: "4px 8px",
              fontFamily: "var(--font-display)",
              fontSize: 8,
              letterSpacing: "0.18em",
            }}
          >
            CLEAR
          </button>
        ) : null}
      </div>
      <label style={{ width: "100%", aspectRatio, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer" }}>
        {value ? (
          isVideoPreview(value) ? (
            <video src={value} autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )
        ) : (
          <div style={{ textAlign: "center", padding: 10, color: "#65708a", fontFamily: "var(--font-display)", fontSize: 8, letterSpacing: "0.2em", lineHeight: 1.6, whiteSpace: "pre-line" }}>{hint}</div>
        )}
        <input
          type="file"
          accept={accept}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
          }}
          style={{ display: "none" }}
        />
      </label>
    </div>
  );
}

function ColorPicker({ value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {DEFAULT_COLORS.map((color) => (
        <button key={color} type="button" onClick={() => onChange(color)} style={{ width: 22, height: 22, background: color, border: value === color ? "2px solid #fff" : "2px solid transparent" }} />
      ))}
    </div>
  );
}

function emptyFighter() {
  return {
    _id: null,
    id: null,
    name: "",
    description: "",
    lore: "",
    entranceQuote: "",
    color: "#e8001a",
    accent: "#ff6644",
    element: "??",
    bgTint: "#2a0000",
    iconSrc: null,
    artSrc: null,
    moveLeftArtSrc: null,
    moveRightArtSrc: null,
    visibilityScope: "class",
    classId: null,
    iconFile: null,
    artFile: null,
    moveLeftArtFile: null,
    moveRightArtFile: null,
  };
}

function emptyArena() {
  return { _id: null, id: null, name: "", icon: "??", description: "", difficulty: 1, bgSrc: null, visibilityScope: "class", classId: null, bgFile: null };
}

function filePreview(file) {
  return file ? `${URL.createObjectURL(file)}#${encodeURIComponent(file.type || "application/octet-stream")}` : null;
}

export default function CustomCharactersManager({
  modal = false,
  onClose = null,
  initialTab = "fighters",
  initialEditorType = null,
  initialItem = null,
  initialJoinCode = "",
  readOnly = false,
}) {
  const [session, setSession] = useState(null);
  const [account, setAccount] = useState(null);
  const [fighters, setFighters] = useState([]);
  const [arenas, setArenas] = useState([]);
  const [tab, setTab] = useState(initialTab);
  const [editorType, setEditorType] = useState(initialEditorType);
  const [fighterDraft, setFighterDraft] = useState(
    initialEditorType === "fighter" && initialItem ? { ...emptyFighter(), ...initialItem } : emptyFighter()
  );
  const [arenaDraft, setArenaDraft] = useState(
    initialEditorType === "arena" && initialItem ? { ...emptyArena(), ...initialItem } : emptyArena()
  );
  const [joinCode, setJoinCode] = useState(String(initialJoinCode || "").trim().toUpperCase());
  const [searchTerm, setSearchTerm] = useState("");
  const [galleryFilter, setGalleryFilter] = useState("all");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [removingStudentId, setRemovingStudentId] = useState("");

  const currentClass = session?.currentClass ?? null;
  const user = session?.user ?? null;
  const isAdmin = Boolean(
    session?.isAdmin ||
    (session?.user?.role === "teacher" && !session?.user?.mustChangePassword)
  );
  const canUpload = Boolean(session?.canUploadToClass);
  const isClassLocked = Boolean(currentClass?.isLocked);
  const isStudentLockedOut = isClassLocked && !isAdmin;
  const classCountText = useMemo(() => currentClass ? `${Number(currentClass.memberCount || 0)} / ${Number(currentClass.maxMembers || 0)} students joined` : "No class selected", [currentClass]);
  const managedClasses = useMemo(
    () => Array.isArray(account?.managedClasses) ? account.managedClasses : [],
    [account?.managedClasses]
  );
  const loginHref = useMemo(() => {
    const callbackUrl = initialJoinCode ? `/?join=${encodeURIComponent(String(initialJoinCode).trim().toUpperCase())}` : "/";
    return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  }, [initialJoinCode]);
  const hasOwnFighterInClass = useMemo(
    () => Boolean(user?.id) && fighters.some((fighter) => fighter?.createdByUserId === user.id),
    [fighters, user?.id]
  );
  const hasOwnArenaInClass = useMemo(
    () => Boolean(user?.id) && arenas.some((arena) => arena?.createdByUserId === user.id),
    [arenas, user?.id]
  );
  const classMembers = useMemo(
    () =>
      Array.isArray(currentClass?.members)
        ? currentClass.members.map((member, index) => ({
            id: member?.userId || member?.email || `${member?.studentName || "student"}-${index}`,
            userId: String(member?.userId || ""),
            studentName: String(member?.studentName || "Student"),
            email: String(member?.email || ""),
            image: typeof member?.image === "string" ? member.image : "",
            hasFighter: Boolean(member?.hasFighter),
            hasArena: Boolean(member?.hasArena),
          }))
        : [],
    [currentClass?.members]
  );

  const loadSession = useCallback(async () => {
    const response = await fetch("/api/session", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Failed to load session.");
    setSession(payload);
    return payload;
  }, []);

  const loadContent = useCallback(async () => {
    const [fightersResponse, arenasResponse] = await Promise.all([
      fetch("/api/characters", { cache: "no-store" }),
      fetch("/api/arenas", { cache: "no-store" }),
    ]);
    const fightersPayload = await fightersResponse.json();
    const arenasPayload = await arenasResponse.json();
    if (!fightersResponse.ok) throw new Error(fightersPayload.error || "Failed to load fighters.");
    if (!arenasResponse.ok) throw new Error(arenasPayload.error || "Failed to load arenas.");
    setFighters(Array.isArray(fightersPayload.characters) ? fightersPayload.characters : []);
    setArenas(Array.isArray(arenasPayload.arenas) ? arenasPayload.arenas : []);
  }, []);

  const loadAccount = useCallback(async () => {
    const response = await fetch("/api/account", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Failed to load teacher assets.");
    setAccount(payload);
    return payload;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      setIsLoading(true);
      setError("");
      try {
        const nextSession = await loadSession();
        if (!cancelled && nextSession.isAdmin) {
          await loadAccount();
        }
        if (!cancelled && nextSession.currentClass) {
          await loadContent();
        }
      } catch (bootError) {
        if (!cancelled) setError(bootError.message || "Failed to load class content.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [loadAccount, loadContent, loadSession]);

  useEffect(() => {
    if (!currentClass && initialJoinCode) {
      setJoinCode(String(initialJoinCode).trim().toUpperCase());
    }
  }, [currentClass, initialJoinCode]);

  useEffect(() => {
    setTab(initialTab || "fighters");
    setEditorType(initialEditorType || null);
    setFighterDraft(
      initialEditorType === "fighter" && initialItem ? { ...emptyFighter(), ...initialItem } : emptyFighter()
    );
    setArenaDraft(
      initialEditorType === "arena" && initialItem ? { ...emptyArena(), ...initialItem } : emptyArena()
    );
  }, [initialEditorType, initialItem, initialTab]);

  function resetEditors() {
    setEditorType(null);
    setFighterDraft(emptyFighter());
    setArenaDraft(emptyArena());
  }

  function handleTabChange(nextTab) {
    setTab(nextTab);

    if (readOnly || nextTab === "my-gallery") {
      setEditorType(null);
      return;
    }

    if (nextTab === "fighters") {
      setEditorType("fighter");
      setFighterDraft(emptyFighter());
    } else if (nextTab === "arenas") {
      setEditorType("arena");
      setArenaDraft(emptyArena());
    } else {
      setEditorType(null);
    }
  }

  async function refreshAll() {
    const nextSession = await loadSession();
    if (nextSession.isAdmin) await loadAccount();
    if (nextSession.currentClass) await loadContent();
    else {
      setFighters([]);
      setArenas([]);
    }
  }

  async function handleJoinClass(event) {
    event.preventDefault();
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to join class.");
      setStatus(`Joined ${payload.currentClass.name}.`);
      setJoinCode("");
      await refreshAll();
    } catch (joinError) {
      setError(joinError.message || "Failed to join class.");
    }
  }

  async function handleLeaveClass() {
    const response = await fetch("/api/session/class", { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Failed to leave class.");
      return;
    }
    resetEditors();
    await loadSession();
    setFighters([]);
    setArenas([]);
  }

  async function saveFighter() {
    const formData = new FormData();
    formData.append("name", fighterDraft.name || "");
    formData.append("description", fighterDraft.description || "");
    formData.append("lore", fighterDraft.lore || "");
    formData.append("entranceQuote", fighterDraft.entranceQuote || "");
    formData.append("color", fighterDraft.color || "#e8001a");
    formData.append("accent", fighterDraft.accent || "#ff6644");
    formData.append("element", fighterDraft.element || "??");
    formData.append("bgTint", fighterDraft.bgTint || "#2a0000");
    if (isAdmin) {
      formData.append("visibilityScope", fighterDraft.visibilityScope === "all" ? "all" : "class");
      formData.append("classId", fighterDraft.classId || currentClass?._id || managedClasses[0]?._id || "");
    }
    if (fighterDraft.iconFile instanceof File) formData.append("iconFile", fighterDraft.iconFile);
    else if (fighterDraft.iconSrc && !fighterDraft.iconSrc.startsWith("blob:")) formData.append("iconSrc", fighterDraft.iconSrc);
    if (fighterDraft.artFile instanceof File) formData.append("artFile", fighterDraft.artFile);
    else if (fighterDraft.artSrc && !fighterDraft.artSrc.startsWith("blob:")) formData.append("artSrc", fighterDraft.artSrc);
    if (fighterDraft.moveLeftArtFile instanceof File) formData.append("moveLeftArtFile", fighterDraft.moveLeftArtFile);
    else if (fighterDraft.moveLeftArtSrc && !fighterDraft.moveLeftArtSrc.startsWith("blob:")) formData.append("moveLeftArtSrc", fighterDraft.moveLeftArtSrc);
    else if ((fighterDraft._id || fighterDraft.id) && !fighterDraft.moveLeftArtSrc) formData.append("clearMoveLeftArt", "1");
    if (fighterDraft.moveRightArtFile instanceof File) formData.append("moveRightArtFile", fighterDraft.moveRightArtFile);
    else if (fighterDraft.moveRightArtSrc && !fighterDraft.moveRightArtSrc.startsWith("blob:")) formData.append("moveRightArtSrc", fighterDraft.moveRightArtSrc);
    else if ((fighterDraft._id || fighterDraft.id) && !fighterDraft.moveRightArtSrc) formData.append("clearMoveRightArt", "1");
    const identifier = fighterDraft._id || fighterDraft.id;
    const response = await fetch(identifier ? `/api/characters/${identifier}` : "/api/characters", { method: identifier ? "PUT" : "POST", body: formData });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Failed to save GIF fighter.");
  }

  async function saveArena() {
    const formData = new FormData();
    formData.append("name", arenaDraft.name || "");
    formData.append("icon", arenaDraft.icon || "??");
    formData.append("description", arenaDraft.description || "");
    formData.append("difficulty", String(arenaDraft.difficulty || 1));
    if (isAdmin) {
      formData.append("visibilityScope", arenaDraft.visibilityScope === "all" ? "all" : "class");
      formData.append("classId", arenaDraft.classId || currentClass?._id || managedClasses[0]?._id || "");
    }
    if (arenaDraft.bgFile instanceof File) formData.append("bgFile", arenaDraft.bgFile);
    else if (arenaDraft.bgSrc && !arenaDraft.bgSrc.startsWith("blob:")) formData.append("bgSrc", arenaDraft.bgSrc);
    const identifier = arenaDraft._id || arenaDraft.id;
    const response = await fetch(identifier ? `/api/arenas/${identifier}` : "/api/arenas", { method: identifier ? "PUT" : "POST", body: formData });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Failed to save arena.");
  }

  async function handleSave() {
    setError("");
    setStatus("");
    setIsSaving(true);
    try {
      if (editorType === "fighter") await saveFighter();
      if (editorType === "arena") await saveArena();
      resetEditors();
      await refreshAll();
      setStatus(editorType === "arena" ? "Arena saved." : "GIF fighter saved.");
    } catch (saveError) {
      setError(saveError.message || "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(type, id) {
    const response = await fetch(type === "arena" ? `/api/arenas/${id}` : `/api/characters/${id}`, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Failed to delete item.");
      return;
    }
    await refreshAll();
    setStatus(type === "arena" ? "Arena deleted." : "GIF fighter deleted.");
  }

  async function handleSignOut() {
    await signOut({ callbackUrl: "/login" });
  }

  async function handleRemoveStudent(member) {
    if (!currentClass?._id || !member?.userId) {
      return;
    }

    setError("");
    setStatus("");
    setRemovingStudentId(member.userId);

    try {
      const response = await fetch(`/api/classes/${currentClass._id}/members/${encodeURIComponent(member.userId)}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to remove student.");
      }

      await loadSession();
      setStatus(`${member.studentName} removed from ${currentClass.name}.`);
    } catch (removeError) {
      setError(removeError.message || "Failed to remove student.");
    } finally {
      setRemovingStudentId("");
    }
  }

  const list = tab === "fighters" ? fighters : arenas;
  const isStudentsTab = tab === "students";
  const isTeacherGalleryTab = tab === "my-gallery";
  const galleryItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const ownFighters = Array.isArray(account?.uploads)
      ? account.uploads.map((item) => ({ ...item, assetType: "fighter" }))
      : [];
    const ownArenas = Array.isArray(account?.arenas)
      ? account.arenas.map((item) => ({ ...item, assetType: "arena" }))
      : [];
    return [...ownFighters, ...ownArenas]
      .filter((item) => galleryFilter === "all" || item.assetType === galleryFilter)
      .filter((item) => {
        if (!query) return true;
        return `${item.name || ""} ${item.className || ""} ${item.description || ""}`.toLowerCase().includes(query);
      })
      .sort((left, right) => new Date(right?.createdAt || 0).getTime() - new Date(left?.createdAt || 0).getTime());
  }, [account?.arenas, account?.uploads, galleryFilter, searchTerm]);
  const showcaseGridColumns =
    tab === "fighters"
      ? "repeat(auto-fit, minmax(240px, 280px))"
      : "repeat(auto-fit, minmax(260px, 320px))";
  const filteredList = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return isStudentsTab ? classMembers : list;
    }

    if (isStudentsTab) {
      return classMembers.filter((member) => {
        const studentName = String(member?.studentName || "").toLowerCase();
        const email = String(member?.email || "").toLowerCase();
        return studentName.includes(query) || email.includes(query);
      });
    }

    return list.filter((item) => {
      const name = String(item?.name || "").toLowerCase();
      const studentName = String(item?.createdByUserName || "").toLowerCase();
      return name.includes(query) || studentName.includes(query);
    });
  }, [classMembers, isStudentsTab, list, searchTerm]);

  if (isTeacherGalleryTab) {
    const shellClass = modal
      ? "fixed inset-0 z-[9999] overflow-y-auto bg-[#02030a] p-4 text-white sm:p-6"
      : "min-h-screen overflow-x-hidden bg-[#02030a] p-4 text-white sm:p-6";
    const activeDraft = editorType === "fighter" ? fighterDraft : arenaDraft;
    const activeCanSave =
      editorType === "fighter"
        ? fighterDraft.name.trim()
        : arenaDraft.name.trim() && arenaDraft.bgSrc;

    return (
      <div
        className={shellClass}
        onClick={modal ? (event) => { if (event.target === event.currentTarget) onClose?.(); } : undefined}
      >
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[var(--bg-app-shell)]" />
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[image:var(--bg-grid-lines)] opacity-60" />
        <motion.div
          initial={{ opacity: 0, y: 18, scale: modal ? 0.985 : 1 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative z-10 mx-auto min-h-[88vh] w-full max-w-[1780px] overflow-hidden rounded-lg border border-[color:var(--color-surface-border-4)] bg-[#050710] shadow-[var(--shadow-modal)]"
          onClick={modal ? (event) => event.stopPropagation() : undefined}
        >
          <div className="border-b border-[color:var(--color-surface-border-3)] p-5 sm:p-6">
            <SectionHeader
              label="Assets"
              title="Teacher Assets"
              action={
                <>
                  {user ? <Button tone="neutral" onClick={handleSignOut}>Sign out</Button> : <Button href={loginHref} tone="gold">Login</Button>}
                  {modal ? <Button tone="gold" onClick={() => onClose?.()}>Home hub</Button> : <Button href="/" tone="gold">Home hub</Button>}
                  {modal ? <Button tone="neutral" onClick={() => onClose?.()}>Close</Button> : null}
                </>
              }
            >
              Create, edit, and remove teacher fighters and arenas before they move into showcase publication and arena play.
            </SectionHeader>
          </div>

          <div className={`grid gap-5 p-5 sm:p-6 ${editorType ? "xl:grid-cols-[minmax(0,1fr)_430px]" : ""}`}>
            <div className="grid content-start gap-5">
              {error ? <Alert tone="red">{error}</Alert> : null}
              {status ? <Alert tone="gold">{status}</Alert> : null}

              {!user ? (
                <EmptyState title="Login required" action={<Button href={loginHref} tone="gold">Login</Button>}>
                  Sign in as a teacher to manage teacher assets.
                </EmptyState>
              ) : (
                <>
                  <Panel className="p-4 sm:p-5">
                    <div className="grid gap-4 lg:grid-cols-[minmax(260px,360px)_auto] lg:items-end lg:justify-between">
                      <label className="grid gap-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted-8)]">Search assets</span>
                        <input
                          value={searchTerm}
                          onChange={(event) => setSearchTerm(event.target.value)}
                          placeholder="Search by name, class, or description"
                          className={inputClass}
                        />
                      </label>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        {[
                          ["all", "All"],
                          ["fighter", "Fighters"],
                          ["arena", "Arenas"],
                        ].map(([value, label]) => (
                          <Button key={value} tone={galleryFilter === value ? "gold" : "neutral"} onClick={() => setGalleryFilter(value)}>
                            {label}
                          </Button>
                        ))}
                        <Button tone="green" onClick={() => { setEditorType("fighter"); setFighterDraft({ ...emptyFighter(), classId: currentClass?._id || managedClasses[0]?._id || null }); }}>
                          New fighter
                        </Button>
                        <Button tone="blue" onClick={() => { setEditorType("arena"); setArenaDraft({ ...emptyArena(), classId: currentClass?._id || managedClasses[0]?._id || null }); }}>
                          New arena
                        </Button>
                      </div>
                    </div>
                  </Panel>

                  {isLoading ? (
                    <EmptyState title="Loading teacher assets">Fetching your teacher assets.</EmptyState>
                  ) : galleryItems.length === 0 ? (
                    <EmptyState title="No assets match this filter">Create a fighter or arena to start building teacher assets.</EmptyState>
                  ) : (
                    <motion.div variants={listMotion.variants} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {galleryItems.map((item) => {
                        const id = item._id || item.id;
                        const isFighterAsset = item.assetType === "fighter";
                        const accentColor = isFighterAsset ? item.color || GOLD : GOLD;
                        const media = isFighterAsset ? item.artSrc || item.iconSrc : item.bgSrc;
                        return (
                          <motion.article key={`${item.assetType}-${id}`} variants={itemMotion}>
                            <Panel hover className="flex h-full min-h-0 flex-col overflow-hidden">
                              <div className="grid h-56 max-h-56 min-h-0 place-items-center overflow-hidden border-b border-[color:var(--color-surface-border-3)] bg-black/35">
                                <MediaPreview src={media} fit={isFighterAsset ? "contain" : "cover"} fallback={isFighterAsset ? item.element : item.icon} className="h-full max-h-56 w-full rounded-none border-0 [&>img]:max-h-56 [&>img]:object-contain [&>video]:max-h-56 [&>video]:object-contain" />
                              </div>
                              <div className="flex flex-1 flex-col gap-3 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <h3 className="min-w-0 truncate font-[var(--font-name)] text-3xl leading-none tracking-normal" style={{ color: accentColor }}>
                                    {item.name || "Untitled"}
                                  </h3>
                                  <span className="shrink-0 rounded-md border border-[color:var(--color-surface-border-5)] bg-[color:var(--color-surface-soft-3)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                                    {isFighterAsset ? "Fighter" : "Arena"}
                                  </span>
                                </div>
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted-7)]">
                                  {item.visibilityScope === "all" ? "All classes" : item.className || "Class only"}
                                </p>
                                <p className="line-clamp-3 text-sm leading-6 text-[var(--color-text-muted)]">{item.description || "No description added yet."}</p>
                                <div className="mt-auto flex justify-end gap-2 pt-2">
                                  <Button tone="neutral" onClick={() => {
                                    if (isFighterAsset) {
                                      setEditorType("fighter");
                                      setFighterDraft({ ...emptyFighter(), ...item });
                                    } else {
                                      setEditorType("arena");
                                      setArenaDraft({ ...emptyArena(), ...item });
                                    }
                                  }}>
                                    Edit
                                  </Button>
                                  <Button tone="red" onClick={() => handleDelete(isFighterAsset ? "fighter" : "arena", id)}>Delete</Button>
                                </div>
                              </div>
                            </Panel>
                          </motion.article>
                        );
                      })}
                    </motion.div>
                  )}
                </>
              )}
            </div>

            {!readOnly && editorType ? (
              <Panel className="sticky top-5 max-h-[calc(100vh-72px)] overflow-y-auto p-5">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.26em] text-[var(--color-text-muted-7)]">
                      {editorType === "fighter" ? (fighterDraft._id ? "Edit fighter" : "New fighter") : (arenaDraft._id ? "Edit arena" : "New arena")}
                    </p>
                    <h3 className="mt-2 font-[var(--font-name)] text-3xl leading-none tracking-normal text-white">
                      {activeDraft.name || "Untitled asset"}
                    </h3>
                  </div>
                  <Button tone="neutral" onClick={resetEditors}>Close</Button>
                </div>

                <div className="grid gap-4">
                  {isAdmin ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          tone={(editorType === "fighter" ? fighterDraft.visibilityScope : arenaDraft.visibilityScope) === "class" ? "gold" : "neutral"}
                          onClick={() => {
                            if (editorType === "fighter") setFighterDraft((previous) => ({ ...previous, visibilityScope: "class" }));
                            else setArenaDraft((previous) => ({ ...previous, visibilityScope: "class" }));
                          }}
                        >
                          One class
                        </Button>
                        <Button
                          tone={(editorType === "fighter" ? fighterDraft.visibilityScope : arenaDraft.visibilityScope) === "all" ? "gold" : "neutral"}
                          onClick={() => {
                            if (editorType === "fighter") setFighterDraft((previous) => ({ ...previous, visibilityScope: "all" }));
                            else setArenaDraft((previous) => ({ ...previous, visibilityScope: "all" }));
                          }}
                        >
                          All classes
                        </Button>
                      </div>
                      {(editorType === "fighter" ? fighterDraft.visibilityScope : arenaDraft.visibilityScope) === "class" ? (
                        <SelectControl
                          label="Class"
                          value={(editorType === "fighter" ? fighterDraft.classId : arenaDraft.classId) || currentClass?._id || managedClasses[0]?._id || ""}
                          onChange={(nextClassId) => {
                            if (editorType === "fighter") setFighterDraft((previous) => ({ ...previous, classId: nextClassId }));
                            else setArenaDraft((previous) => ({ ...previous, classId: nextClassId }));
                          }}
                          options={(managedClasses.length ? managedClasses : currentClass ? [currentClass] : []).map((classItem) => ({ value: classItem._id, label: classItem.name }))}
                        />
                      ) : null}
                    </>
                  ) : null}

                  {editorType === "fighter" ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <DropZone label="ICON" value={fighterDraft.iconSrc} onFile={(file) => setFighterDraft((previous) => ({ ...previous, iconSrc: filePreview(file), iconFile: file }))} accept="image/*" hint={"ICON\nPNG/JPG"} />
                        <DropZone label="ART GIF / VIDEO" value={fighterDraft.artSrc} onFile={(file) => setFighterDraft((previous) => ({ ...previous, artSrc: filePreview(file), artFile: file }))} accept="image/gif,video/*" hint={"GIF / WEBM / MOV"} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <DropZone label="MOVE LEFT" value={fighterDraft.moveLeftArtSrc} onFile={(file) => setFighterDraft((previous) => ({ ...previous, moveLeftArtSrc: filePreview(file), moveLeftArtFile: file }))} onClear={() => setFighterDraft((previous) => ({ ...previous, moveLeftArtSrc: null, moveLeftArtFile: null }))} accept="image/gif,video/*" hint={"OPTIONAL LEFT"} aspectRatio="1 / 1.35" />
                        <DropZone label="MOVE RIGHT" value={fighterDraft.moveRightArtSrc} onFile={(file) => setFighterDraft((previous) => ({ ...previous, moveRightArtSrc: filePreview(file), moveRightArtFile: file }))} onClear={() => setFighterDraft((previous) => ({ ...previous, moveRightArtSrc: null, moveRightArtFile: null }))} accept="image/gif,video/*" hint={"OPTIONAL RIGHT"} aspectRatio="1 / 1.35" />
                      </div>
                      <label className="grid gap-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted-8)]">Name</span>
                        <input value={fighterDraft.name} onChange={(event) => setFighterDraft((previous) => ({ ...previous, name: event.target.value.toUpperCase() }))} placeholder="Fighter name" className={inputClass} />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted-8)]">Description</span>
                        <textarea value={fighterDraft.description} onChange={(event) => setFighterDraft((previous) => ({ ...previous, description: event.target.value }))} rows={4} maxLength={180} placeholder="Short description" className={`${inputClass} resize-none leading-6`} />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted-8)]">Theme color</span>
                        <input type="color" value={fighterDraft.color} onChange={(event) => setFighterDraft((previous) => ({ ...previous, color: event.target.value }))} className={`${inputClass} h-12 p-1`} />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted-8)]">Lore</span>
                        <textarea value={fighterDraft.lore} onChange={(event) => setFighterDraft((previous) => ({ ...previous, lore: event.target.value }))} rows={3} maxLength={260} placeholder="Optional backstory" className={`${inputClass} resize-none leading-6`} />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted-8)]">Entrance quote</span>
                        <input value={fighterDraft.entranceQuote} onChange={(event) => setFighterDraft((previous) => ({ ...previous, entranceQuote: event.target.value }))} maxLength={120} placeholder="Optional one-line quote" className={inputClass} />
                      </label>
                    </>
                  ) : (
                    <>
                      <DropZone label="ARENA BACKGROUND" value={arenaDraft.bgSrc} onFile={(file) => setArenaDraft((previous) => ({ ...previous, bgSrc: filePreview(file), bgFile: file }))} accept="image/*,video/*" hint={"BACKGROUND\nPNG/JPG/VIDEO"} aspectRatio="16 / 9" />
                      <label className="grid gap-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted-8)]">Name</span>
                        <input value={arenaDraft.name} onChange={(event) => setArenaDraft((previous) => ({ ...previous, name: event.target.value.toUpperCase() }))} placeholder="Arena name" className={inputClass} />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted-8)]">Description</span>
                        <textarea value={arenaDraft.description} onChange={(event) => setArenaDraft((previous) => ({ ...previous, description: event.target.value }))} rows={4} maxLength={220} placeholder="Short stage description" className={`${inputClass} resize-none leading-6`} />
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="grid gap-2">
                          <span className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted-8)]">Icon</span>
                          <input value={arenaDraft.icon} onChange={(event) => setArenaDraft((previous) => ({ ...previous, icon: event.target.value.slice(0, 4) || "*" }))} placeholder="*" className={inputClass} />
                        </label>
                        <label className="grid gap-2">
                          <span className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted-8)]">Difficulty {arenaDraft.difficulty}</span>
                          <input type="range" min="1" max="6" value={arenaDraft.difficulty} onChange={(event) => setArenaDraft((previous) => ({ ...previous, difficulty: Number(event.target.value) || 1 }))} className="h-12 w-full accent-[var(--gold)]" />
                        </label>
                      </div>
                    </>
                  )}

                  <Button tone="gold" onClick={handleSave} disabled={isSaving || !activeCanSave}>
                    {isSaving ? "Saving" : activeDraft._id || activeDraft.id ? "Save changes" : "Add asset"}
                  </Button>
                </div>
              </Panel>
            ) : null}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      style={modal ? { position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: "24px 18px" } : { minHeight: "100vh", background: "radial-gradient(circle at top, rgba(22,28,46,0.85), rgba(5,6,12,1) 55%)", color: "#fff", padding: "36px 18px" }}
      onClick={modal ? (event) => { if (event.target === event.currentTarget) onClose?.(); } : undefined}
    >
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ width: modal ? "min(1800px, calc(100vw - 32px))" : "calc(100vw - 32px)", maxWidth: modal ? undefined : 1880, minHeight: modal ? "88vh" : "calc(100vh - 72px)", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(5,7,16,0.95)", boxShadow: "0 24px 80px rgba(0,0,0,0.45)", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={modal ? (event) => event.stopPropagation() : undefined}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.45em", color: "#8d93a8" }}>{isTeacherGalleryTab ? "TEACHER ASSETS" : "CLASS CONTENT"}</div>
            <div style={{ marginTop: 8, color: "rgba(255,255,255,0.56)", fontSize: 14, letterSpacing: "0.1em" }}>
              {isTeacherGalleryTab
                ? "Manage teacher fighters and arenas."
                : currentClass
                  ? `${currentClass.name} . ${classCountText}`
                  : isAdmin
                    ? "Open a class from the home hub to view its showcase."
                    : "Join a class first to view what the class has uploaded."}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {user ? <button type="button" onClick={handleSignOut} style={{ color: "#a7afc2", border: "1px solid rgba(255,255,255,0.14)", padding: "8px 12px", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.3em" }}>SIGN OUT</button> : <Link href={loginHref} style={{ color: GOLD, textDecoration: "none", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.3em", border: `1px solid ${GOLD}66`, padding: "8px 12px", background: `${GOLD}10` }}>LOGIN</Link>}
            {isAdmin ? (
              modal ? (
                <button type="button" onClick={() => onClose?.()} style={{ color: GOLD, textDecoration: "none", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.3em", border: `1px solid ${GOLD}66`, padding: "8px 12px", background: `${GOLD}10` }}>HOME HUB</button>
              ) : (
                <Link href="/" style={{ color: GOLD, textDecoration: "none", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.3em", border: `1px solid ${GOLD}66`, padding: "8px 12px", background: `${GOLD}10` }}>HOME HUB</Link>
              )
            ) : null}
            {modal ? <button type="button" onClick={() => onClose?.()} style={{ color: "#666", border: "1px solid rgba(255,255,255,0.1)", padding: "8px 12px", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.3em" }}>CLOSE</button> : null}
          </div>
        </div>

        {!isTeacherGalleryTab ? (
          <div style={{ padding: "14px 22px 0", display: "flex", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <button type="button" onClick={() => handleTabChange("fighters")} style={{ padding: "10px 14px", border: `1px solid ${tab === "fighters" ? GOLD : "rgba(255,255,255,0.12)"}`, color: tab === "fighters" ? GOLD : "#a7afc2", background: tab === "fighters" ? `${GOLD}10` : "transparent", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.3em" }}>GIF FIGHTERS</button>
            <button type="button" onClick={() => handleTabChange("arenas")} style={{ padding: "10px 14px", border: `1px solid ${tab === "arenas" ? GOLD : "rgba(255,255,255,0.12)"}`, color: tab === "arenas" ? GOLD : "#a7afc2", background: tab === "arenas" ? `${GOLD}10` : "transparent", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.3em" }}>ARENA BACKGROUNDS</button>
            {isAdmin ? <button type="button" onClick={() => handleTabChange("students")} style={{ padding: "10px 14px", border: `1px solid ${tab === "students" ? GOLD : "rgba(255,255,255,0.12)"}`, color: tab === "students" ? GOLD : "#a7afc2", background: tab === "students" ? `${GOLD}10` : "transparent", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.3em" }}>STUDENTS</button> : null}
          </div>
        ) : null}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 22, display: "grid", gridTemplateColumns: editorType ? "minmax(0, 1fr) 420px" : "1fr", gap: 22, alignItems: "start" }}>
          <div>
            {error ? <div style={{ marginBottom: 14, padding: "12px 14px", border: "1px solid rgba(232,0,26,0.35)", background: "rgba(232,0,26,0.08)", color: "#ff8a95", fontFamily: "var(--font-display)", fontSize: 9, letterSpacing: "0.2em" }}>{error}</div> : null}
            {status ? <div style={{ marginBottom: 14, padding: "12px 14px", border: `1px solid ${GOLD}35`, background: `${GOLD}12`, color: "#f7d977", fontFamily: "var(--font-display)", fontSize: 9, letterSpacing: "0.2em" }}>{status}</div> : null}

            {!user ? (
              <div style={{ maxWidth: 520, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", padding: 20 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: "0.28em", color: "#fff" }}>LOGIN REQUIRED</div>
                <div style={{ marginTop: 12, color: "#8d93a8", fontSize: 13, lineHeight: 1.7 }}>
                  {initialJoinCode ? `Log in or create an account to join class ${String(initialJoinCode).trim().toUpperCase()}.` : "Log in or create an account to access class content."}
                </div>
                <Link
                  href={loginHref}
                  style={{
                    display: "inline-block",
                    marginTop: 18,
                    padding: "12px 14px",
                    border: `1px solid ${GOLD}77`,
                    color: GOLD,
                    background: `${GOLD}10`,
                    fontFamily: "var(--font-display)",
                    fontSize: 11,
                    letterSpacing: "0.35em",
                    textDecoration: "none",
                  }}
                >
                  LOGIN / SIGN UP
                </Link>
              </div>
            ) : !currentClass && !isTeacherGalleryTab ? (
              isAdmin ? (
                <div style={{ maxWidth: 560, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", padding: 20 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: "0.28em", color: "#fff" }}>NO CLASS OPEN</div>
                  <div style={{ marginTop: 12, color: "#8d93a8", fontSize: 13, lineHeight: 1.7 }}>
                    Open a class from the home hub to view its showcase.
                  </div>
                    <Link
                      href="/"
                    style={{
                      display: "inline-block",
                      marginTop: 18,
                      padding: "12px 14px",
                      border: `1px solid ${GOLD}77`,
                      color: GOLD,
                      background: `${GOLD}10`,
                      fontFamily: "var(--font-display)",
                      fontSize: 11,
                      letterSpacing: "0.35em",
                      textDecoration: "none",
                    }}
                  >
                    GO TO HOME HUB
                  </Link>
                </div>
              ) : (
                <div style={{ maxWidth: 520, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", padding: 20 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: "0.28em", color: "#fff" }}>JOIN A CLASS</div>
                  <form onSubmit={handleJoinClass} style={{ marginTop: 18, display: "grid", gap: 12 }}>
                    <Field label="Join Code"><input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="ABC123" style={INPUT_STYLE} /></Field>
                    <button type="submit" style={{ padding: "12px 14px", border: `1px solid ${GOLD}77`, color: GOLD, background: `${GOLD}10`, fontFamily: "var(--font-display)", fontSize: 11, letterSpacing: "0.35em" }}>JOIN CLASS</button>
                  </form>
                </div>
              )
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 16, padding: "18px 20px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                  <div>
                    {isTeacherGalleryTab ? (
                      <>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 15, letterSpacing: "0.18em", color: GOLD }}>TEACHER ASSETS</div>
                        <div style={{ marginTop: 6, color: "#8d93a8", fontSize: 11, letterSpacing: "0.18em" }}>YOUR TEACHER ASSETS . {managedClasses.length} CLASSES AVAILABLE</div>
                      </>
                    ) : currentClass ? (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ fontFamily: "var(--font-display)", fontSize: 15, letterSpacing: "0.18em", color: GOLD }}>{currentClass.name}</div>
                          <div
                            style={{
                              padding: "4px 8px",
                              border: `1px solid ${isClassLocked ? RED : GOLD}55`,
                              color: isClassLocked ? "#ff8a95" : "#f7d977",
                              background: isClassLocked ? "rgba(232,0,26,0.12)" : `${GOLD}12`,
                              fontFamily: "var(--font-display)",
                              fontSize: 8,
                              letterSpacing: "0.2em",
                            }}
                          >
                            {isClassLocked ? "CLASS LOCKED" : "CLASS OPEN"}
                          </div>
                        </div>
                        <div style={{ marginTop: 6, color: "#8d93a8", fontSize: 11, letterSpacing: "0.18em" }}>JOIN CODE {currentClass.joinCode} . {classCountText}</div>
                      </>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {isAdmin ? (
                      <Link
                        href="/"
                        style={{
                          padding: "10px 14px",
                          border: "1px solid rgba(255,255,255,0.12)",
                          color: "#9aa2b7",
                          background: "transparent",
                          fontFamily: "var(--font-display)",
                          fontSize: 10,
                          letterSpacing: "0.3em",
                          textDecoration: "none",
                        }}
                      >
                        HOME HUB
                      </Link>
                    ) : (
                      <button type="button" onClick={handleLeaveClass} style={{ padding: "10px 14px", border: "1px solid rgba(255,255,255,0.12)", color: "#9aa2b7", background: "transparent", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.3em" }}>LEAVE CLASS</button>
                    )}
                  </div>
                </div>

                {!readOnly && isStudentLockedOut ? (
                  <div style={{ marginBottom: 14, padding: "12px 14px", border: "1px solid rgba(232,0,26,0.35)", background: "rgba(232,0,26,0.08)", color: "#ff8a95", fontFamily: "var(--font-display)", fontSize: 9, letterSpacing: "0.2em" }}>
                    This class is locked. Students cannot add, edit, or delete GIFs and arenas right now.
                  </div>
                ) : null}

                {!readOnly && !isAdmin && tab === "fighters" && hasOwnFighterInClass ? (
                  <div style={{ marginBottom: 14, padding: "12px 14px", border: `1px solid ${GOLD}35`, background: `${GOLD}12`, color: "#f7d977", fontFamily: "var(--font-display)", fontSize: 9, letterSpacing: "0.2em" }}>
                    You already uploaded your 1 GIF fighter for this class.
                  </div>
                ) : null}
                {!readOnly && !isAdmin && tab === "arenas" && hasOwnArenaInClass ? (
                  <div style={{ marginBottom: 14, padding: "12px 14px", border: `1px solid ${GOLD}35`, background: `${GOLD}12`, color: "#f7d977", fontFamily: "var(--font-display)", fontSize: 9, letterSpacing: "0.2em" }}>
                    You already uploaded your 1 arena for this class.
                  </div>
                ) : null}

                {isAdmin || readOnly ? (
                  <div style={{ marginBottom: 16, maxWidth: 360 }}>
                    <Field label={isStudentsTab ? "Search Students" : isTeacherGalleryTab ? "Filter Teacher Assets" : "Search Showcase"}>
                      <input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder={isStudentsTab ? "Search by student name or email" : isTeacherGalleryTab ? "Search by name, class, or description" : "Search by gif name or student name"}
                        style={INPUT_STYLE}
                      />
                    </Field>
                  </div>
                ) : null}

                {isLoading ? <div style={{ padding: "48px 20px", textAlign: "center", color: "#666", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.35em" }}>LOADING CLASS CONTENT</div> : isTeacherGalleryTab ? (
                  <div style={{ display: "grid", gap: 16 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {[
                        ["all", "ALL"],
                        ["fighter", "MY FIGHTERS"],
                        ["arena", "MY ARENAS"],
                      ].map(([value, label]) => (
                        <button key={value} type="button" onClick={() => setGalleryFilter(value)} style={{ padding: "9px 12px", border: `1px solid ${galleryFilter === value ? GOLD : "rgba(255,255,255,0.12)"}`, color: galleryFilter === value ? GOLD : "#9aa2b7", background: galleryFilter === value ? `${GOLD}10` : "transparent", fontFamily: "var(--font-display)", fontSize: 9, letterSpacing: "0.22em" }}>
                          {label}
                        </button>
                      ))}
                      <button type="button" onClick={() => { setEditorType("fighter"); setFighterDraft({ ...emptyFighter(), classId: currentClass?._id || managedClasses[0]?._id || null }); }} style={{ marginLeft: 8, padding: "9px 12px", border: `1px solid ${GOLD}66`, color: GOLD, background: `${GOLD}10`, fontFamily: "var(--font-display)", fontSize: 9, letterSpacing: "0.22em" }}>+ FIGHTER</button>
                      <button type="button" onClick={() => { setEditorType("arena"); setArenaDraft({ ...emptyArena(), classId: currentClass?._id || managedClasses[0]?._id || null }); }} style={{ padding: "9px 12px", border: `1px solid ${GOLD}66`, color: GOLD, background: `${GOLD}10`, fontFamily: "var(--font-display)", fontSize: 9, letterSpacing: "0.22em" }}>+ ARENA</button>
                    </div>
                    {galleryItems.length === 0 ? (
                      <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", padding: "44px 22px", textAlign: "center", color: "#70798e", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.3em" }}>NO TEACHER ASSETS MATCH THIS FILTER</div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 310px))", gap: 18, justifyContent: "start", alignItems: "stretch" }}>
                        {galleryItems.map((item) => {
                          const id = item._id || item.id;
                          const isFighterAsset = item.assetType === "fighter";
                          const accentColor = isFighterAsset ? item.color || GOLD : GOLD;
                          return (
                            <div key={`${item.assetType}-${id}`} style={{ width: "100%", display: "flex", flexDirection: "column", minHeight: 300, border: "1px solid rgba(255,255,255,0.07)", background: "linear-gradient(180deg, rgba(13,18,29,0.98), rgba(7,10,18,0.98))", boxShadow: "0 18px 40px rgba(0,0,0,0.22)", overflow: "hidden", position: "relative" }}>
                              <div style={{ position: "absolute", inset: "0 auto auto 0", width: 4, height: "100%", background: `${accentColor}cc` }} />
                              <div style={{ width: "100%", height: 150, borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.45)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {isFighterAsset ? (item.artSrc ? (isVideoPreview(item.artSrc) ? <video src={item.artSrc} autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <img src={item.artSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />) : item.iconSrc ? <img src={item.iconSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 52 }}>{item.element}</span>) : (item.bgSrc ? (isVideoPreview(item.bgSrc) ? <video src={item.bgSrc} autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <img src={item.bgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />) : <span style={{ fontSize: 52 }}>{item.icon}</span>)}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "14px 14px 14px 18px" }}>
                                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: "0.16em", color: accentColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                                <div style={{ marginTop: 6, color: "#8d93a8", fontSize: 10, letterSpacing: "0.14em" }}>
                                  {isFighterAsset ? "GIF FIGHTER" : `${item.icon || "??"} . ARENA`} . {item.visibilityScope === "all" ? "ALL CLASSES" : item.className || "CLASS ONLY"}
                                </div>
                                <div style={{ marginTop: 10, color: "#a7afc2", fontSize: 12, lineHeight: 1.6, minHeight: 38 }}>{item.description || "No description added yet."}</div>
                                <div style={{ marginTop: "auto", paddingTop: 14, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                                  <button type="button" onClick={() => { if (isFighterAsset) { setEditorType("fighter"); setFighterDraft({ ...emptyFighter(), ...item }); } else { setEditorType("arena"); setArenaDraft({ ...emptyArena(), ...item }); } }} style={{ padding: "8px 10px", border: "1px solid rgba(255,255,255,0.14)", color: "#a7afc2", fontFamily: "var(--font-display)", fontSize: 8, letterSpacing: "0.18em" }}>EDIT</button>
                                  <button type="button" onClick={() => handleDelete(isFighterAsset ? "fighter" : "arena", id)} style={{ padding: "8px 10px", border: `1px solid ${RED}88`, color: RED, fontFamily: "var(--font-display)", fontSize: 8 }}>X</button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : isStudentsTab ? (
                  classMembers.length === 0 ? <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", padding: "44px 22px", textAlign: "center", color: "#70798e", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.3em" }}>NO STUDENTS HAVE JOINED THIS CLASS YET</div> : filteredList.length === 0 ? <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", padding: "44px 22px", textAlign: "center", color: "#70798e", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.3em" }}>NO MATCHES FOR THAT SEARCH</div> : (
                    <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", overflow: "hidden" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1.2fr) minmax(220px, 1fr) 140px", gap: 16, padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#8d93a8", fontFamily: "var(--font-display)", fontSize: 9, letterSpacing: "0.28em" }}>
                        <div>STUDENT</div>
                        <div>EMAIL</div>
                        <div>STATUS</div>
                      </div>
                      {filteredList.map((member, index) => (
                        <div key={member.id} style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1.2fr) minmax(220px, 1fr) 140px", gap: 16, padding: "16px 18px", borderTop: index === 0 ? "none" : "1px solid rgba(255,255,255,0.06)", alignItems: "center" }}>
                          <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 42, height: 42, overflow: "hidden", border: `1px solid ${GOLD}44`, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {member.image ? (
                                <img src={member.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <span style={{ color: GOLD, fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: "0.08em" }}>
                                  {member.studentName.trim().charAt(0).toUpperCase() || "S"}
                                </span>
                              )}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ color: GOLD, fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: "0.18em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{member.studentName}</div>
                              <div style={{ marginTop: 5, color: "#7e8699", fontFamily: "var(--font-display)", fontSize: 8, letterSpacing: "0.16em" }}>
                                {member.hasFighter && member.hasArena ? "DONE WITH TODOS" : `TODO${member.hasFighter ? "" : " FIGHTER"}${member.hasFighter || member.hasArena ? "" : " /"}${member.hasArena ? "" : member.hasFighter ? " ARENA" : " ARENA"}`}
                              </div>
                            </div>
                          </div>
                          <div style={{ minWidth: 0, color: "#a7afc2", fontSize: 13, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis" }}>{member.email || "No email available"}</div>
                          <div style={{ minWidth: 0, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                            <div
                              style={{
                                flexShrink: 0,
                                padding: "7px 9px",
                                border: `1px solid ${member.hasFighter && member.hasArena ? "rgba(103,224,143,0.52)" : `${RED}88`}`,
                                color: member.hasFighter && member.hasArena ? "#67e08f" : "#ff8a95",
                                background: member.hasFighter && member.hasArena ? "rgba(103,224,143,0.12)" : "rgba(232,0,26,0.08)",
                                fontFamily: "var(--font-display)",
                                fontSize: 8,
                                letterSpacing: "0.18em",
                              }}
                            >
                              {member.hasFighter && member.hasArena ? "DONE" : "TODO"}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveStudent(member)}
                              disabled={removingStudentId === member.userId}
                              style={{
                                flexShrink: 0,
                                padding: "8px 10px",
                                border: `1px solid ${RED}88`,
                                color: RED,
                                background: "transparent",
                                fontFamily: "var(--font-display)",
                                fontSize: 8,
                                letterSpacing: "0.18em",
                                opacity: removingStudentId === member.userId ? 0.5 : 1,
                              }}
                            >
                              {removingStudentId === member.userId ? "REMOVING..." : "REMOVE"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : list.length === 0 ? <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", padding: "44px 22px", textAlign: "center", color: "#70798e", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.3em" }}>{tab === "fighters" ? "NO GIF FIGHTERS IN THIS CLASS YET" : "NO ARENA BACKGROUNDS IN THIS CLASS YET"}</div> : filteredList.length === 0 ? <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", padding: "44px 22px", textAlign: "center", color: "#70798e", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.3em" }}>NO MATCHES FOR THAT SEARCH</div> : (
                  <div style={{ display: "grid", gridTemplateColumns: showcaseGridColumns, gap: 18, justifyContent: "start", alignItems: "stretch" }}>
                    {filteredList.map((item) => {
                      const id = item._id || item.id;
                      const canManageItem =
                        !readOnly &&
                        Boolean(user?.id) &&
                        (isAdmin || (!isStudentLockedOut && item.createdByUserId === user.id));
                      const accentColor = item.color || GOLD;
                      return (
                        <div key={id} style={{ width: "100%", display: "flex", flexDirection: "column", minHeight: tab === "fighters" ? 270 : 300, border: "1px solid rgba(255,255,255,0.07)", background: "linear-gradient(180deg, rgba(13,18,29,0.98), rgba(7,10,18,0.98))", boxShadow: "0 18px 40px rgba(0,0,0,0.22)", overflow: "hidden", position: "relative" }}>
                          <div style={{ position: "absolute", inset: "0 auto auto 0", width: 4, height: "100%", background: `${accentColor}cc` }} />
                          <div style={{ width: "100%", height: tab === "fighters" ? 132 : 156, borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.45)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {tab === "fighters" ? (item.artSrc ? (isVideoPreview(item.artSrc) ? <video src={item.artSrc} autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <img src={item.artSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />) : item.iconSrc ? <img src={item.iconSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 52 }}>{item.element}</span>) : (item.bgSrc ? (isVideoPreview(item.bgSrc) ? <video src={item.bgSrc} autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <img src={item.bgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />) : <span style={{ fontSize: 52 }}>{item.icon}</span>)}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "14px 14px 14px 18px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: "0.16em", color: accentColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                                <div style={{ marginTop: 6, color: "#8d93a8", fontSize: 10, letterSpacing: "0.14em" }}>
                                  {tab === "fighters" ? "Student upload" : `${item.icon || "??"} . DIFFICULTY ${item.difficulty}`}
                                </div>
                              </div>
                              {tab === "fighters" && item.iconSrc ? (
                                <div style={{ width: 42, height: 42, border: `1px solid ${accentColor}55`, background: "rgba(0,0,0,0.45)", overflow: "hidden", flexShrink: 0 }}>
                                  <img src={item.iconSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </div>
                              ) : null}
                            </div>

                            <div style={{ marginTop: 10, color: "#a7afc2", fontSize: 12, lineHeight: 1.6, minHeight: 38 }}>
                              {item.description || (tab === "fighters" ? "No description added yet." : "No arena description added yet.")}
                            </div>

                            <div style={{ marginTop: "auto", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10 }}>
                              <div style={{ color: "#a7afc2", fontFamily: "var(--font-display)", fontSize: 8, letterSpacing: "0.14em" }}>
                                BY {item.createdByUserName || item.createdByUserId || "UNKNOWN"}
                              </div>
                              {canManageItem ? <div style={{ display: "flex", gap: 8 }}><button type="button" onClick={() => { if (tab === "fighters") { setEditorType("fighter"); setFighterDraft({ ...emptyFighter(), ...item }); } else { setEditorType("arena"); setArenaDraft({ ...emptyArena(), ...item }); } }} style={{ padding: "8px 10px", border: "1px solid rgba(255,255,255,0.14)", color: "#a7afc2", fontFamily: "var(--font-display)", fontSize: 8, letterSpacing: "0.18em" }}>EDIT</button><button type="button" onClick={() => handleDelete(tab === "fighters" ? "fighter" : "arena", id)} style={{ padding: "8px 10px", border: `1px solid ${RED}88`, color: RED, fontFamily: "var(--font-display)", fontSize: 8 }}>X</button></div> : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
          {!readOnly && editorType ? <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(9,11,20,0.95)", padding: 18, display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 0, maxHeight: "calc(88vh - 120px)", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.35em", color: "#888" }}>{editorType === "fighter" ? (fighterDraft._id ? "EDIT GIF FIGHTER" : "NEW GIF FIGHTER") : (arenaDraft._id ? "EDIT CLASS ARENA" : "NEW CLASS ARENA")}</div></div>
            {isAdmin ? (
              <div style={{ display: "grid", gap: 12 }}>
                <Field label="Visible In">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (editorType === "fighter") setFighterDraft((previous) => ({ ...previous, visibilityScope: "class" }));
                        else setArenaDraft((previous) => ({ ...previous, visibilityScope: "class" }));
                      }}
                      style={{ padding: "10px 12px", border: `1px solid ${(editorType === "fighter" ? fighterDraft.visibilityScope : arenaDraft.visibilityScope) === "class" ? GOLD : "rgba(255,255,255,0.12)"}`, color: (editorType === "fighter" ? fighterDraft.visibilityScope : arenaDraft.visibilityScope) === "class" ? GOLD : "#9aa2b7", background: (editorType === "fighter" ? fighterDraft.visibilityScope : arenaDraft.visibilityScope) === "class" ? `${GOLD}10` : "transparent", fontFamily: "var(--font-display)", fontSize: 9, letterSpacing: "0.2em" }}
                    >
                      ONE CLASS
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (editorType === "fighter") setFighterDraft((previous) => ({ ...previous, visibilityScope: "all" }));
                        else setArenaDraft((previous) => ({ ...previous, visibilityScope: "all" }));
                      }}
                      style={{ padding: "10px 12px", border: `1px solid ${(editorType === "fighter" ? fighterDraft.visibilityScope : arenaDraft.visibilityScope) === "all" ? GOLD : "rgba(255,255,255,0.12)"}`, color: (editorType === "fighter" ? fighterDraft.visibilityScope : arenaDraft.visibilityScope) === "all" ? GOLD : "#9aa2b7", background: (editorType === "fighter" ? fighterDraft.visibilityScope : arenaDraft.visibilityScope) === "all" ? `${GOLD}10` : "transparent", fontFamily: "var(--font-display)", fontSize: 9, letterSpacing: "0.2em" }}
                    >
                      ALL CLASSES
                    </button>
                  </div>
                </Field>
                {(editorType === "fighter" ? fighterDraft.visibilityScope : arenaDraft.visibilityScope) === "class" ? (
                  <Field label="Class">
                    <CustomSelect
                      value={(editorType === "fighter" ? fighterDraft.classId : arenaDraft.classId) || currentClass?._id || managedClasses[0]?._id || ""}
                      onChange={(nextClassId) => {
                        if (editorType === "fighter") setFighterDraft((previous) => ({ ...previous, classId: nextClassId }));
                        else setArenaDraft((previous) => ({ ...previous, classId: nextClassId }));
                      }}
                      options={(managedClasses.length ? managedClasses : currentClass ? [currentClass] : []).map((classItem) => ({
                        value: classItem._id,
                        label: classItem.name,
                      }))}
                    />
                  </Field>
                ) : null}
              </div>
            ) : null}
            {editorType === "fighter" ? <>
              <div style={{ display: "flex", gap: 12 }}>
                <DropZone label="ICON" value={fighterDraft.iconSrc} onFile={(file) => setFighterDraft((previous) => ({ ...previous, iconSrc: filePreview(file), iconFile: file }))} accept="image/*" hint={"ICON . PNG/JPG\nRECOMMENDED 512x512"} />
                <DropZone label="ART GIF / VIDEO" value={fighterDraft.artSrc} onFile={(file) => setFighterDraft((previous) => ({ ...previous, artSrc: filePreview(file), artFile: file }))} accept="image/gif,video/*" hint={"GIF . WEBM . MOV\nRECOMMENDED 1040x1404"} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <DropZone label="MOVE LEFT" value={fighterDraft.moveLeftArtSrc} onFile={(file) => setFighterDraft((previous) => ({ ...previous, moveLeftArtSrc: filePreview(file), moveLeftArtFile: file }))} onClear={() => setFighterDraft((previous) => ({ ...previous, moveLeftArtSrc: null, moveLeftArtFile: null }))} accept="image/gif,video/*" hint={"OPTIONAL WALK LEFT\nGIF . WEBM . MOV"} aspectRatio="1 / 1.35" />
                <DropZone label="MOVE RIGHT" value={fighterDraft.moveRightArtSrc} onFile={(file) => setFighterDraft((previous) => ({ ...previous, moveRightArtSrc: filePreview(file), moveRightArtFile: file }))} onClear={() => setFighterDraft((previous) => ({ ...previous, moveRightArtSrc: null, moveRightArtFile: null }))} accept="image/gif,video/*" hint={"OPTIONAL WALK RIGHT\nGIF . WEBM . MOV"} aspectRatio="1 / 1.35" />
              </div>
              <Field label="Name"><input value={fighterDraft.name} onChange={(event) => setFighterDraft((previous) => ({ ...previous, name: event.target.value.toUpperCase() }))} placeholder="FIGHTER NAME" style={INPUT_STYLE} /></Field>
              <Field label="Description"><textarea value={fighterDraft.description} onChange={(event) => setFighterDraft((previous) => ({ ...previous, description: event.target.value }))} rows={4} maxLength={180} placeholder="Short description of the project or character." style={{ ...INPUT_STYLE, resize: "none", lineHeight: 1.6 }} /></Field>
              <Field label="Lore / Backstory (optional)"><textarea value={fighterDraft.lore} onChange={(event) => setFighterDraft((previous) => ({ ...previous, lore: event.target.value }))} rows={4} maxLength={260} placeholder="Optional backstory or lore snippet." style={{ ...INPUT_STYLE, resize: "none", lineHeight: 1.6 }} /></Field>
              <Field label="Entrance Quote (optional)"><input value={fighterDraft.entranceQuote} onChange={(event) => setFighterDraft((previous) => ({ ...previous, entranceQuote: event.target.value }))} maxLength={120} placeholder="Optional one-line quote for the fight intro." style={INPUT_STYLE} /></Field>
              <Field label="Theme Color"><ColorPicker value={fighterDraft.color} onChange={(color) => setFighterDraft((previous) => ({ ...previous, color }))} /></Field>
              <Field label="Fallback Emoji"><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{ELEMENT_OPTIONS.map((element) => <button key={element} type="button" onClick={() => setFighterDraft((previous) => ({ ...previous, element }))} style={{ padding: "4px 6px", border: fighterDraft.element === element ? "1px solid rgba(255,255,255,0.3)" : "1px solid transparent", background: fighterDraft.element === element ? "rgba(255,255,255,0.08)" : "transparent", fontSize: 18 }}>{element}</button>)}</div></Field>
              <button type="button" onClick={handleSave} disabled={isSaving || !fighterDraft.name.trim()} style={{ padding: "12px 14px", border: `1px solid ${fighterDraft.name.trim() ? GOLD : "rgba(255,255,255,0.08)"}`, color: fighterDraft.name.trim() ? GOLD : "#444", background: fighterDraft.name.trim() ? `${GOLD}10` : "transparent", fontFamily: "var(--font-display)", fontSize: 11, letterSpacing: "0.35em" }}>{isSaving ? "SAVING..." : fighterDraft._id ? "SAVE CHANGES" : "ADD TO CLASS"}</button>
            </> : <>
              <DropZone label="ARENA BACKGROUND" value={arenaDraft.bgSrc} onFile={(file) => setArenaDraft((previous) => ({ ...previous, bgSrc: filePreview(file), bgFile: file }))} accept="image/*,video/*" hint={"ARENA IMAGE OR VIDEO\nPNG . JPG . GIF . MP4"} aspectRatio="16 / 9" />
              <Field label="Arena Name"><input value={arenaDraft.name} onChange={(event) => setArenaDraft((previous) => ({ ...previous, name: event.target.value.toUpperCase() }))} placeholder="ARENA NAME" style={INPUT_STYLE} /></Field>
              <Field label="Description"><textarea value={arenaDraft.description} onChange={(event) => setArenaDraft((previous) => ({ ...previous, description: event.target.value }))} rows={4} maxLength={220} placeholder="Short stage description." style={{ ...INPUT_STYLE, resize: "none", lineHeight: 1.6 }} /></Field>
              <Field label="Difficulty"><input type="range" min="1" max="6" value={arenaDraft.difficulty} onChange={(event) => setArenaDraft((previous) => ({ ...previous, difficulty: Number(event.target.value) }))} /><div style={{ color: GOLD, fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.24em" }}>LEVEL {arenaDraft.difficulty}</div></Field>
              <Field label="Icon"><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{ARENA_ICONS.map((icon) => <button key={icon} type="button" onClick={() => setArenaDraft((previous) => ({ ...previous, icon }))} style={{ padding: "6px 8px", border: arenaDraft.icon === icon ? "1px solid rgba(255,255,255,0.3)" : "1px solid transparent", background: arenaDraft.icon === icon ? "rgba(255,255,255,0.08)" : "transparent", fontSize: 18 }}>{icon}</button>)}</div></Field>
              <button type="button" onClick={handleSave} disabled={isSaving || !arenaDraft.name.trim() || !arenaDraft.bgSrc} style={{ padding: "12px 14px", border: `1px solid ${arenaDraft.name.trim() && arenaDraft.bgSrc ? GOLD : "rgba(255,255,255,0.08)"}`, color: arenaDraft.name.trim() && arenaDraft.bgSrc ? GOLD : "#444", background: arenaDraft.name.trim() && arenaDraft.bgSrc ? `${GOLD}10` : "transparent", fontFamily: "var(--font-display)", fontSize: 11, letterSpacing: "0.35em" }}>{isSaving ? "SAVING..." : arenaDraft._id ? "SAVE CHANGES" : "ADD TO CLASS"}</button>
            </>}
          </div> : null}
        </div>
      </motion.div>
    </div>
  );
}
