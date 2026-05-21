import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { toCanvas } from "html-to-image";
import CharArtPlaceholder from "./CharArtPlaceholder";
import LevelBackground from "./levels/levelbackground";

const P1_COLOR = "#e8001a";
const P2_COLOR = "#0077ff";
const GOLD = "#f0c020";
const MOVE_STEP = 12;
const P1_MIN_X = -120;
const P1_MAX_X = 200;
const P2_MIN_X = -200;
const P2_MAX_X = 120;
const SCREENSHOT_SCALE_LIMIT = 2;
const FIGHTER_LANE_RATIO = 0.38;
const FIGHTER_LANE_PADDING_RATIO = 0.02;

const DEFAULT_FILTERS = {
  hue: 0,
  warmth: 0,
  saturation: 100,
  brightness: 100,
  contrast: 100,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getInitialSceneSize() {
  if (typeof window === "undefined") {
    return { width: 1920, height: 1080 };
  }

  return {
    width: Math.round(window.innerWidth),
    height: Math.round(window.innerHeight),
  };
}

function buildFilterStyle(filters) {
  const warmthSepia = Math.max(filters.warmth, 0) * 0.35;
  const warmthHue = filters.warmth < 0 ? filters.warmth * 0.45 : 0;
  return [
    `hue-rotate(${filters.hue + warmthHue}deg)`,
    `saturate(${filters.saturation}%)`,
    `brightness(${filters.brightness}%)`,
    `contrast(${filters.contrast}%)`,
    `sepia(${warmthSepia}%)`,
  ].join(" ");
}

async function createScreenshotBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/png", 1);
  });
}

function getHtmlToImageOptions(sceneElement, layerName = null) {
  const sceneBounds = sceneElement.getBoundingClientRect();
  const width = Math.round(sceneBounds.width);
  const height = Math.round(sceneBounds.height);
  const backgroundColor = layerName && layerName !== "background" ? "transparent" : "#07080f";

  return {
    width,
    height,
    pixelRatio: Math.min(window.devicePixelRatio || 1, SCREENSHOT_SCALE_LIMIT),
    backgroundColor,
    cacheBust: true,
    includeQueryParams: true,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      minWidth: `${width}px`,
      minHeight: `${height}px`,
      maxWidth: `${width}px`,
      maxHeight: `${height}px`,
      position: "relative",
      inset: "auto",
      overflow: "hidden",
      background: backgroundColor,
      transform: "none",
    },
    filter: (node) => {
      if (!node || node.nodeType !== 1) return true;
      if (node.dataset?.screenshotUi === "true") return false;
      if (!layerName) return true;
      const screenshotLayer = node.dataset?.screenshotLayer;
      return !screenshotLayer || screenshotLayer === layerName;
    },
  };
}

function getScreenshotIgnoredElement(element) {
  return element?.dataset?.screenshotUi === "true";
}

function waitForImage(image) {
  if (!image || image.complete) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", resolve, { once: true });
  });
}

function waitForVideo(video) {
  if (!video || video.readyState >= 2) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(resolve, 1400);
    const settle = () => {
      window.clearTimeout(timeoutId);
      resolve();
    };
    video.addEventListener("loadeddata", settle, { once: true });
    video.addEventListener("canplay", settle, { once: true });
    video.addEventListener("error", settle, { once: true });
  });
}

async function waitForSceneMedia(sceneElement) {
  const media = [
    ...Array.from(sceneElement.querySelectorAll("img")).map(waitForImage),
    ...Array.from(sceneElement.querySelectorAll("video")).map(waitForVideo),
  ];

  await Promise.all(media);
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
}

