import CharArtPlaceholder from "./CharArtPlaceholder";

export default function CharArtStack({ chars, flipped = false, baseSize = 320 }) {
  if (!chars || chars.length === 0) return null;
  if (chars.length === 1) {
    return <CharArtPlaceholder char={chars[0]} size={baseSize} flipped={flipped} />;
  }

  const frontChar  = chars[0];
  const backChar   = chars[1];
  const backSize   = baseSize * 0.90;
  // Tight container — back char peeks from outer edge, front char from inner edge
  // They overlap slightly like MK style
  const containerW = baseSize * 3;
  const backOffsetY = -baseSize * 0.5;

  return (
    <div style={{ position: "relative", width: containerW, height: baseSize * 1.15 }}>
      {/* Back char — outer edge, slightly up, dimmed */}
      <div style={{
        position: "absolute", bottom: 0,
        left: flipped ? "auto" : 0,
        right: flipped ? 0 : "auto",
        transform: `translateY(${backOffsetY}px)`,
        opacity: 0.88,
        zIndex: 1,
        filter: "brightness(0.72)",
      }}>
        <CharArtPlaceholder char={backChar} size={backSize} flipped={flipped} />
      </div>
      {/* Front char — inner edge (toward center), full size */}
      <div style={{
        position: "absolute", bottom: 0,
        right: flipped ? "auto" : -baseSize * 0.18,
        left: flipped ? -baseSize * 0.18 : "auto",
        zIndex: 2,
      }}>
        <CharArtPlaceholder char={frontChar} size={baseSize} flipped={flipped} />
      </div>
    </div>
  );
}
