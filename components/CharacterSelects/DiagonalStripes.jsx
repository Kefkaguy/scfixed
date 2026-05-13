import { useState } from "react";
export default function DiagonalStripes({ color, opacity = 0.08 }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `repeating-linear-gradient(
          -55deg,
          transparent,
          transparent 28px,
          ${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")} 28px,
          ${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")} 30px
        )`,
        pointerEvents: "none",
      }}
    />
  );
}
