import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import DiagonalStripes from "../DiagonalStripes";
import LevelBackground from "./levelbackground";
import { LEVELS } from "./levels";
import CustomArenasManager from "./CustomArenasManager";
const P1_COLOR = "#e8001a";
const P2_COLOR = "#0077ff";
const GOLD = "#f0c020";


function DifficultyPips({ level, color }) {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {Array.from({ length: 5 }, (_, i) => (
        <motion.div
          key={i}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.05 * i, duration: 0.2 }}
          style={{
            width: 6,
            height: i < level ? 18 : 10,
            background: i < level ? color : "rgba(255,255,255,0.1)",
            boxShadow: i < level ? `0 0 6px ${color}88` : "none",
            transformOrigin: "bottom",
          }}
        />
      ))}
    </div>
  );
}

function LevelCard({ lv, isSelected, index, onClick, onHover }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.08 * index, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      onMouseEnter={() => { setHovered(true); onHover(); }}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      style={{
        position: "relative",
        width: "100%",
        padding: 0,
        border: `1px solid ${isSelected ? lv.color : hovered ? `${lv.color}66` : "rgba(255,255,255,0.08)"}`,
        background: isSelected
          ? `linear-gradient(135deg, ${lv.color}18 0%, rgba(0,0,0,0.8) 100%)`
          : "rgba(0,0,0,0.55)",
        cursor: "pointer",
        overflow: "hidden",
        boxShadow: isSelected
          ? `0 0 32px ${lv.color}44, inset 0 0 20px ${lv.color}11`
          : hovered ? `0 0 16px ${lv.color}22` : "none",
        transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
        textAlign: "left",
      }}
    >
      {/* Stripe background */}
      <DiagonalStripes color={lv.color} opacity={isSelected ? 0.06 : 0.03} />

      {/* Glow corner */}
      {isSelected && (
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            position: "absolute",
            top: -20,
            right: -20,
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${lv.color}55 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
      )}

      <div style={{ position: "relative", zIndex: 2, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
        {/* Level number + icon */}
        <div style={{
          flexShrink: 0,
          width: 52,
          height: 52,
          border: `1px solid ${isSelected ? lv.color : "rgba(255,255,255,0.1)"}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: isSelected ? `${lv.color}22` : "rgba(0,0,0,0.5)",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: 8,
            letterSpacing: "0.3em",
            color: lv.color,
            marginBottom: 2,
          }}>
            LV
          </div>
          <div style={{
            fontFamily: "var(--font-name)",
            fontSize: 22,
            lineHeight: 1,
            color: isSelected ? lv.color : "#fff",
            textShadow: isSelected ? `0 0 12px ${lv.color}` : "none",
          }}>
            {lv.number}
          </div>
        </div>

        {/* Text content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "var(--font-name)",
            fontSize: "clamp(13px, 1.3vw, 17px)",
            letterSpacing: "0.06em",
            color: isSelected ? lv.color : "#fff",
            textShadow: isSelected ? `0 0 14px ${lv.color}88` : "none",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.1,
          }}>
            {lv.name}
          </div>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: 9,
            letterSpacing: "0.3em",
            color: "#555",
            marginTop: 2,
          }}>
            {lv.subtitle}
          </div>
        </div>

        {/* Difficulty pips */}
        <div style={{ flexShrink: 0 }}>
          <DifficultyPips level={lv.difficulty} color={lv.color} />
        </div>

        {/* Arrow */}
        <motion.div
          animate={isSelected ? { x: [0, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{
            flexShrink: 0,
            fontSize: 14,
            color: isSelected ? lv.color : "rgba(255,255,255,0.2)",
          }}
        >
          &gt;
        </motion.div>
      </div>

      {/* Tags bar */}
      <div style={{
        position: "relative",
        zIndex: 2,
        borderTop: `1px solid ${isSelected ? `${lv.color}33` : "rgba(255,255,255,0.05)"}`,
        padding: "6px 16px",
        display: "flex",
        gap: 8,
        background: "rgba(0,0,0,0.3)",
      }}>
        {lv.tags.map((tag) => (
          <span key={tag} style={{
            fontFamily: "var(--font-display)",
            fontSize: 7,
            letterSpacing: "0.25em",
            color: isSelected ? `${lv.color}cc` : "#444",
            padding: "2px 6px",
            border: `1px solid ${isSelected ? `${lv.color}44` : "rgba(255,255,255,0.05)"}`,
          }}>
            {tag}
          </span>
        ))}
      </div>

      {/* Active cursor pulse ring */}
      {isSelected && (
        <motion.div
          style={{ position: "absolute", inset: 0, border: `1px solid ${lv.color}`, pointerEvents: "none" }}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
}

function StagePreview({ lv }) {
  if (!lv) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={lv.id}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
          position: "relative",
          overflow: "hidden",
          border: `1px solid ${lv.color}44`,
          background: "#07080f",
          boxShadow: `0 0 40px ${lv.color}22, inset 0 0 30px rgba(0,0,0,0.6)`,
        }}
      >
        {/* Stage background: video or image, falls back to CSS gradient. */}
        <LevelBackground level={lv} dimAmount={0.35} zIndex={0} />
        <DiagonalStripes color={lv.color} opacity={0.04} />

        {/* Stage floor line */}
        <div style={{
          position: "absolute",
          bottom: "22%",
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${lv.color}88, transparent)`,
        }} />
        <div style={{
          position: "absolute",
          bottom: "22%",
          left: 0,
          right: 0,
          height: 40,
          background: `linear-gradient(to bottom, ${lv.color}11, transparent)`,
        }} />

        {/* Big level number backdrop */}
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-name)",
          fontSize: "clamp(80px, 18vw, 180px)",
          letterSpacing: "0.05em",
          color: `${lv.color}0a`,
          pointerEvents: "none",
          lineHeight: 1,
          userSelect: "none",
        }}>
          {lv.number}
        </div>

        {/* Center icon */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "clamp(40px, 6vw, 72px)",
            filter: `drop-shadow(0 0 20px ${lv.color}88)`,
            pointerEvents: "none",
          }}
        >
          {lv.icon}
        </motion.div>

        {/* Scanlines overlay */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
          pointerEvents: "none",
        }} />

        {/* Corner brackets */}
        {[
          { top: 8, left: 8, rotate: 0 },
          { top: 8, right: 8, rotate: 90 },
          { bottom: 8, right: 8, rotate: 180 },
          { bottom: 8, left: 8, rotate: 270 },
        ].map((pos, i) => (
          <div key={i} style={{
            position: "absolute",
            width: 16,
            height: 16,
            ...pos,
            transform: `rotate(${pos.rotate}deg)`,
            borderTop: `2px solid ${lv.color}88`,
            borderLeft: `2px solid ${lv.color}88`,
          }} />
        ))}

        {/* Stage name overlay */}
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "16px 18px 10px",
          background: "linear-gradient(to top, rgba(0,0,0,0.9), transparent)",
        }}>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: 8,
            letterSpacing: "0.5em",
            color: "#555",
            marginBottom: 3,
          }}>
            STAGE {lv.number} - {lv.subtitle.toUpperCase()}
          </div>
          <div style={{
            fontFamily: "var(--font-name)",
            fontSize: "clamp(16px, 2.2vw, 28px)",
            letterSpacing: "0.06em",
            color: lv.color,
            textShadow: `0 0 20px ${lv.color}cc`,
            lineHeight: 1,
          }}>
            {lv.name}
          </div>
        </div>

        {/* Difficulty indicator top-right */}
        <div style={{
          position: "absolute",
          top: 10,
          right: 14,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: 7,
            letterSpacing: "0.4em",
            color: "#555",
          }}>
            DIFFICULTY
          </div>
          <DifficultyPips level={lv.difficulty} color={lv.color} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function LevelSelect({ onSelect, onBack, mode, publicGallery = false, allowPreloadedAssets = false }) {
  const [customLevels, setCustomLevels] = useState([]);
  const [arenaManagerOpen, setArenaManagerOpen] = useState(false);
  const [hovered, setHovered] = useState(LEVELS[0].id);
  const [confirmed, setConfirmed] = useState(null);
  const allLevels = useMemo(
    () => [
      ...(publicGallery && !allowPreloadedAssets ? [] : LEVELS),
      ...(Array.isArray(customLevels) ? customLevels : []),
    ],
    [allowPreloadedAssets, customLevels, publicGallery]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCustomLevels() {
      try {
        const response = await fetch(publicGallery ? "/api/public-gallery" : "/api/arenas", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load class arenas.");
        }

        if (!cancelled) {
          setCustomLevels(Array.isArray(payload.arenas) ? payload.arenas : []);
        }
      } catch {
        if (!cancelled) {
          setCustomLevels([]);
        }
      }
    }

    loadCustomLevels();
    return () => {
      cancelled = true;
    };
  }, [arenaManagerOpen, publicGallery]);

  useEffect(() => {
    if (!allLevels.find((item) => item.id === hovered) && allLevels[0]) {
      setHovered(allLevels[0].id);
    }
  }, [allLevels, hovered]);

  const hoveredLevel = allLevels.find((l) => l.id === hovered) ?? allLevels[0];

  if (!hoveredLevel) {
    return (
      <div
        className="scanlines"
        style={{
          position: "relative",
          width: "100vw",
          height: "100vh",
          background: "#07080f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: "0.34em", color: GOLD }}>
            NO PUBLIC ARENAS
          </div>
          <div style={{ marginTop: 12, color: "#8d93a8", fontSize: 13, lineHeight: 1.7 }}>
            No public arenas yet. Add a teacher arena or approve a student arena to fill the showcase.
          </div>
          <button
            type="button"
            onClick={onBack}
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

  function handleSelect(lv) {
    setConfirmed(lv.id);
    setTimeout(() => onSelect(lv), 320);
  }

  return (
    <div
      className="scanlines"
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: "#07080f",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Ambient bg glow */}
      <AnimatePresence mode="wait">
        <motion.div
          key={hovered}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse 60% 50% at 70% 50%, ${hoveredLevel.color}12, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
      </AnimatePresence>
      <div className="grid-lines" style={{ position: "absolute", inset: 0, zIndex: 0 }} />

      {/* Top bar */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 28px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(0,0,0,0.7)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onBack}
          style={{
            color: "#555",
            fontFamily: "var(--font-display)",
            fontSize: 10,
            letterSpacing: "0.35em",
            cursor: "pointer",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "6px 16px",
            background: "transparent",
            transition: "color 0.2s, border-color 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#555"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
        >
          BACK
        </button>

        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: 8,
            letterSpacing: "0.6em",
            color: "#444",
            marginBottom: 3,
          }}>
            {mode?.toUpperCase()} MODE - SELECT STAGE
          </div>
          <div style={{
            fontFamily: "var(--font-name)",
            fontSize: "clamp(14px, 1.6vw, 20px)",
            letterSpacing: "0.1em",
            background: `linear-gradient(90deg, ${P1_COLOR}, #fff, ${P2_COLOR})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1,
          }}>
            LEVEL SELECT
          </div>
        </div>

        <div style={{
          fontFamily: "var(--font-display)",
          fontSize: 9,
          letterSpacing: "0.3em",
          color: "#333",
          textAlign: "right",
        }}>
          {!publicGallery ? (
            <button
              type="button"
              onClick={() => setArenaManagerOpen(true)}
              style={{
                color: GOLD,
                fontFamily: "var(--font-display)",
                fontSize: 9,
                letterSpacing: "0.3em",
                cursor: "pointer",
                border: `1px solid ${GOLD}55`,
                padding: "6px 12px",
                background: `${GOLD}10`,
              }}
            >
              CLASS ARENAS
            </button>
          ) : null}
          <div style={{ marginTop: 8 }}>{allLevels.length} STAGES</div>
        </div>
      </motion.div>

      {/* Main layout */}
      <div style={{
        position: "relative",
        zIndex: 5,
        flex: 1,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 0,
        minHeight: 0,
        overflow: "hidden",
      }}>
        {/* Left stage list */}
        <div style={{
          borderRight: "1px solid rgba(255,255,255,0.07)",
          overflowY: "auto",
          padding: "20px 20px 20px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 8,
              letterSpacing: "0.5em",
              color: "#333",
              marginBottom: 4,
            }}
          >
            -- AVAILABLE STAGES --
          </motion.div>

          {allLevels.map((lv, i) => (
            <LevelCard
              key={lv.id}
              lv={lv}
              isSelected={hovered === lv.id}
              index={i}
              onClick={() => handleSelect(lv)}
              onHover={() => setHovered(lv.id)}
            />
          ))}
        </div>

        {/* Right preview panel */}
        <div style={{
          padding: "20px 28px 20px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          overflow: "hidden",
        }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 8,
              letterSpacing: "0.5em",
              color: "#333",
            }}
          >
            -- STAGE PREVIEW --
          </motion.div>

          <StagePreview lv={hoveredLevel} />

          {/* Description */}
          <AnimatePresence mode="wait">
            <motion.div
              key={hoveredLevel.id + "-desc"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                padding: "14px 16px",
                borderLeft: `2px solid ${hoveredLevel.color}66`,
                background: `${hoveredLevel.color}08`,
              }}
            >
              <p style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(10px, 0.9vw, 13px)",
                letterSpacing: "0.05em",
                lineHeight: 1.75,
                color: "rgba(255,255,255,0.55)",
                margin: 0,
              }}>
                {hoveredLevel.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Select button */}
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSelect(hoveredLevel)}
            animate={confirmed === hoveredLevel.id ? { opacity: 0.5 } : { opacity: 1 }}
            style={{
              padding: "14px 40px",
              border: `2px solid ${hoveredLevel.color}`,
              color: hoveredLevel.color,
              fontFamily: "var(--font-name)",
              fontSize: "clamp(16px, 1.8vw, 22px)",
              letterSpacing: "0.2em",
              cursor: "pointer",
              background: `${hoveredLevel.color}10`,
              boxShadow: `0 0 24px ${hoveredLevel.color}44`,
              transition: "background 0.2s",
              lineHeight: 1,
              width: "100%",
            }}
          >
            {confirmed === hoveredLevel.id ? "LOADING..." : "SELECT STAGE"}
          </motion.button>

          {/* Hint */}
          <div style={{
            textAlign: "center",
            fontFamily: "var(--font-display)",
            fontSize: 7,
            letterSpacing: "0.4em",
            color: "#2a2a2a",
          }}>
            HOVER TO PREVIEW / CLICK TO CONFIRM
          </div>
        </div>
      </div>

      <AnimatePresence>
        {arenaManagerOpen ? (
          <CustomArenasManager modal onClose={() => setArenaManagerOpen(false)} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
