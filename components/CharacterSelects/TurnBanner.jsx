import { AnimatePresence, motion } from "framer-motion";
const P1_COLOR = "#e8001a";
const P2_COLOR = "#0077ff";
export default function TurnBanner({ player, step, total }) {
  const color = player === 1 ? P1_COLOR : P2_COLOR;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${player}-${step}`}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 10, opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          textAlign: "center",
          fontFamily: "var(--font-display)",
        }}
      >
        <div style={{
          fontSize: "clamp(9px, 0.9vw, 12px)",
          letterSpacing: "0.5em",
          color: "#888",
          marginBottom: 2,
        }}>
          PICK {step + 1} OF {total}
        </div>
        <div style={{
          fontSize: "clamp(16px, 2vw, 24px)",
          letterSpacing: "0.25em",
          color,
          textShadow: `0 0 12px ${color}`,
        }}>
          PLAYER {player} — SELECT
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
