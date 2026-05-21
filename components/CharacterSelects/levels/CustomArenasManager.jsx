"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { uploadFileDirectToS3 } from "@/lib/direct-upload";

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
const ICON_OPTIONS = ["SWRD", "STDM", "FIRE", "MOON", "CROWN", "VOID", "SKUL", "RUIN", "LAVA", "ICE", "LAMP", "BLOOM"];

function isVideoPreview(value) {
  return typeof value === "string" && (value.startsWith("blob:") || value.endsWith(".webm") || value.endsWith(".mp4") || value.endsWith(".mov"));
}

function normalizeArena(arena = {}) {
  return {
    _id: arena._id ?? null,
    id: arena.id ?? null,
    name: arena.name ?? "",
    icon: arena.icon ?? "SWRD",
    description: arena.description ?? "",
    difficulty: arena.difficulty ?? 1,
    bgSrc: arena.bgSrc ?? null,
    bgKey: arena.bgKey ?? null,
    bgFile: null,
  };
}

function emptyArena() {
  return normalizeArena();
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 9, letterSpacing: "0.35em", color: "#677087", fontFamily: "var(--font-display)", textTransform: "uppercase" }}>{label}</label>
      {children}
    </div>
  );
}

function DropZone({ value, onFile }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const isVideo = isVideoPreview(value);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 9, letterSpacing: "0.35em", color: "#677087", fontFamily: "var(--font-display)" }}>ARENA BACKGROUND</div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          onFile(event.dataTransfer.files[0]);
        }}
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
          border: `1px solid ${dragging ? GOLD : value ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)"}`,
          background: dragging ? `${GOLD}11` : "rgba(0,0,0,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          cursor: "pointer",
          position: "relative",
        }}
      >
        {value ? (
          isVideo ? (
            <video src={value} autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )
        ) : (
          <div style={{ textAlign: "center", padding: 10, color: "#65708a" }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>+</div>
            <div style={{ fontSize: 8, letterSpacing: "0.2em", lineHeight: 1.6, whiteSpace: "pre-line", fontFamily: "var(--font-display)" }}>
              ARENA IMAGE OR VIDEO{"\n"}PNG . JPG . GIF . MP4
            </div>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*,video/*" onChange={(event) => onFile(event.target.files[0])} style={{ display: "none" }} />
      </div>
    </div>
  );
}

export default function CustomArenasManager({ modal = false, onClose = null }) {
  const [session, setSession] = useState(null);
  const [arenas, setArenas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [viewportWidth, setViewportWidth] = useState(0);

  const currentClass = session?.currentClass ?? null;
  const user = session?.user ?? null;
  const isAdmin = Boolean(session?.isAdmin);
  const canUpload = Boolean(session?.canUploadToClass);
  const showEditor = Boolean(editing);
  const activeEditing = editing ?? emptyArena();
  const isCompactLayout = (viewportWidth || 0) > 0 && viewportWidth < 900;

  const loadSession = useCallback(async () => {
    const response = await fetch("/api/session", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Failed to load session.");
    }
    setSession(payload);
    return payload;
  }, []);

  const loadArenas = useCallback(async () => {
    const response = await fetch("/api/arenas", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Failed to load class arenas.");
    }
    setArenas(Array.isArray(payload.arenas) ? payload.arenas : []);
    return payload;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setIsLoading(true);
      setError("");
      try {
        const nextSession = await loadSession();
        if (!cancelled && nextSession.currentClass) {
          await loadArenas();
        }
        if (!cancelled && !nextSession.currentClass) {
          setArenas([]);
        }
      } catch (bootError) {
        if (!cancelled) {
          setError(bootError.message || "Failed to load class arenas.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [loadArenas, loadSession]);

  useEffect(() => {
    function updateViewportWidth() {
      setViewportWidth(window.innerWidth);
    }

    updateViewportWidth();
    window.addEventListener("resize", updateViewportWidth);
    window.visualViewport?.addEventListener("resize", updateViewportWidth);

    return () => {
      window.removeEventListener("resize", updateViewportWidth);
      window.visualViewport?.removeEventListener("resize", updateViewportWidth);
    };
  }, []);

  function updateEditing(patch) {
    setEditing((previous) => ({ ...(previous ?? emptyArena()), ...patch }));
  }

  function handlePickedFile(file) {
    if (!file) {
      return;
    }

    updateEditing({ bgSrc: URL.createObjectURL(file), bgFile: file });
  }

  async function refreshAll() {
    const nextSession = await loadSession();
    if (nextSession.currentClass) {
      await loadArenas();
    } else {
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
      if (!response.ok) {
        throw new Error(payload.error || "Failed to join class.");
      }

      setStatus(`Joined ${payload.currentClass.name}.`);
      setJoinCode("");
      await refreshAll();
    } catch (joinError) {
      setError(joinError.message || "Failed to join class.");
    }
  }

  async function handleLeaveClass() {
    setError("");
    setStatus("");

    try {
      const response = await fetch("/api/session/class", { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to clear class.");
      }
      setEditing(null);
      setArenas([]);
      await loadSession();
      setStatus("Class selection cleared.");
    } catch (leaveError) {
      setError(leaveError.message || "Failed to clear class.");
    }
  }

  async function handleSaveArena() {
    if (!activeEditing.name.trim()) {
      return;
    }

    setError("");
    setStatus("");
    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append("name", activeEditing.name || "");
      formData.append("icon", activeEditing.icon || "SWRD");
      formData.append("description", activeEditing.description || "");
      formData.append("difficulty", String(activeEditing.difficulty || 1));

      if (activeEditing.bgFile instanceof File) {
        const upload = await uploadFileDirectToS3({
          file: activeEditing.bgFile,
          folder: "arena-backgrounds",
          namePrefix: activeEditing.name || "arena",
        });
        formData.append("bgSrc", upload.url);
        formData.append("bgKey", upload.key);
      } else if (activeEditing.bgSrc && !activeEditing.bgSrc.startsWith("blob:")) {
        formData.append("bgSrc", activeEditing.bgSrc);
        if (activeEditing.bgKey) {
          formData.append("bgKey", activeEditing.bgKey);
        }
      }

      const identifier = activeEditing._id || activeEditing.id;
      const response = await fetch(identifier ? `/api/arenas/${identifier}` : "/api/arenas", {
        method: identifier ? "PUT" : "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save arena.");
      }

      setEditing(null);
      await loadArenas();
      setStatus(identifier ? "Arena updated." : "Arena added to the class.");
    } catch (saveError) {
      setError(saveError.message || "Failed to save arena.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteArena(arenaId) {
    setDeleteId(arenaId);
    setError("");
    setStatus("");

    try {
      const response = await fetch(`/api/arenas/${arenaId}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to delete arena.");
      }

      setConfirmDelete(null);
      await loadArenas();
      setStatus("Arena deleted.");
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete arena.");
    } finally {
      setDeleteId(null);
    }
  }

  async function handleSignOut() {
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div
      style={modal
        ? { position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: "24px 18px" }
        : { minHeight: "100vh", background: "radial-gradient(circle at top, rgba(22,28,46,0.85), rgba(5,6,12,1) 55%)", color: "#fff", padding: "36px 18px" }}
      onClick={modal ? (event) => { if (event.target === event.currentTarget) onClose?.(); } : undefined}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: "min(1600px, calc(100vw - 32px))",
          minHeight: modal ? "88vh" : "calc(100vh - 72px)",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(5,7,16,0.95)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={modal ? (event) => event.stopPropagation() : undefined}
      >
        <div style={{ display: "flex", flexDirection: isCompactLayout ? "column" : "row", justifyContent: "space-between", alignItems: isCompactLayout ? "stretch" : "center", gap: 14, padding: isCompactLayout ? "14px 16px" : "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.45em", color: "#8d93a8" }}>CLASS ARENAS</div>
            <div style={{ marginTop: 8, color: "rgba(255,255,255,0.56)", fontSize: 14, letterSpacing: "0.1em" }}>
              {currentClass ? `${currentClass.name} . custom arenas only show in this class.` : "Login first, then join a class to upload custom arena backgrounds."}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {user ? (
              <button type="button" onClick={handleSignOut} style={{ color: "#a7afc2", border: "1px solid rgba(255,255,255,0.14)", padding: "8px 12px", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.3em" }}>
                SIGN OUT
              </button>
            ) : (
              <Link href="/login?callbackUrl=/" style={{ color: GOLD, textDecoration: "none", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.3em", border: `1px solid ${GOLD}66`, padding: "8px 12px", background: `${GOLD}10` }}>
                LOGIN
              </Link>
            )}
            {modal ? (
              <button type="button" onClick={() => onClose?.()} style={{ color: "#666", border: "1px solid rgba(255,255,255,0.1)", padding: "8px 12px", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.3em" }}>
                CLOSE
              </button>
            ) : null}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: isCompactLayout ? 14 : 22, display: "grid", gridTemplateColumns: showEditor && !isCompactLayout ? "minmax(0, 1fr) 460px" : "1fr", gap: isCompactLayout ? 14 : 22 }}>
          <div>
            {error ? <div style={{ marginBottom: 14, padding: "12px 14px", border: "1px solid rgba(232,0,26,0.35)", background: "rgba(232,0,26,0.08)", color: "#ff8a95", fontFamily: "var(--font-display)", fontSize: 9, letterSpacing: "0.2em" }}>{error}</div> : null}
            {status ? <div style={{ marginBottom: 14, padding: "12px 14px", border: `1px solid ${GOLD}35`, background: `${GOLD}12`, color: "#f7d977", fontFamily: "var(--font-display)", fontSize: 9, letterSpacing: "0.2em" }}>{status}</div> : null}

            {!user ? (
              <div style={{ maxWidth: 520, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", padding: 20 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: "0.28em", color: "#fff" }}>LOGIN REQUIRED</div>
                <Link href="/login?callbackUrl=/" style={{ display: "inline-block", marginTop: 18, padding: "12px 14px", border: `1px solid ${GOLD}77`, color: GOLD, background: `${GOLD}10`, textDecoration: "none", fontFamily: "var(--font-display)", fontSize: 11, letterSpacing: "0.35em" }}>
                  LOGIN / SIGN UP
                </Link>
              </div>
            ) : !currentClass ? (
              <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))" }}>
                <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", padding: 20 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: "0.28em", color: "#fff" }}>JOIN A CLASS</div>
                  <div style={{ marginTop: 10, color: "#8d93a8", fontSize: 13, lineHeight: 1.6 }}>
                    Join a class first so your arena background only appears inside that classroom.
                  </div>
                  <form onSubmit={handleJoinClass} style={{ marginTop: 18, display: "grid", gap: 12 }}>
                    <Field label="Join Code">
                      <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="ABC123" style={INPUT_STYLE} />
                    </Field>
                    <button type="submit" style={{ padding: "12px 14px", border: `1px solid ${GOLD}77`, color: GOLD, background: `${GOLD}10`, fontFamily: "var(--font-display)", fontSize: 11, letterSpacing: "0.35em" }}>
                      JOIN CLASS
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 16, padding: "18px 20px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 15, letterSpacing: "0.18em", color: GOLD }}>{currentClass.name}</div>
                    <div style={{ marginTop: 6, color: "#8d93a8", fontSize: 11, letterSpacing: "0.18em" }}>
                      CUSTOM ARENAS ONLY SHOW INSIDE THIS CLASS
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {canUpload ? (
                      <button type="button" onClick={() => { setError(""); setEditing(emptyArena()); }} style={{ padding: "10px 14px", border: `1px solid ${GOLD}66`, color: GOLD, background: `${GOLD}10`, fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.3em" }}>
                        + ADD ARENA TO CLASS
                      </button>
                    ) : null}
                    <button type="button" onClick={handleLeaveClass} style={{ padding: "10px 14px", border: "1px solid rgba(255,255,255,0.12)", color: "#9aa2b7", background: "transparent", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.3em" }}>
                      {isAdmin ? "CLEAR ACTIVE CLASS" : "LEAVE CLASS"}
                    </button>
                  </div>
                </div>

                {isLoading ? (
                  <div style={{ padding: "48px 20px", textAlign: "center", color: "#666", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.35em" }}>LOADING CLASS ARENAS</div>
                ) : arenas.length === 0 ? (
                  <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", padding: "44px 22px", textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: "0.35em", color: "#70798e" }}>NO CUSTOM ARENAS IN THIS CLASS YET</div>
                    <div style={{ marginTop: 10, color: "#555f76", fontSize: 13 }}>Upload a background image and it will appear in this class stage list only.</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 14 }}>
                    {arenas.map((arena) => {
                      const arenaId = arena._id || arena.id;
                      return (
                        <div key={arenaId} style={{ display: "grid", gridTemplateColumns: isCompactLayout ? "1fr" : "180px minmax(0, 1fr) auto", gap: isCompactLayout ? 12 : 18, alignItems: "center", padding: isCompactLayout ? 14 : "18px 16px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(10,14,22,0.9)" }}>
                          <div style={{ width: isCompactLayout ? "100%" : 180, aspectRatio: "16 / 9", border: `1px solid ${arena.color || GOLD}55`, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                            {arena.bgSrc ? (
                              isVideoPreview(arena.bgSrc) ? (
                                <video src={arena.bgSrc} autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={arena.bgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              )
                            ) : (
                              <span style={{ fontSize: 32 }}>{arena.icon || "SWRD"}</span>
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: "0.16em", color: arena.color || GOLD, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {arena.name}
                            </div>
                            <div style={{ marginTop: 6, color: "#8d93a8", fontSize: 12, letterSpacing: "0.12em" }}>
                              {arena.icon || "SWRD"} . DIFFICULTY {arena.difficulty}
                            </div>
                            <div style={{ marginTop: 8, color: "#586176", fontSize: 10, letterSpacing: "0.12em" }}>
                              {arena.description || "No description yet."}
                            </div>
                          </div>
                          {isAdmin ? (
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                              <button type="button" onClick={() => setEditing(normalizeArena(arena))} style={{ padding: "10px 14px", border: "1px solid rgba(255,255,255,0.14)", color: "#a7afc2", fontFamily: "var(--font-display)", fontSize: 9, letterSpacing: "0.22em" }}>
                                EDIT
                              </button>
                              {confirmDelete === arenaId ? (
                                <>
                                  <button type="button" onClick={() => handleDeleteArena(arenaId)} disabled={deleteId === arenaId} style={{ padding: "10px 14px", border: `1px solid ${RED}`, color: RED, fontFamily: "var(--font-display)", fontSize: 9, letterSpacing: "0.22em" }}>
                                    {deleteId === arenaId ? "DELETING" : "CONFIRM"}
                                  </button>
                                  <button type="button" onClick={() => setConfirmDelete(null)} style={{ padding: "10px 12px", border: "1px solid rgba(255,255,255,0.08)", color: "#666", fontFamily: "var(--font-display)", fontSize: 9 }}>
                                    X
                                  </button>
                                </>
                              ) : (
                                <button type="button" onClick={() => setConfirmDelete(arenaId)} style={{ padding: "10px 12px", border: "1px solid rgba(255,255,255,0.08)", color: "#666", fontFamily: "var(--font-display)", fontSize: 9 }}>
                                  X
                                </button>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          <AnimatePresence initial={false}>
            {showEditor ? (
              <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(9,11,20,0.95)", padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.35em", color: "#888" }}>
                    {activeEditing._id ? "EDIT CLASS ARENA" : "NEW CLASS ARENA"}
                  </div>
                  <button type="button" onClick={() => setEditing(null)} style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#666", padding: "6px 10px", fontFamily: "var(--font-display)", fontSize: 8, letterSpacing: "0.2em" }}>
                    X
                  </button>
                </div>

                <DropZone value={activeEditing.bgSrc} onFile={handlePickedFile} />

                <Field label="Arena Name">
                  <input value={activeEditing.name} onChange={(event) => updateEditing({ name: event.target.value.toUpperCase() })} placeholder="ARENA NAME" style={INPUT_STYLE} />
                </Field>

                <Field label="Description">
                  <textarea value={activeEditing.description} onChange={(event) => updateEditing({ description: event.target.value })} rows={4} maxLength={220} placeholder="Short stage description." style={{ ...INPUT_STYLE, resize: "none", lineHeight: 1.6 }} />
                </Field>

                <Field label="Difficulty">
                  <input type="range" min="1" max="6" value={activeEditing.difficulty} onChange={(event) => updateEditing({ difficulty: Number(event.target.value) })} />
                  <div style={{ color: GOLD, fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.24em" }}>
                    LEVEL {activeEditing.difficulty}
                  </div>
                </Field>

                <Field label="Icon">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {ICON_OPTIONS.map((icon) => (
                      <button key={icon} type="button" onClick={() => updateEditing({ icon })} style={{ padding: "6px 8px", border: activeEditing.icon === icon ? "1px solid rgba(255,255,255,0.3)" : "1px solid transparent", background: activeEditing.icon === icon ? "rgba(255,255,255,0.08)" : "transparent", fontSize: 18 }}>
                        {icon}
                      </button>
                    ))}
                  </div>
                </Field>

                <button type="button" onClick={handleSaveArena} disabled={isSaving || !activeEditing.name.trim() || !activeEditing.bgSrc} style={{ padding: "12px 14px", border: `1px solid ${activeEditing.name.trim() && activeEditing.bgSrc ? GOLD : "rgba(255,255,255,0.08)"}`, color: activeEditing.name.trim() && activeEditing.bgSrc ? GOLD : "#444", background: activeEditing.name.trim() && activeEditing.bgSrc ? `${GOLD}10` : "transparent", fontFamily: "var(--font-display)", fontSize: 11, letterSpacing: "0.35em" }}>
                  {isSaving ? "SAVING..." : activeEditing._id ? "SAVE CHANGES" : "ADD TO CLASS"}
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
