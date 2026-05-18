import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * LevelBackground
 *
 * Renders a level's bgSrc (video or image) as a full-bleed background.
 * Falls back to the level's CSS gradient `bg` if the file fails or isn't set.
 *
 * Props:
 *   level        - level object from LEVELS (needs .bgSrc, .bg, .color, .id)
 *   opacity      - overall opacity of the bg layer (default 1)
 *   overlay      - extra CSS string added on top (e.g. darken overlay)
 *   dimAmount    - 0-1, how much to darken the media (default 0.45)
 *   style        - extra inline styles for the wrapper div
 *   zIndex       - default 0
 */
function getCaptureSafeSrc(src) {
  if (!src || src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:")) {
    return src;
  }

  try {
    const url = new URL(src);
    if (typeof window !== "undefined" && url.origin === window.location.origin) {
      return src;
    }
    return `/api/media-proxy?url=${encodeURIComponent(src)}`;
  } catch {
    return src;
  }
}

export default function LevelBackground({
  level,
  opacity = 1,
  overlay = null,
  dimAmount = 0.5,
  style = {},
  zIndex = 0,
}) {
  const [mediafailed, setMediaFailed] = useState(false);

  if (!level) return null;

  const src = level.bgSrc ?? null;
  const safeSrc = getCaptureSafeSrc(src);
  const safeWebmSrc = src ? getCaptureSafeSrc(src.replace(/\.(mp4|mov)(?=($|[?#]))/i, ".webm")) : null;
  const isVideo = src && (
    src.endsWith(".mp4") || src.endsWith(".webm") ||
    src.endsWith(".mov") || src.endsWith(".ogg")
  );
  const isImage = src && !isVideo;
  const showMedia = src && !mediafailed;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={level.id}
        initial={{ opacity: 0 }}
        animate={{ opacity }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.55, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: 0,
          zIndex,
          overflow: "hidden",
          ...style,
        }}
      >
        {/* Media layer: video or image */}
        {showMedia ? (
          isVideo ? (
            <video
              key={src}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              crossOrigin="anonymous"
              onError={() => setMediaFailed(true)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center center",
              }}
            >
              {/* Try webm first (smaller/faster), then original */}
              <source src={safeWebmSrc} type="video/webm" />
              <source src={safeSrc} type={src.endsWith(".mov") ? "video/mp4; codecs=hvc1" : "video/mp4"} />
            </video>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={safeSrc}
              alt=""
              crossOrigin="anonymous"
              onError={() => setMediaFailed(true)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center center",
              }}
            />
          )
        ) : (
          /* ── CSS gradient fallback ── */
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: level.bg ?? "#070810",
            }}
          />
        )}

        {/* Dim overlay, always applied over media */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `rgba(0,0,0,${dimAmount})`,
            pointerEvents: "none",
          }}
        />

        {/* Color tint from the level's theme color */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse 80% 50% at 50% 100%, ${level.color}18, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        {/* Optional extra overlay, e.g. gradient mask */}
        {overlay && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: overlay,
              pointerEvents: "none",
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
