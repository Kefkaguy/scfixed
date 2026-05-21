import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import DiagonalStripes from "./DiagonalStripes";
const P1_COLOR = "#e8001a";
const P2_COLOR = "#0077ff";
export default function CharCard({ char, isSelected, pickedBy, isCursor1, isCursor2, onClick, onHover }) {
  const [imgFailed, setImgFailed] = useState(false);
  const isPicked = pickedBy !== null;
  const iconSrc = typeof char.iconSrc === "string" && char.iconSrc.trim() ? char.iconSrc.trim() : null;
  const borderColor = isCursor1 ? P1_COLOR : isCursor2 ? P2_COLOR : isPicked
    ? pickedBy === 1 ? P1_COLOR : P2_COLOR
    : "rgba(255,255,255,0.15)";

  return (
    <motion.button
      className="char-card"
      onClick={onClick}
      onMouseEnter={onHover}
      disabled={isPicked}
      whileHover={!isPicked ? { scale: 1.08, zIndex: 10 } : {}}
      whileTap={!isPicked ? { scale: 0.93 } : {}}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "1 / 1.1",
        background: isPicked
          ? `${pickedBy === 1 ? P1_COLOR : P2_COLOR}33`
          : `radial-gradient(circle at 60% 30%, ${char.color}22, #0a0c1a 70%)`,
        border: `2px solid ${borderColor}`,
        boxShadow: (isCursor1 || isCursor2)
          ? `0 0 20px ${isCursor1 ? P1_COLOR : P2_COLOR}99, inset 0 0 12px ${isCursor1 ? P1_COLOR : P2_COLOR}33`
          : isPicked ? `0 0 10px ${borderColor}66` : "none",
        overflow: "hidden",
        cursor: isPicked ? "default" : "pointer",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
    >
      {/* Diagonal lines inside card */}
      <DiagonalStripes color={char.color} opacity={0.07} />

      {/* Character art — real image with emoji fallback */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        filter: isPicked ? "brightness(0.4) grayscale(0.4)" : "none",
        transition: "filter 0.2s",
      }}>
        {!imgFailed && iconSrc ? (
          <Image
            key={char.id + "-icon"}
            src={iconSrc}
            alt={char.name}
            width={600}
            height={600}
            unoptimized
            onError={() => setImgFailed(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top center",
              display: "block",
            }}
          />
        ) : (
          <span style={{ fontSize: "clamp(18px, 5vw, 36px)" }}>{char.element}</span>
        )}
      </div>

      {/* Name strip at bottom */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "rgba(0,0,0,0.75)",
        padding: "2px 3px",
        textAlign: "center",
        fontSize: "clamp(6px, 1.5vw, 9px)",
        fontFamily: "var(--font-display)",
        letterSpacing: "0.1em",
        color: isPicked ? "#666" : char.color,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {char.name}
      </div>

      {/* Picked badge */}
      {isPicked && (
        <div style={{
          position: "absolute", top: 2, right: 2,
          background: pickedBy === 1 ? P1_COLOR : P2_COLOR,
          color: "#fff",
          fontSize: "clamp(6px, 1.35vw, 8px)",
          fontFamily: "var(--font-display)",
          padding: "1px 4px",
          letterSpacing: "0.1em",
        }}>
          {pickedBy}P
        </div>
      )}

      {/* Active cursor ring */}
      {(isCursor1 || isCursor2) && (
        <motion.div
          style={{
            position: "absolute", inset: 0,
            border: `2px solid ${isCursor1 ? P1_COLOR : P2_COLOR}`,
            pointerEvents: "none",
          }}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
}
