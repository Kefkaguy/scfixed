
// ─── Pick Slots (bottom strip) ────────────────────────────────────────────────
import { motion } from "framer-motion";
export default function PickSlot({ pick, label, color, pending, slotSize = 58 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <motion.div
        style={{
          width: slotSize,
          height: slotSize,
          border: `2px solid ${pick ? color : pending ? color : "rgba(255,255,255,0.15)"}`,
          background: pick ? `${pick.character.color}22` : "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: slotSize * 0.42,
          position: "relative",
          overflow: "hidden",
          boxShadow: pick ? `0 0 12px ${color}66` : "none",
        }}
        animate={pending ? { borderColor: [color, "rgba(255,255,255,0.3)", color] } : {}}
        transition={{ duration: 1.2, repeat: Infinity }}
      >
        {pick ? (
          <span>{pick.character.element}</span>
        ) : pending ? (
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 0.9, repeat: Infinity }}
            style={{
              fontSize: "min(0.9vw, 11px)",
              color,
              fontFamily: "var(--font-display)",
              letterSpacing: "0.2em",
            }}
          >
            ?
          </motion.div>
        ) : (
          <div style={{
            width: "60%", height: "60%",
            border: "1px solid rgba(255,255,255,0.1)",
          }} />
        )}
      </motion.div>
      {pick && (
        <div style={{
          fontSize: "min(0.65vw, 8px)",
          fontFamily: "var(--font-display)",
          letterSpacing: "0.15em",
          color: pick.character.color,
          whiteSpace: "nowrap",
        }}>
          {pick.character.name}
        </div>
      )}
    </div>
  );
}
