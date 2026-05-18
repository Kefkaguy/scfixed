"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect, useCallback, useMemo } from "react";
import ModeSelect from "./ModeSelect";
import LevelSelect from "./levels/LevelSelect";
import { motion, AnimatePresence } from "framer-motion";
import { BsSymmetryVertical } from "react-icons/bs";
import CharArtStack from "./CharArtStack";
import { CHARACTERS } from "@/data/characters";
import TurnBanner from "./TurnBanner";
import CharCard from "./CharCard";
import PickSlot from "./PickSlot";
import NamePlate from "./NamePlate";
import FightBanner from "./FightBanner";
import { LEVELS } from "./levels/levels";

const DRAFT_ORDER = { "1v1": [1, 2] };
const P1_COLOR = "#e8001a";
const P2_COLOR = "#0077ff";
const GOLD = "#f0c020";
const COLS = 9;
const SEARCH_RESET_MS = 1800;
const CHARACTER_SELECT_BACKGROUND = "#212121";

function normalizeSearchValue(value) {
  return String(value || "").trim().toLowerCase();
}

function getCharacterSearchFields(char) {
  const ownerName = normalizeSearchValue(char?.createdByUserName);
  const title = normalizeSearchValue(char?.title);
  return {
    name: normalizeSearchValue(char?.name),
    ownerName,
    secondaryLabel: char?.createdByUserName || char?.title || "Built-in roster",
    searchText: [char?.name, char?.createdByUserName, char?.title].map(normalizeSearchValue).filter(Boolean).join(" "),
  };
}

