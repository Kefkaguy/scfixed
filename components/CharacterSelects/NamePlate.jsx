import { AnimatePresence, motion } from "framer-motion";
const P1_COLOR = "#e8001a";
const P2_COLOR = "#0077ff";
export default function NamePlate({ char, player, side, visible }) {
  const color = char?.color || (player === 1 ? P1_COLOR : P2_COLOR);
  const isLeft = side === "left";

  return (
    <AnimatePresence mode="wait">
      {visible && char && (
        <motion.div
          key={char.id}
          initial={{ x: isLeft ? -60 : 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: isLeft ? -40 : 40, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "var(--font-name)",
            fontSize: "clamp(28px, 4vw, 56px)",
            letterSpacing: "0.04em",
            color,
            textShadow: "3px 3px 0 rgba(0,0,0,0.8)",
            whiteSpace: "nowrap",
            textAlign: isLeft ? "left" : "right",
            lineHeight: 1,
          }}
          className="name-flicker"
        >
          {char.name}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
