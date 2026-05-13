import { useState } from "react";

function getArtType(src) {
  if (!src) return "none";
  const pathname = src.split("?")[0].split("#")[0];
  const ext = pathname.split(".").pop().toLowerCase();
  if (ext === "mov" || ext === "webm" || ext === "mp4") return "video";
  if (ext === "gif") return "gif";
  return "image";
}

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

export default function CharArtPlaceholder({ char, size = 320, flipped = false, artSrc = null }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const resolvedArtSrc = typeof (artSrc || char.artSrc) === "string" && (artSrc || char.artSrc).trim()
    ? (artSrc || char.artSrc).trim()
    : null;
  const fallbackIconSrc = typeof char.iconSrc === "string" && char.iconSrc.trim() ? char.iconSrc.trim() : null;
  const artType = getArtType(resolvedArtSrc);
  const failed = failedSrc === resolvedArtSrc;
  const safeArtSrc = getCaptureSafeSrc(resolvedArtSrc);
  const safeFallbackIconSrc = getCaptureSafeSrc(fallbackIconSrc);
  const webmArtSrc = resolvedArtSrc ? getCaptureSafeSrc(resolvedArtSrc.replace(/\.(mp4|mov)(?=($|[?#]))/i, ".webm")) : null;

  const sharedStyle = {
    width: "100%",
    height: "100%",
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    objectPosition: "center bottom",
    display: "block",
  };

  return (
    <div
      style={{
        width: size,
        height: size * 1.35,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingBottom: 16,
        transform: flipped ? "scaleX(-1)" : "none",
        position: "relative",
      }}
    >
      {!failed && resolvedArtSrc ? (
        artType === "video" ? (
          <video
            key={resolvedArtSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            crossOrigin="anonymous"
            poster={safeFallbackIconSrc || undefined}
            onError={() => setFailedSrc(resolvedArtSrc)}
            style={sharedStyle}
          >
            <source src={webmArtSrc} type="video/webm" />
            <source src={safeArtSrc} type="video/mp4; codecs=hvc1" />
            {safeFallbackIconSrc ? <img src={safeFallbackIconSrc} alt={char.name} /> : null}
          </video>
        ) : artType === "gif" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={resolvedArtSrc}
            src={safeArtSrc}
            alt={char.name}
            crossOrigin="anonymous"
            onError={() => setFailedSrc(resolvedArtSrc)}
            style={sharedStyle}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={resolvedArtSrc}
            src={safeArtSrc}
            alt={char.name}
            crossOrigin="anonymous"
            onError={() => setFailedSrc(resolvedArtSrc)}
            style={sharedStyle}
          />
        )
      ) : (
        <div style={{ fontSize: size * 0.55, lineHeight: 1 }}>{char.element}</div>
      )}
    </div>
  );
}