export default function CharacterSelect({ publicGallery = false, allowPreloadedAssets = false, initialMode = null }) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [level, setLevel] = useState(publicGallery && !allowPreloadedAssets ? null : LEVELS[0]);
  const [p1Rotated, setP1Rotated] = useState(false);
  const [p2Rotated, setP2Rotated] = useState(false);

  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [picks, setPicks] = useState([]);
  const [draftStep, setDraftStep] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [done, setDone] = useState(false);
  const [fightStarted, setFightStarted] = useState(false);
  const [customChars, setCustomChars] = useState([]);
  const [classSession, setClassSession] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewportWidth, setViewportWidth] = useState(0);
  const allChars = useMemo(
    () => [
      ...(publicGallery && !allowPreloadedAssets ? [] : CHARACTERS),
      ...(Array.isArray(customChars) ? customChars : []),
    ],
    [allowPreloadedAssets, customChars, publicGallery]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadClassState() {
      try {
        if (publicGallery) {
          const [galleryResponse, sessionResponse] = await Promise.all([
            fetch("/api/public-gallery", { cache: "no-store" }),
            fetch("/api/session", { cache: "no-store" }),
          ]);
          const galleryPayload = await galleryResponse.json();
          const sessionPayload = await sessionResponse.json();
          if (!galleryResponse.ok) {
            throw new Error(galleryPayload.error || "Failed to load public gallery.");
          }

          if (!cancelled) {
            setClassSession(sessionResponse.ok ? sessionPayload : null);
            setCustomChars(Array.isArray(galleryPayload.fighters) ? galleryPayload.fighters : []);
          }
          return;
        }

        const [sessionResponse, charactersResponse] = await Promise.all([
          fetch("/api/session", { cache: "no-store" }),
          fetch("/api/characters", { cache: "no-store" }),
        ]);
        const sessionPayload = await sessionResponse.json();
        const charactersPayload = await charactersResponse.json();

        if (!sessionResponse.ok) {
          throw new Error(sessionPayload.error || "Failed to load class session.");
        }

        if (!charactersResponse.ok) {
          throw new Error(charactersPayload.error || "Failed to load class GIFs.");
        }

        if (!cancelled) {
          setClassSession(sessionPayload);
          setCustomChars(Array.isArray(charactersPayload.characters) ? charactersPayload.characters : []);
        }
      } catch (error) {
        console.error("[CharacterSelect] Failed to load class state", error);
        if (!cancelled) {
          setCustomChars([]);
          setClassSession(null);
        }
      }
    }

    loadClassState();

    return () => {
      cancelled = true;
    };
  }, [publicGallery]);

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

  useEffect(() => {
    if (publicGallery && !allowPreloadedAssets && level && LEVELS.some((item) => item.id === level.id)) {
      setLevel(null);
    }
    if ((!publicGallery || allowPreloadedAssets) && !level) {
      setLevel(LEVELS[0]);
    }
  }, [allowPreloadedAssets, level, publicGallery]);

  const order = useMemo(() => (mode ? DRAFT_ORDER[mode] : []), [mode]);
  const currentPlayer = !done && mode ? order[draftStep] : null;
  const pickedIds = useMemo(() => picks.map((p) => p.character.id), [picks]);
  const p1Picks = picks.filter((p) => p.player === 1);
  const p2Picks = picks.filter((p) => p.player === 2);
  const maxPerPlayer = 1;

  const previewChar = allChars[cursor] ?? allChars[0];
  const searchMatch = useMemo(() => {
    const query = normalizeSearchValue(searchTerm);
    if (!query) {
      return null;
    }

    const matchedIndex = allChars.findIndex((char) => {
      const fields = getCharacterSearchFields(char);
      return fields.searchText.includes(query);
    });

    if (matchedIndex < 0) {
      return { index: -1, char: null, query, matchedBy: "" };
    }

    const matchedChar = allChars[matchedIndex];
    const fields = getCharacterSearchFields(matchedChar);
    const matchedBy =
      fields.name.includes(query)
        ? "Character"
        : fields.ownerName
          ? "Student"
          : "Roster";

    return {
      index: matchedIndex,
      char: matchedChar,
      query,
      matchedBy,
      secondaryLabel: fields.secondaryLabel,
    };
  }, [allChars, searchTerm]);

  const p1DisplayChars = currentPlayer === 1
    ? [previewChar]
    : p1Picks.length > 0 ? p1Picks.map((pk) => pk.character)
    : [];
  const p2DisplayChars = currentPlayer === 2
    ? [previewChar]
    : p2Picks.length > 0 ? p2Picks.map((pk) => pk.character)
    : [];

  const p1DisplayChar = p1DisplayChars[0] ?? null;
  const p2DisplayChar = p2DisplayChars[0] ?? null;

  const p1FlavorText = p1DisplayChars[0]?.lore || p1DisplayChars[0]?.description || "";
  const p2FlavorText = p2DisplayChars[0]?.lore || p2DisplayChars[0]?.description || "";
  const selectArtSize = Math.min((viewportWidth || 875) * 0.32, 520);

  const confirmPick = useCallback((char) => {
    if (!mode || done || pickedIds.includes(char.id)) return;
    const player = order[draftStep];
    const newPicks = [...picks, { player, character: char }];
    setPicks(newPicks);
    if (draftStep + 1 >= order.length) setDone(true);
    else setDraftStep(draftStep + 1);
  }, [mode, done, pickedIds, order, draftStep, picks]);

  useEffect(() => {
    if (searchMatch?.index >= 0 && searchMatch.index !== cursor) {
      setCursor(searchMatch.index);
    }
  }, [cursor, searchMatch]);

  useEffect(() => {
    if (!searchTerm) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSearchTerm("");
    }, SEARCH_RESET_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  const handleKey = useCallback((e) => {
    if (done || !mode) return;
    const isTypingKey = e.key.length === 1 && /[a-z0-9 ]/i.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey;
    if (isTypingKey) {
      e.preventDefault();
      setSearchTerm((current) => `${current}${e.key}`.slice(0, 32));
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      setSearchTerm((current) => current.slice(0, -1));
      return;
    }
    if (e.key === "Escape") {
      if (searchTerm) {
        e.preventDefault();
        setSearchTerm("");
      }
      return;
    }
    if (e.key === "ArrowRight") { e.preventDefault(); setCursor((i) => Math.min(i + 1, allChars.length - 1)); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); setCursor((i) => Math.max(i - 1, 0)); }
    if (e.key === "ArrowDown")  { e.preventDefault(); setCursor((i) => Math.min(i + COLS, allChars.length - 1)); }
    if (e.key === "ArrowUp")    { e.preventDefault(); setCursor((i) => Math.max(i - COLS, 0)); }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const targetChar = searchMatch?.char || allChars[cursor];
      if (targetChar) {
        confirmPick(targetChar);
      }
      setSearchTerm("");
    }
  }, [done, mode, searchTerm, cursor, confirmPick, allChars, searchMatch]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  function reset() {
    setPicks([]); setDraftStep(0); setDone(false); setFightStarted(false);
    setMode(null); setLevel(null); setShowLevelSelect(false); setCursor(0);
    setP1Rotated(false); setP2Rotated(false);
  }

  function resetPicks() {
    setPicks([]);
    setDraftStep(0);
    setDone(false);
    setFightStarted(false);
    setCursor(0);
    setP1Rotated(false);
    setP2Rotated(false);
  }

  // Handle mode select. "level-select" is a special signal.
  function handleModeSelect(m) {
    if (m === "level-select") {
      setShowLevelSelect(true);
    } else {
      setMode(m);
    }
  }

  // Show ModeSelect
  if (!mode && !showLevelSelect) {
    return <ModeSelect onSelect={handleModeSelect} session={classSession} onSignOut={() => signOut({ callbackUrl: "/" })} />;
  }

  // Show LevelSelect while mode is still unknown. User picks level first, then mode.
  if (showLevelSelect && !mode) {
    return (
      <LevelSelect
        publicGallery={publicGallery}
        allowPreloadedAssets={allowPreloadedAssets}
        mode={level ? "level chosen" : null}
        onBack={() => setShowLevelSelect(false)}
        onSelect={(lv) => {
          setLevel(lv);
          // After picking a level, send them to mode select (without level-select button reappearing)
          setShowLevelSelect(false);
          // We set a temporary flag so ModeSelect shows without the level entry (optional UX)
          // For simplicity, just show mode select again; user picks 1v1 or 2v2
        }}
      />
    );
  }

  // If level was chosen but mode still isn't set, show mode select again
  if (!mode && level && !showLevelSelect) {
    return (
      <div style={{ position: "relative" }}>
        <ModeSelect
          session={classSession}
          onSignOut={() => signOut({ callbackUrl: "/" })}
          onSelect={(m) => {
            if (m !== "level-select") setMode(m);
          }}
        />
        {/* Level reminder badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: "fixed",
            top: 16,
            right: 24,
            zIndex: 100,
            padding: "8px 18px",
            border: `1px solid ${level.color}88`,
            background: `${level.color}14`,
            color: level.color,
            fontFamily: "var(--font-display)",
            fontSize: 9,
            letterSpacing: "0.35em",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>{level.icon}</span>
          STAGE: {level.name}
        </motion.div>
      </div>
    );
  }

  const bgChar = previewChar;

  if (!bgChar) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: CHARACTER_SELECT_BACKGROUND,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: "0.34em", color: GOLD }}>
            NO PUBLIC FIGHTERS
          </div>
          <div style={{ marginTop: 12, color: "#8d93a8", fontSize: 13, lineHeight: 1.7 }}>
            No public fighters yet. Add a teacher fighter or approve a student fighter to fill the showcase.
          </div>
          <button
            type="button"
            onClick={() => router.push(publicGallery ? "/showcase" : "/")}
            style={{
              marginTop: 18,
              padding: "12px 14px",
              border: `1px solid ${GOLD}77`,
              color: GOLD,
              background: `${GOLD}10`,
              fontFamily: "var(--font-display)",
              fontSize: 11,
              letterSpacing: "0.35em",
            }}
          >
            BACK
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="scanlines"
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: CHARACTER_SELECT_BACKGROUND,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/digital-art-battle-logo.png"
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          opacity: 0.14,
          pointerEvents: "none",
          userSelect: "none",
        }}
      />

      {/* Character color ambient glow on top of level bg */}
      {level && (
        <AnimatePresence mode="wait">
          <motion.div
            key={bgChar.id + "-glow"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: "absolute", inset: 0, zIndex: 1,
              background: `
                radial-gradient(ellipse 45% 45% at 22% 50%, ${p1DisplayChar ? p1DisplayChar.color : bgChar.color}18, transparent 65%),
                radial-gradient(ellipse 45% 45% at 78% 50%, ${p2DisplayChar ? p2DisplayChar.color : bgChar.color}18, transparent 65%)
              `,
              pointerEvents: "none",
            }}
          />
        </AnimatePresence>
      )}

      <div className="grid-lines" style={{ position: "absolute", inset: 0, zIndex: 0 }} />

      <div style={{
        position: "relative", zIndex: 10,
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        padding: "10px 24px 8px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "transparent",
      }}>
        {/* Left: 1P + NamePlate */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            background: P1_COLOR, color: "#fff",
            fontFamily: "var(--font-display)",
            fontSize: 11, letterSpacing: "0.3em",
            padding: "3px 10px",
          }}>1P</div>
          <NamePlate char={p1DisplayChar} player={1} side="left" visible={!!p1DisplayChar} />
        </div>

        {/* Center */}
        <div style={{ textAlign: "center", whiteSpace: "nowrap" }}>
          {/* Level badge */}
          {level && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "2px 10px",
                border: `1px solid ${level.color}55`,
                background: `${level.color}10`,
                color: level.color,
                fontFamily: "var(--font-display)",
                fontSize: 7,
                letterSpacing: "0.3em",
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 9 }}>{level.icon}</span>
              {level.name}
            </motion.div>
          )}
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(7px, 0.7vw, 9px)",
            letterSpacing: "0.5em",
            color: "#555",
            marginBottom: 2,
          }}>
            -- CHARACTER SELECT --
          </div>
          {classSession?.currentClass && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
                padding: "3px 10px 4px",
                border: "1px solid rgba(240,192,32,0.38)",
                background: "rgba(240,192,32,0.08)",
                color: GOLD,
                fontFamily: "var(--font-display)",
                fontSize: 8,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
              }}
            >
              {classSession.currentClass.name}
            </motion.div>
          )}
          {!done && <TurnBanner player={currentPlayer} step={draftStep} total={order.length} />}
        </div>

        {/* Right: NamePlate + 2P */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
          <NamePlate char={p2DisplayChar} player={2} side="right" visible={!!p2DisplayChar} />
          <div style={{
            background: P2_COLOR, color: "#fff",
            fontFamily: "var(--font-display)",
            fontSize: 11, letterSpacing: "0.3em",
            padding: "3px 10px",
          }}>2P</div>
        </div>
      </div>

      <AnimatePresence>
        {searchTerm ? (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "38%",
              transform: "translate(-50%, -50%)",
              zIndex: 60,
              width: "min(720px, 72vw)",
              maxWidth: "84vw",
              pointerEvents: "none",
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.16 }}
              style={{
                padding: "14px 24px 16px",
                textAlign: "center",
                background: "linear-gradient(180deg, rgba(4,6,12,0.82), rgba(4,6,12,0.38))",
                borderTop: `1px solid ${searchMatch?.char ? GOLD : "rgba(232,0,26,0.55)"}`,
                borderBottom: `1px solid ${searchMatch?.char ? GOLD : "rgba(232,0,26,0.55)"}`,
                boxShadow: searchMatch?.char ? `0 0 40px ${GOLD}22` : "0 0 40px rgba(232,0,26,0.16)",
                backdropFilter: "blur(4px)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-name)",
                  fontSize: "clamp(34px, 6vw, 84px)",
                  lineHeight: 0.95,
                  letterSpacing: "0.18em",
                  color: searchMatch?.char ? "#fff3bf" : "#ffb8c0",
                  textShadow: searchMatch?.char
                    ? `0 0 26px ${GOLD}aa, 0 0 60px ${GOLD}33`
                    : "0 0 22px rgba(232,0,26,0.6)",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {searchTerm}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(9px, 1vw, 12px)",
                  letterSpacing: "0.28em",
                  color: searchMatch?.char ? "rgba(255,255,255,0.72)" : "#ffb8c0",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {searchMatch?.char
                  ? `${searchMatch.char.name}${searchMatch.secondaryLabel ? ` . ${searchMatch.secondaryLabel}` : ""}`
                  : "No character or student match"}
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <div style={{ position: "relative", zIndex: 5, flex: 1, display: "flex", minHeight: 0 }}>
        {/* LEFT art column */}
        <div style={{
          position: "relative", zIndex: 10, width: "28%", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "flex-end",
        }}>
          <AnimatePresence mode="wait">
            {p1DisplayChars.length > 0 && (
              <motion.div
                key={p1DisplayChars.map(c => c.id).join("-") + "-l"}
                initial={{ x: -80, opacity: 0 }}
                animate={{ x: 0, opacity: 1, rotateY: p1Rotated ? 180 : 0 }}
                exit={{ x: -60, opacity: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "flex-end",
                  pointerEvents: "none",
                  transformStyle: "preserve-3d",
                }}
              >
                <CharArtStack chars={p1DisplayChars} flipped={false} baseSize={selectArtSize} />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            onClick={() => setP1Rotated((current) => !current)}
            disabled={!p1DisplayChar}
            whileHover={p1DisplayChar ? { scale: 1.04 } : {}}
            whileTap={p1DisplayChar ? { scale: 0.96 } : {}}
            style={{
              position: "absolute",
              right: 12,
              bottom: 18,
              zIndex: 30,
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              border: `1px solid ${p1DisplayChar ? `${P1_COLOR}88` : "rgba(255,255,255,0.14)"}`,
              background: p1DisplayChar ? "rgba(12,14,22,0.82)" : "rgba(12,14,22,0.45)",
              color: p1DisplayChar ? P1_COLOR : "rgba(255,255,255,0.34)",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(8px, 0.8vw, 10px)",
              letterSpacing: "0.26em",
              cursor: p1DisplayChar ? "pointer" : "default",
              boxShadow: p1DisplayChar ? `0 0 16px ${P1_COLOR}22` : "none",
              opacity: p1Rotated ? 1 : 0.9,
            }}
          >
            <BsSymmetryVertical size={14} />
          </motion.button>

          {/* P1 description overlay */}
          <AnimatePresence mode="wait">
            {currentPlayer === 1 && p1FlavorText && (
              <motion.div
                key={p1DisplayChars[0].id + "-desc-l"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: "absolute",
                  top: 28,
                  left: 12,
                  right: 8,
                  pointerEvents: "none",
                  zIndex: 20,
                  padding: "18px 12px 12px 14px",
                  background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 65%, transparent 100%)",
                }}
              >
                <div style={{ borderLeft: `2px solid ${p1DisplayChars[0].color}bb`, paddingLeft: 10 }}>
                  <p style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(12px, 1vw, 14px)",
                    letterSpacing: "0.08em",
                    lineHeight: 1.75,
                    color: "rgba(255,255,255,0.68)",
                    margin: 0,
                    textAlign: "left",
                  }}>
                    {p1FlavorText}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CENTER column */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          paddingBottom: 6,
          minWidth: 0,
          zIndex: 10,
        }}>
          {/* Pick slots strip */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 24,
            padding: "8px 0 10px",
          }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {Array.from({ length: maxPerPlayer }, (_, i) => {
                const pick = p1Picks[i];
                const isPending = !pick && !done && currentPlayer === 1 && p1Picks.length === i;
                return <PickSlot key={i} pick={pick} label={`P1 ${i + 1}`} color={P1_COLOR} pending={isPending} slotSize={52} />;
              })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <motion.button
                disabled={!done}
                onClick={done ? () => setFightStarted(true) : undefined}
                whileHover={done ? { scale: 1.05 } : {}}
                whileTap={done ? { scale: 0.95 } : {}}
                style={{
                  padding: "8px 32px",
                  fontFamily: "var(--font-name)",
                  fontSize: "clamp(18px, 1.8vw, 24px)",
                  letterSpacing: "0.18em",
                  border: `2px solid ${done ? GOLD : "rgba(255,255,255,0.1)"}`,
                  color: done ? GOLD : "rgba(255,255,255,0.15)",
                  background: done ? `rgba(240,192,32,0.07)` : "transparent",
                  boxShadow: done ? `0 0 18px ${GOLD}44` : "none",
                  cursor: done ? "pointer" : "default",
                  transition: "all 0.4s ease",
                  lineHeight: 1,
                }}
              >
                FIGHT
              </motion.button>
              <div style={{
                fontSize: "min(0.6vw, 8px)",
                fontFamily: "var(--font-display)",
                letterSpacing: "0.4em",
                color: "#383838",
              }}>
                {done ? "READY" : "DRAFT"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {Array.from({ length: maxPerPlayer }, (_, i) => {
                const pick = p2Picks[i];
                const isPending = !pick && !done && currentPlayer === 2 && p2Picks.length === i;
                return <PickSlot key={i} pick={pick} label={`P2 ${i + 1}`} color={P2_COLOR} pending={isPending} slotSize={52} />;
              })}
            </div>
          </div>

          {/* Character grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gap: 3,
            padding: "0 12px",
          }}>
            {allChars.map((char, idx) => {
              const whoPickedIt = picks.find((p) => p.character.id === char.id);
              return (
                <CharCard
                  key={char.id}
                  char={char}
                  isSelected={cursor === idx}
                  pickedBy={whoPickedIt ? whoPickedIt.player : null}
                  isCursor1={cursor === idx && currentPlayer === 1 && !done}
                  isCursor2={cursor === idx && currentPlayer === 2 && !done}
                  onClick={() => { setCursor(idx); confirmPick(char); }}
                  onHover={() => setCursor(idx)}
                />
              );
            })}
          </div>

          {/* Bottom hint + buttons */}
          <div style={{
            textAlign: "center",
            marginTop: 6,
            fontSize: "min(0.65vw, 8px)",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.35em",
            color: "#333",
          }}>
            TYPE TO SEARCH &nbsp;/&nbsp; ARROWS NAVIGATE &nbsp;/&nbsp; ENTER OR CLICK TO SELECT
          </div>
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            marginTop: 6,
            paddingBottom: 2,
          }}>
            <button
              onClick={reset}
              style={{
                color: "#999",
                fontFamily: "var(--font-display)",
                fontSize: "clamp(9px, 1vw, 12px)",
                letterSpacing: "0.3em",
                cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.18)",
                padding: "6px 18px",
                background: "rgba(255,255,255,0.04)",
                transition: "all 0.2s ease",
              }}
            >
              BACK
            </button>

            {/* Level select button inside char select */}
            <button
              onClick={() => setShowLevelSelect(true)}
              style={{
                color: level ? level.color : "#555",
                fontFamily: "var(--font-display)",
                fontSize: "clamp(9px, 1vw, 12px)",
                letterSpacing: "0.3em",
                cursor: "pointer",
                border: `1px solid ${level ? `${level.color}66` : "rgba(255,255,255,0.1)"}`,
                padding: "6px 18px",
                background: level ? `${level.color}0d` : "rgba(255,255,255,0.02)",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {level ? (
                <>{level.icon} {level.name}</>
              ) : (
                "SELECT LEVEL"
              )}
            </button>

            <button
              onClick={() => router.push(publicGallery ? "/showcase" : "/")}
              style={{
                color: publicGallery ? GOLD : classSession?.isAdmin ? "#ff9da9" : GOLD,
                fontFamily: "var(--font-display)",
                fontSize: "clamp(9px, 1vw, 12px)",
                letterSpacing: "0.3em",
                cursor: "pointer",
                border: publicGallery ? `1px solid ${GOLD}88` : classSession?.isAdmin ? "1px solid rgba(232,0,26,0.45)" : `1px solid ${GOLD}88`,
                padding: "6px 18px",
                background: publicGallery ? `${GOLD}14` : classSession?.isAdmin ? "rgba(232,0,26,0.1)" : `${GOLD}14`,
                transition: "all 0.2s ease",
              }}
            >
              {publicGallery ? "SHOWCASE" : "HOME DASHBOARD"}
            </button>

            <button
              onClick={resetPicks}
              disabled={picks.length === 0}
              style={{
                color: done ? "#ffcf66" : picks.length > 0 ? "#cfd6e6" : "rgba(255,255,255,0.28)",
                fontFamily: "var(--font-display)",
                fontSize: "clamp(9px, 1vw, 12px)",
                letterSpacing: "0.3em",
                cursor: picks.length > 0 ? "pointer" : "default",
                border: done ? "1px solid rgba(240,192,32,0.52)" : "1px solid rgba(255,255,255,0.18)",
                padding: "6px 18px",
                background: done ? "rgba(240,192,32,0.08)" : "rgba(255,255,255,0.04)",
                transition: "all 0.2s ease",
                opacity: picks.length > 0 ? 1 : 0.55,
              }}
            >
              RESET PICKS
            </button>
          </div>
        </div>

        {/* RIGHT art column */}
        <div style={{
          position: "relative", zIndex: 10, width: "28%", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "flex-start",
        }}>
          <AnimatePresence mode="wait">
            {p2DisplayChars.length > 0 && (
              <motion.div
                key={p2DisplayChars.map(c => c.id).join("-") + "-r"}
                initial={{ x: 80, opacity: 0 }}
                animate={{ x: 0, opacity: 1, rotateY: p2Rotated ? 180 : 0 }}
                exit={{ x: 60, opacity: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "flex-start",
                  pointerEvents: "none",
                  transformStyle: "preserve-3d",
                }}
              >
                <CharArtStack chars={p2DisplayChars} flipped={true} baseSize={selectArtSize} />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            onClick={() => setP2Rotated((current) => !current)}
            disabled={!p2DisplayChar}
            whileHover={p2DisplayChar ? { scale: 1.04 } : {}}
            whileTap={p2DisplayChar ? { scale: 0.96 } : {}}
            style={{
              position: "absolute",
              left: 12,
              bottom: 18,
              zIndex: 30,
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              border: `1px solid ${p2DisplayChar ? `${P2_COLOR}88` : "rgba(255,255,255,0.14)"}`,
              background: p2DisplayChar ? "rgba(12,14,22,0.82)" : "rgba(12,14,22,0.45)",
              color: p2DisplayChar ? P2_COLOR : "rgba(255,255,255,0.34)",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(8px, 0.8vw, 10px)",
              letterSpacing: "0.26em",
              cursor: p2DisplayChar ? "pointer" : "default",
              boxShadow: p2DisplayChar ? `0 0 16px ${P2_COLOR}22` : "none",
              opacity: p2Rotated ? 1 : 0.9,
            }}
          >
            <BsSymmetryVertical size={14} />
          </motion.button>

          {/* P2 description overlay */}
          <AnimatePresence mode="wait">
            {currentPlayer === 2 && p2FlavorText && (
              <motion.div
                key={p2DisplayChars[0].id + "-desc-r"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: "absolute",
                  top: 28,
                  left: 8,
                  right: 12,
                  pointerEvents: "none",
                  zIndex: 20,
                  padding: "18px 14px 12px 12px",
                  background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 65%, transparent 100%)",
                }}
              >
                <div style={{ borderRight: `2px solid ${p2DisplayChars[0].color}bb`, paddingRight: 10, textAlign: "right" }}>
                  <p style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(12px, 1vw, 14px)",
                    letterSpacing: "0.08em",
                    lineHeight: 1.75,
                    color: "rgba(255,255,255,0.68)",
                    margin: 0,
                    textAlign: "right",
                  }}>
                    {p2FlavorText}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {fightStarted && (
        <FightBanner
          p1Chars={p1Picks}
          p2Chars={p2Picks}
          p1Rotated={p1Rotated}
          p2Rotated={p2Rotated}
          onRematch={reset}
          level={level}
          isTeacherView={Boolean(classSession?.isAdmin)}
        />
      )}

      {/* Level Select overlay slides in over char select. */}
      <AnimatePresence>
        {showLevelSelect && mode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 150 }}
          >
            <LevelSelect
              publicGallery={publicGallery}
              allowPreloadedAssets={allowPreloadedAssets}
              mode={mode}
              onBack={() => setShowLevelSelect(false)}
              onSelect={(lv) => {
                setLevel(lv);
                setShowLevelSelect(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