async function captureSceneCanvas(sceneElement, layerName = null) {
  await waitForSceneMedia(sceneElement);

  try {
    return await toCanvas(sceneElement, getHtmlToImageOptions(sceneElement, layerName));
  } catch (htmlToImageError) {
    if (layerName) {
      throw htmlToImageError;
    }

    console.warn("[FightBanner] html-to-image failed, trying html2canvas fallback", htmlToImageError);
    const html2canvas = (await import("html2canvas")).default;
    return html2canvas(sceneElement, {
      backgroundColor: "#07080f",
      scale: Math.min(window.devicePixelRatio || 1, SCREENSHOT_SCALE_LIMIT),
      useCORS: true,
      allowTaint: true,
      imageTimeout: 3500,
      ignoreElements: getScreenshotIgnoredElement,
      windowWidth: Math.round(sceneElement.getBoundingClientRect().width),
      windowHeight: Math.round(sceneElement.getBoundingClientRect().height),
    });
  }
}

function createCompositeCanvas(width, height, layers) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;

  layers.forEach((layer) => {
    context.drawImage(layer, 0, 0, width, height);
  });
  return canvas;
}

function FilterPanel({ title, accent, values, onChange, onReset, side = "left", isOpen, onToggle }) {
  const controls = [
    { key: "hue", label: "Hue", min: -180, max: 180 },
    { key: "warmth", label: "Temp", min: -100, max: 100 },
    { key: "saturation", label: "Sat", min: 0, max: 220 },
    { key: "brightness", label: "Light", min: 40, max: 180 },
    { key: "contrast", label: "Contrast", min: 40, max: 180 },
  ];

  return (
    <div
      data-screenshot-ui="true"
      style={{
        position: "absolute",
        top: 86,
        [side]: 20,
        zIndex: 30,
        width: 220,
        display: "flex",
        flexDirection: "column",
        alignItems: side === "left" ? "flex-start" : "flex-end",
        gap: 8,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          padding: "8px 12px",
          border: `1px solid ${accent}55`,
          background: "rgba(6,8,15,0.88)",
          color: accent,
          fontFamily: "var(--font-display)",
          fontSize: 9,
          letterSpacing: "0.24em",
          cursor: "pointer",
          boxShadow: `0 10px 24px ${accent}1a`,
        }}
      >
        {title} {isOpen ? "OPEN" : "CLOSED"}
      </button>

      {isOpen ? (
        <div
          style={{
            width: "100%",
            padding: 14,
            border: `1px solid ${accent}55`,
            background: "rgba(6,8,15,0.92)",
            boxShadow: `0 18px 40px ${accent}22`,
            backdropFilter: "blur(4px)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ color: accent, fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.28em" }}>
              LIVE FILTERS
            </div>
            <button
              type="button"
              onClick={onReset}
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "#c9cfdb",
                padding: "4px 8px",
                fontFamily: "var(--font-display)",
                fontSize: 8,
                letterSpacing: "0.18em",
                cursor: "pointer",
              }}
            >
              RESET
            </button>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {controls.map((control) => (
              <label key={control.key} style={{ display: "grid", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, color: "#9aa2b7", fontFamily: "var(--font-display)", fontSize: 8, letterSpacing: "0.18em" }}>
                  <span>{control.label}</span>
                  <span>{values[control.key]}</span>
                </div>
                <input
                  type="range"
                  min={control.min}
                  max={control.max}
                  value={values[control.key]}
                  onChange={(event) => onChange(control.key, Number(event.target.value))}
                  style={{ accentColor: accent }}
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FightCharStack({
  chars,
  flipped,
  size,
  leadArtSrc = null,
  offsetX = 0,
  rotated = false,
  frontFilter = "",
  backFilter = "",
}) {
  if (!chars || chars.length === 0) return null;

  if (chars.length === 1) {
    return (
      <motion.div
        animate={{ x: offsetX, rotateY: rotated ? 180 : 0 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformStyle: "preserve-3d", filter: frontFilter || undefined }}
      >
        <CharArtPlaceholder char={chars[0]} size={size} flipped={flipped} artSrc={leadArtSrc} />
      </motion.div>
    );
  }

  const frontChar = chars[0];
  const backChar = chars[1];
  const backSize = size * 0.9;
  const containerW = size * 2.2;
  const backOffsetY = -size * 0.45;
  const backOffsetX = size * 0.1;
  const frontOffsetX = size * 0.08;

  return (
    <motion.div
      animate={{ x: offsetX, rotateY: rotated ? 180 : 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: "relative", width: containerW, height: size * 1.15, transformStyle: "preserve-3d" }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: flipped ? "auto" : 0,
          right: flipped ? 0 : "auto",
          transform: `translate(${flipped ? backOffsetX : -backOffsetX}px, ${backOffsetY}px)`,
          opacity: 0.88,
          zIndex: 1,
          filter: backFilter || "brightness(0.72)",
        }}
      >
        <CharArtPlaceholder char={backChar} size={backSize} flipped={flipped} />
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: flipped ? "auto" : -frontOffsetX,
          left: flipped ? -frontOffsetX : "auto",
          zIndex: 2,
          filter: frontFilter || undefined,
        }}
      >
        <CharArtPlaceholder char={frontChar} size={size} flipped={flipped} artSrc={leadArtSrc} />
      </div>
    </motion.div>
  );
}

function normalizeAssetUrl(value) {
  return String(value || "").split("?")[0].split("#")[0];
}

function isArenaBackgroundAsset(value, level) {
  const normalizedValue = normalizeAssetUrl(value);
  if (!normalizedValue) {
    return false;
  }

  return (
    normalizedValue === normalizeAssetUrl(level?.bgSrc) ||
    normalizedValue.includes("/arena-backgrounds/") ||
    normalizedValue.includes("arena-backgrounds%2f")
  );
}

function getDirectionalArtSrc(char, direction, level, { flipped = false, rotated = false } = {}) {
  if (!char || direction === 0) return char?.artSrc || null;
  const isMirrored = Boolean(flipped) !== Boolean(rotated);
  const visualDirection = isMirrored ? -direction : direction;
  const movementArtSrc = visualDirection < 0 ? char.moveLeftArtSrc : char.moveRightArtSrc;
  if (!movementArtSrc || isArenaBackgroundAsset(movementArtSrc, level)) {
    return char.artSrc || null;
  }
  return movementArtSrc;
}

function getEntranceQuote(characters) {
  const quote = characters.find((character) => typeof character?.entranceQuote === "string" && character.entranceQuote.trim())?.entranceQuote;
  return quote ? quote.trim() : "";
}

function getFightSceneFileName(p1Char, p2Char) {
  const sanitizeName = (value, fallback) => {
    const normalized = String(value || fallback)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return normalized || fallback;
  };

  return `${sanitizeName(p1Char?.name, "player1")}-vs-${sanitizeName(p2Char?.name, "player2")}-fightscene.psd`;
}

export default function FightBanner({
  p1Chars,
  p2Chars,
  p1Rotated = false,
  p2Rotated = false,
  onRematch,
  level,
  isTeacherView = false,
}) {
  const p1CharList = p1Chars.map((pk) => pk.character);
  const p2CharList = p2Chars.map((pk) => pk.character);
  const [positions, setPositions] = useState({ p1: 0, p2: 0 });
  const [pressedKeys, setPressedKeys] = useState({
    p1Left: false,
    p1Right: false,
    p2Left: false,
    p2Right: false,
  });
  const [filters, setFilters] = useState({
    p1: DEFAULT_FILTERS,
    p2: DEFAULT_FILTERS,
  });
  const [openPanel, setOpenPanel] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotStatus, setScreenshotStatus] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isExportingPhotoshop, setIsExportingPhotoshop] = useState(false);
  const [sceneSize, setSceneSize] = useState(getInitialSceneSize);
  const sceneRef = useRef(null);

  const fighterLaneWidth = Math.round(sceneSize.width * FIGHTER_LANE_RATIO);
  const fighterLanePadding = Math.round(sceneSize.width * FIGHTER_LANE_PADDING_RATIO);
  const isCompactScene = sceneSize.width < 760;
  const isNarrowScene = sceneSize.width < 520;
  const fightSize = isCompactScene
    ? Math.min(Math.max(sceneSize.width * 0.34, 120), 230)
    : Math.min(sceneSize.width * 0.4, 520);

  const movement = useMemo(() => ({
    p1: (pressedKeys.p1Right ? 1 : 0) - (pressedKeys.p1Left ? 1 : 0),
    p2: (pressedKeys.p2Right ? 1 : 0) - (pressedKeys.p2Left ? 1 : 0),
  }), [pressedKeys]);

  useEffect(() => {
    function updateSceneSize() {
      const sceneBounds = sceneRef.current?.getBoundingClientRect();
      setSceneSize({
        width: Math.round(sceneBounds?.width || window.innerWidth),
        height: Math.round(sceneBounds?.height || window.innerHeight),
      });
    }

    updateSceneSize();

    const resizeObserver = typeof ResizeObserver !== "undefined" && sceneRef.current
      ? new ResizeObserver(updateSceneSize)
      : null;
    if (resizeObserver && sceneRef.current) {
      resizeObserver.observe(sceneRef.current);
    }

    window.addEventListener("resize", updateSceneSize);
    window.visualViewport?.addEventListener("resize", updateSceneSize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateSceneSize);
      window.visualViewport?.removeEventListener("resize", updateSceneSize);
    };
  }, []);

  useEffect(() => {
    function resolveControl(event) {
      const code = event.code || "";
      const key = event.key || "";
      if (code === "KeyA" || key === "a" || key === "A") return "p1Left";
      if (code === "KeyD" || key === "d" || key === "D") return "p1Right";
      if (code === "ArrowLeft" || key === "ArrowLeft") return "p2Left";
      if (code === "ArrowRight" || key === "ArrowRight") return "p2Right";
      return null;
    }

    function updateKeyState(control, isPressed) {
      if (control === "p1Left") {
        setPressedKeys((previous) => ({ ...previous, p1Left: isPressed }));
      } else if (control === "p1Right") {
        setPressedKeys((previous) => ({ ...previous, p1Right: isPressed }));
      } else if (control === "p2Left") {
        setPressedKeys((previous) => ({ ...previous, p2Left: isPressed }));
      } else if (control === "p2Right") {
        setPressedKeys((previous) => ({ ...previous, p2Right: isPressed }));
      }
    }

    function handleKeyDown(event) {
      const control = resolveControl(event);
      if (control) {
        event.preventDefault();
        updateKeyState(control, true);
      }
    }

    function handleKeyUp(event) {
      const control = resolveControl(event);
      if (control) {
        event.preventDefault();
        updateKeyState(control, false);
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (movement.p1 === 0 && movement.p2 === 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setPositions((previous) => ({
        p1: clamp(previous.p1 + movement.p1 * MOVE_STEP, P1_MIN_X, P1_MAX_X),
        p2: clamp(previous.p2 + movement.p2 * MOVE_STEP, P2_MIN_X, P2_MAX_X),
      }));
    }, 16);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [movement]);

  useEffect(() => {
    return () => {
      if (screenshot?.url) URL.revokeObjectURL(screenshot.url);
    };
  }, [screenshot?.url]);

  const p1LeadChar = p1CharList[0] || null;
  const p2LeadChar = p2CharList[0] || null;
  const p1EntranceQuote = getEntranceQuote(p1CharList);
  const p2EntranceQuote = getEntranceQuote(p2CharList);
  const p1ArtSrc = getDirectionalArtSrc(p1LeadChar, movement.p1, level, { flipped: false, rotated: p1Rotated });
  const p2ArtSrc = getDirectionalArtSrc(p2LeadChar, movement.p2, level, { flipped: true, rotated: p2Rotated });
  const p1FrontFilter = buildFilterStyle(filters.p1);
  const p2FrontFilter = buildFilterStyle(filters.p2);
  const p1BackFilter = `brightness(0.72) ${buildFilterStyle(filters.p1)}`;
  const p2BackFilter = `brightness(0.72) ${buildFilterStyle(filters.p2)}`;

  function updateFilter(player, key, value) {
    setFilters((previous) => ({
      ...previous,
      [player]: {
        ...previous[player],
        [key]: value,
      },
    }));
  }

  function resetFilters(player) {
    setFilters((previous) => ({
      ...previous,
      [player]: DEFAULT_FILTERS,
    }));
  }

  async function handleScreenshot() {
    if (!sceneRef.current || isCapturing) return;

    setIsCapturing(true);
    setScreenshotStatus("");

    try {
      const canvas = await captureSceneCanvas(sceneRef.current);
      const blob = await createScreenshotBlob(canvas);

      if (!blob) {
        throw new Error("The screenshot could not be created.");
      }

      const url = URL.createObjectURL(blob);
      setScreenshot((previous) => {
        if (previous?.url) URL.revokeObjectURL(previous.url);
        return { blob, url, width: canvas.width, height: canvas.height };
      });
      setScreenshotStatus("");
    } catch (error) {
      console.error("[FightBanner] Failed to capture screenshot", error);
      setScreenshotStatus("SCREENSHOT FAILED. TRY AGAIN AFTER MEDIA FINISHES LOADING.");
    } finally {
      setIsCapturing(false);
    }
  }

  async function handleExportPhotoshop() {
    if (!sceneRef.current || isExportingPhotoshop) return;

    setIsExportingPhotoshop(true);
    setScreenshotStatus("BUILDING PHOTOSHOP FILE...");

    try {
      await waitForSceneMedia(sceneRef.current);
      const backgroundCanvas = await toCanvas(sceneRef.current, getHtmlToImageOptions(sceneRef.current, "background"));
      const p2Canvas = await toCanvas(sceneRef.current, getHtmlToImageOptions(sceneRef.current, "p2"));
      const p1Canvas = await toCanvas(sceneRef.current, getHtmlToImageOptions(sceneRef.current, "p1"));
      const compositeCanvas = createCompositeCanvas(backgroundCanvas.width, backgroundCanvas.height, [
        backgroundCanvas,
        p2Canvas,
        p1Canvas,
      ]);

      if (!compositeCanvas) {
        throw new Error("The Photoshop export could not be created.");
      }

      const { writePsd } = await import("ag-psd");
      const psdBuffer = writePsd({
        width: backgroundCanvas.width,
        height: backgroundCanvas.height,
        canvas: compositeCanvas,
        children: [
          { name: "Layer 3 - Background", canvas: backgroundCanvas },
          { name: "Layer 2 - Player 2 chosen char", canvas: p2Canvas },
          { name: "Layer 1 - Player 1 chosen char", canvas: p1Canvas },
        ],
      });
      const blob = new Blob([psdBuffer], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getFightSceneFileName(p1LeadChar, p2LeadChar);
      link.click();
      URL.revokeObjectURL(url);
      setScreenshotStatus("PHOTOSHOP EXPORT STARTED.");
    } catch (error) {
      console.error("[FightBanner] Failed to export Photoshop file", error);
      setScreenshotStatus("PHOTOSHOP EXPORT FAILED. TRY AGAIN AFTER MEDIA FINISHES LOADING.");
    } finally {
      setIsExportingPhotoshop(false);
    }
  }

  async function handleCopyScreenshot() {
    if (!screenshot?.blob) return;

    try {
      if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
        throw new Error("Clipboard image copy is not supported in this browser.");
      }

      await navigator.clipboard.write([
        new ClipboardItem({ [screenshot.blob.type]: screenshot.blob }),
      ]);
      setScreenshotStatus("COPIED TO CLIPBOARD.");
    } catch (error) {
      console.error("[FightBanner] Failed to copy screenshot", error);
      setScreenshotStatus("COPY IS NOT AVAILABLE IN THIS BROWSER. DOWNLOAD INSTEAD.");
    }
  }

  function handleDownloadScreenshot() {
    if (!screenshot?.url) return;

    const link = document.createElement("a");
    link.href = screenshot.url;
    link.download = `fight-scene-${Date.now()}.png`;
    link.click();
    setScreenshotStatus("DOWNLOAD STARTED.");
  }

  function closeScreenshotPopup() {
    setScreenshot((previous) => {
      if (previous?.url) URL.revokeObjectURL(previous.url);
      return null;
    });
    setScreenshotStatus("");
  }

  return (
    <div ref={sceneRef} data-screenshot-scene="true" style={{ position: "fixed", inset: 0, zIndex: 200, overflow: "hidden", background: "#07080f" }}>
      {level && (
        <div data-screenshot-layer="background" style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <LevelBackground
            level={level}
            dimAmount={0.55}
            zIndex={0}
          />
        </div>
      )}

      <div
        data-screenshot-ui="true"
        style={{
          position: "absolute",
          top: isCompactScene ? 12 : 24,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isCompactScene ? 6 : 10,
        }}
      >
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRematch}
          style={{
            padding: isCompactScene ? "9px 24px" : "12px 56px",
            border: `1px solid ${GOLD}`,
            color: GOLD,
            fontFamily: "var(--font-display)",
            fontSize: isCompactScene ? 11 : 16,
            letterSpacing: isCompactScene ? "0.18em" : "0.35em",
            cursor: "pointer",
            background: "rgba(240,192,32,0.07)",
          }}
        >
          REMATCH
        </motion.button>

        <div
          style={{
            display: "flex",
            gap: isCompactScene ? 8 : 18,
            flexWrap: "wrap",
            justifyContent: "center",
            color: "rgba(255,255,255,0.58)",
            fontFamily: "var(--font-display)",
            fontSize: isCompactScene ? 7 : 10,
            letterSpacing: isCompactScene ? "0.1em" : "0.24em",
          }}
        >
          <span>A / D MOVE 1P</span>
          <span>ARROWS MOVE 2P</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleScreenshot}
        disabled={isCapturing}
        data-screenshot-ui="true"
        style={{
          position: "absolute",
          top: isCompactScene ? 12 : 24,
          right: isCompactScene ? 10 : 24,
          zIndex: 40,
          padding: isCompactScene ? "8px 9px" : "10px 14px",
          border: `1px solid ${GOLD}99`,
          background: isCapturing ? "rgba(240,192,32,0.05)" : "rgba(6,8,15,0.84)",
          color: isCapturing ? "rgba(240,192,32,0.48)" : GOLD,
          fontFamily: "var(--font-display)",
          fontSize: isCompactScene ? 8 : 10,
          letterSpacing: isCompactScene ? "0.1em" : "0.24em",
          cursor: isCapturing ? "default" : "pointer",
          boxShadow: "0 14px 32px rgba(0,0,0,0.28)",
          backdropFilter: "blur(4px)",
        }}
      >
        {isCapturing ? "CAPTURING..." : "SCREENSHOT"}
      </button>

      {isTeacherView ? (
        <>
          <FilterPanel
            title="1P FILTERS"
            accent={P1_COLOR}
            values={filters.p1}
            onChange={(key, value) => updateFilter("p1", key, value)}
            onReset={() => resetFilters("p1")}
            side="left"
            isOpen={openPanel === "p1"}
            onToggle={() => setOpenPanel((previous) => previous === "p1" ? null : "p1")}
          />
          <FilterPanel
            title="2P FILTERS"
            accent={P2_COLOR}
            values={filters.p2}
            onChange={(key, value) => updateFilter("p2", key, value)}
            onReset={() => resetFilters("p2")}
            side="right"
            isOpen={openPanel === "p2"}
            onToggle={() => setOpenPanel((previous) => previous === "p2" ? null : "p2")}
          />
        </>
      ) : null}

      {p1CharList.length > 0 && (
        <motion.div
          data-screenshot-layer="p1"
          initial={{ x: -160, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: isCompactScene ? "50%" : fighterLaneWidth,
            height: "100%",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            paddingRight: isCompactScene ? 4 : fighterLanePadding,
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          <FightCharStack
            chars={p1CharList}
            flipped={false}
            size={fightSize}
            leadArtSrc={p1ArtSrc}
            offsetX={positions.p1}
            rotated={p1Rotated}
            frontFilter={p1FrontFilter}
            backFilter={p1BackFilter}
          />
        </motion.div>
      )}

      {p2CharList.length > 0 && (
        <motion.div
          data-screenshot-layer="p2"
          initial={{ x: 160, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: isCompactScene ? "50%" : fighterLaneWidth,
            height: "100%",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-start",
            paddingLeft: isCompactScene ? 4 : fighterLanePadding,
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          <FightCharStack
            chars={p2CharList}
            flipped={true}
            size={fightSize}
            leadArtSrc={p2ArtSrc}
            offsetX={positions.p2}
            rotated={p2Rotated}
            frontFilter={p2FrontFilter}
            backFilter={p2BackFilter}
          />
        </motion.div>
      )}

      <motion.div
        data-screenshot-ui="true"
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ delay: 0.3, duration: 2.4, times: [0, 0.12, 0.75, 1] }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, pointerEvents: "none", position: "absolute", inset: 0 }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isNarrowScene ? "1fr" : "1fr auto 1fr",
            gap: isNarrowScene ? 6 : 0,
            alignItems: "center",
            width: isNarrowScene ? "min(360px, 92vw)" : "min(900px, 80vw)",
          }}
        >
          <motion.div
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            style={{ textAlign: isNarrowScene ? "center" : "right", justifySelf: isNarrowScene ? "center" : "end" }}
          >
            {p1Chars.map((pk) => (
              <div key={pk.character.id} style={{ fontFamily: "var(--font-name)", fontSize: "clamp(16px, 2.2vw, 32px)", color: pk.character.color || P1_COLOR, letterSpacing: "0.06em", textShadow: "3px 3px 0 rgba(0,0,0,0.8)" }}>
                {pk.character.name}
              </div>
            ))}
            {p1EntranceQuote ? (
              <div style={{ marginTop: 8, maxWidth: 280, marginLeft: isNarrowScene ? 0 : "auto", color: "rgba(255,255,255,0.78)", fontFamily: "var(--font-display)", fontSize: "clamp(10px, 1vw, 13px)", letterSpacing: "0.06em", lineHeight: 1.7 }}>
                &quot;{p1EntranceQuote}&quot;
              </div>
            ) : null}
          </motion.div>

          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.05, type: "spring", stiffness: 300, damping: 18 }}
            style={{ fontFamily: "var(--font-name)", fontSize: "clamp(40px, 7.5vw, 96px)", background: `linear-gradient(90deg, ${P1_COLOR}, #fff, ${P2_COLOR})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "0.05em", lineHeight: 1, padding: "0 6px" }}
          >
            VS
          </motion.div>

          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            style={{ textAlign: isNarrowScene ? "center" : "left", justifySelf: isNarrowScene ? "center" : "start" }}
          >
            {p2Chars.map((pk) => (
              <div key={pk.character.id} style={{ fontFamily: "var(--font-name)", fontSize: "clamp(16px, 2.2vw, 32px)", color: pk.character.color || P2_COLOR, letterSpacing: "0.06em", textShadow: "3px 3px 0 rgba(0,0,0,0.8)" }}>
                {pk.character.name}
              </div>
            ))}
            {p2EntranceQuote ? (
              <div style={{ marginTop: 8, maxWidth: 280, color: "rgba(255,255,255,0.78)", fontFamily: "var(--font-display)", fontSize: "clamp(10px, 1vw, 13px)", letterSpacing: "0.06em", lineHeight: 1.7 }}>
                &quot;{p2EntranceQuote}&quot;
              </div>
            ) : null}
          </motion.div>
        </div>

        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: [0, 1, 1, 1, 0], opacity: [0, 1, 1, 1, 0] }}
          transition={{ delay: 0.3, duration: 2.4, times: [0, 0.12, 0.5, 0.75, 1], ease: "easeInOut" }}
          style={{ fontFamily: "var(--font-name)", fontSize: "clamp(44px, 9.5vw, 120px)", background: `linear-gradient(90deg, ${P1_COLOR}, #ff8800, #fff, #ffcc00, ${P2_COLOR})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: isNarrowScene ? "0.04em" : "0.1em", lineHeight: 1, transformOrigin: "center" }}
        >
          FIGHT!
        </motion.div>
      </motion.div>

      {(screenshot || screenshotStatus) && (
        <div
          data-screenshot-ui="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "rgba(0,0,0,0.62)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            style={{
              width: "min(680px, 92vw)",
              border: "1px solid rgba(240,192,32,0.44)",
              background: "rgba(6,8,15,0.96)",
              boxShadow: "0 28px 90px rgba(0,0,0,0.55)",
              padding: 18,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ color: GOLD, fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: "0.28em" }}>
                {screenshot?.url ? "SCREENSHOT READY" : "SCREENSHOT STATUS"}
              </div>
              <button
                type="button"
                onClick={closeScreenshotPopup}
                style={{
                  width: 34,
                  height: 34,
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: "#cfd6e6",
                  background: "rgba(255,255,255,0.04)",
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  cursor: "pointer",
                }}
                aria-label="Close screenshot popup"
              >
                X
              </button>
            </div>

            {screenshot?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={screenshot.url}
                alt="Captured fight scene"
                style={{
                  width: "100%",
                  height: "auto",
                  maxHeight: "70vh",
                  objectFit: "contain",
                  background: "#05070d",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "block",
                }}
              />
            ) : null}

            <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleCopyScreenshot}
                disabled={!screenshot?.blob}
                style={{
                  padding: "10px 18px",
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.04)",
                  color: screenshot?.blob ? "#cfd6e6" : "rgba(255,255,255,0.28)",
                  fontFamily: "var(--font-display)",
                  fontSize: 10,
                  letterSpacing: "0.24em",
                  cursor: screenshot?.blob ? "pointer" : "default",
                }}
              >
                COPY
              </button>
              <button
                type="button"
                onClick={handleDownloadScreenshot}
                disabled={!screenshot?.url}
                style={{
                  padding: "10px 18px",
                  border: `1px solid ${GOLD}88`,
                  background: "rgba(240,192,32,0.08)",
                  color: screenshot?.url ? GOLD : "rgba(240,192,32,0.38)",
                  fontFamily: "var(--font-display)",
                  fontSize: 10,
                  letterSpacing: "0.24em",
                  cursor: screenshot?.url ? "pointer" : "default",
                }}
              >
                DOWNLOAD
              </button>
              <button
                type="button"
                onClick={handleExportPhotoshop}
                disabled={isExportingPhotoshop}
                style={{
                  padding: "10px 18px",
                  border: "1px solid rgba(0,119,255,0.72)",
                  background: "rgba(0,119,255,0.08)",
                  color: isExportingPhotoshop ? "rgba(122,179,255,0.42)" : "#7ab3ff",
                  fontFamily: "var(--font-display)",
                  fontSize: 10,
                  letterSpacing: "0.24em",
                  cursor: isExportingPhotoshop ? "default" : "pointer",
                }}
              >
                {isExportingPhotoshop ? "EXPORTING..." : "PHOTOSHOP"}
              </button>
            </div>

            {screenshotStatus ? (
              <div style={{ marginTop: 12, textAlign: "center", color: "#cfd6e6", fontFamily: "var(--font-display)", fontSize: 9, letterSpacing: "0.18em" }}>
                {screenshotStatus}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
