"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GIFEncoder, applyPalette, quantize } from "gifenc";
import { Alert, AppShell, Button, Field, Panel, SectionHeader, TopNav, inputClass } from "@/components/ui/AppUI";

const DEFAULT_SIZE = 512;
const GIF_FPS = 10;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isVideoFile(file) {
  return file?.type?.startsWith("video/");
}

function isImageFile(file) {
  return file?.type?.startsWith("image/");
}

function hexToRgb(hex) {
  const clean = String(hex || "#ffffff").replace("#", "");
  const value = Number.parseInt(clean.length === 3 ? clean.split("").map((char) => `${char}${char}`).join("") : clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function colorDistance(left, right) {
  return Math.hypot(left.r - right.r, left.g - right.g, left.b - right.b);
}

function encodeGif(frames, width, height, fallbackDelayMs) {
  const gif = GIFEncoder();
  frames.forEach((frame) => {
    const imageData = frame.imageData || frame;
    const palette = quantize(imageData.data, 256, {
      format: "rgba4444",
      oneBitAlpha: 127,
      clearAlpha: true,
      clearAlphaThreshold: 127,
      clearAlphaColor: 0x00,
    });
    const transparentIndex = Math.max(0, palette.findIndex((color) => color[3] < 128));
    const index = applyPalette(imageData.data, palette, "rgba4444");
    gif.writeFrame(index, width, height, {
      palette,
      delay: frame.delayMs || fallbackDelayMs,
      transparent: true,
      transparentIndex,
      repeat: 0,
      dispose: 2,
    });
  });
  gif.finish();
  return new Blob([gif.bytes()], { type: "image/gif" });
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function seekMedia(media, time) {
  return new Promise((resolve) => {
    const done = () => {
      media.removeEventListener("seeked", done);
      resolve();
    };
    media.addEventListener("seeked", done, { once: true });
    media.currentTime = time;
  });
}

export default function GifEditor() {
  const canvasRef = useRef(null);
  const mediaRef = useRef(null);
  const dragRef = useRef(null);
  const cropRef = useRef({ x: 64, y: 64, width: 384, height: 384 });
  const gifFramesRef = useRef([]);
  const animationStartRef = useRef(Date.now());
  const [file, setFile] = useState(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [gifFrameCount, setGifFrameCount] = useState(0);
  const [outputUrl, setOutputUrl] = useState("");
  const [outputName, setOutputName] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [tool, setTool] = useState("crop");
  const [crop, setCrop] = useState({ x: 64, y: 64, width: 384, height: 384 });
  const [backgroundRemoval, setBackgroundRemoval] = useState({
    enabled: false,
    color: "#ffffff",
    tolerance: 42,
  });
  const [settings, setSettings] = useState({
    width: DEFAULT_SIZE,
    height: DEFAULT_SIZE,
    zoom: 1.2,
    x: 0,
    y: 0,
    background: "#000000",
  });

  const sourceKind = useMemo(() => {
    if (!file) return "none";
    if (file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif")) return "gif";
    if (isVideoFile(file)) return "video";
    if (isImageFile(file)) return "image";
    return "unsupported";
  }, [file]);

  useEffect(() => {
    if (!file) {
      setSourceUrl("");
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setSourceUrl(nextUrl);
    setOutputUrl("");
    setOutputName("");
    setCrop({ x: 64, y: 64, width: 384, height: 384 });
    gifFramesRef.current.forEach((frame) => frame.image?.close?.());
    gifFramesRef.current = [];
    setGifFrameCount(0);
    animationStartRef.current = Date.now();
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  useEffect(() => {
    let cancelled = false;
    async function decodeGif() {
      if (!file || sourceKind !== "gif") return;
      if (!("ImageDecoder" in window)) {
        setStatus("This browser is showing the GIF preview as a still image. Export will use the visible frame.");
        return;
      }
      try {
        const bytes = await file.arrayBuffer();
        const decoder = new ImageDecoder({ data: bytes, type: "image/gif" });
        await decoder.tracks.ready;
        const frameCount = decoder.tracks.selectedTrack?.frameCount || 1;
        const frames = [];
        for (let index = 0; index < frameCount; index += 1) {
          const { image } = await decoder.decode({ frameIndex: index });
          frames.push({ image, duration: Math.max(20, Math.round((image.duration || 100000) / 1000)) });
        }
        if (!cancelled) {
          gifFramesRef.current.forEach((frame) => frame.image?.close?.());
          gifFramesRef.current = frames;
          setGifFrameCount(frames.length);
          animationStartRef.current = Date.now();
        } else {
          frames.forEach((frame) => frame.image?.close?.());
        }
      } catch (decodeError) {
        if (!cancelled) setError(decodeError.message || "Could not decode this GIF.");
      }
    }
    decodeGif();
    return () => {
      cancelled = true;
    };
  }, [file, sourceKind]);

  useEffect(() => {
    cropRef.current = crop;
  }, [crop]);

  useEffect(() => {
    let raf = 0;
    function draw() {
      const canvas = canvasRef.current;
      const media = mediaRef.current;
      if (!canvas || !media) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const ctx = canvas.getContext("2d");
      const width = Number(settings.width) || DEFAULT_SIZE;
      const height = Number(settings.height) || DEFAULT_SIZE;
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      ctx.clearRect(0, 0, width, height);

      const source = sourceKind === "gif" && gifFramesRef.current.length ? currentGifFrame()?.image : media;
      if (source) {
        renderSource(ctx, source, width, height, true);
      }

      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, [backgroundRemoval, settings, sourceKind, sourceUrl, gifFrameCount, tool]);

  function currentGifFrame() {
    const frames = gifFramesRef.current;
    if (!frames.length) return null;
    const total = frames.reduce((sum, frame) => sum + frame.duration, 0) || 100;
    let elapsed = (Date.now() - animationStartRef.current) % total;
    return frames.find((frame) => {
      elapsed -= frame.duration;
      return elapsed <= 0;
    }) || frames[0];
  }

  function sourceSize(source) {
    return {
      width: source.videoWidth || source.naturalWidth || source.displayWidth || source.width || DEFAULT_SIZE,
      height: source.videoHeight || source.naturalHeight || source.displayHeight || source.height || DEFAULT_SIZE,
    };
  }

  function renderSource(ctx, source, width, height, includeOverlay) {
    const size = sourceSize(source);
    if (!size.width || !size.height) return;
    const coverScale = Math.max(width / size.width, height / size.height) * Number(settings.zoom || 1);
    const drawWidth = size.width * coverScale;
    const drawHeight = size.height * coverScale;
    const drawX = (width - drawWidth) / 2 + Number(settings.x || 0);
    const drawY = (height - drawHeight) / 2 + Number(settings.y || 0);
    try {
      ctx.drawImage(source, drawX, drawY, drawWidth, drawHeight);
      applyBackgroundRemoval(ctx, width, height);
      if (includeOverlay) drawCropOverlay(ctx, width, height);
    } catch {
      // Media can be briefly unavailable while a video seeks or an image decodes.
    }
  }

  function applyBackgroundRemoval(ctx, width, height) {
    const keyedColor = hexToRgb(backgroundRemoval.color);
    if (backgroundRemoval.enabled) {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      for (let offset = 0; offset < data.length; offset += 4) {
        if (colorDistance({ r: data[offset], g: data[offset + 1], b: data[offset + 2] }, keyedColor) <= Number(backgroundRemoval.tolerance || 0)) {
          data[offset + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }
  }

  function drawCropOverlay(ctx, width, height) {
    if (tool !== "crop") return;
    const activeCrop = normalizeCrop(cropRef.current, width, height);
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.48)";
    ctx.fillRect(0, 0, width, activeCrop.y);
    ctx.fillRect(0, activeCrop.y + activeCrop.height, width, height - activeCrop.y - activeCrop.height);
    ctx.fillRect(0, activeCrop.y, activeCrop.x, activeCrop.height);
    ctx.fillRect(activeCrop.x + activeCrop.width, activeCrop.y, width - activeCrop.x - activeCrop.width, activeCrop.height);
    ctx.strokeStyle = "#f0c020";
    ctx.lineWidth = Math.max(2, width / 256);
    ctx.strokeRect(activeCrop.x, activeCrop.y, activeCrop.width, activeCrop.height);
    const handleSize = Math.max(12, width / 32);
    [[activeCrop.x, activeCrop.y], [activeCrop.x + activeCrop.width, activeCrop.y], [activeCrop.x, activeCrop.y + activeCrop.height], [activeCrop.x + activeCrop.width, activeCrop.y + activeCrop.height]].forEach(([x, y]) => {
      ctx.fillStyle = "#f0c020";
      ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    });
    ctx.restore();
  }

  function normalizeCrop(nextCrop, width, height) {
    const minSize = 32;
    const nextWidth = clamp(nextCrop.width, minSize, width);
    const nextHeight = clamp(nextCrop.height, minSize, height);
    return {
      x: clamp(nextCrop.x, 0, width - nextWidth),
      y: clamp(nextCrop.y, 0, height - nextHeight),
      width: nextWidth,
      height: nextHeight,
    };
  }

  function updateSettings(patch) {
    setSettings((current) => ({ ...current, ...patch }));
  }

  function canvasPoint(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function hitCropHandle(point, activeCrop) {
    const handleSize = Math.max(18, (canvasRef.current?.width || DEFAULT_SIZE) / 24);
    const handles = [
      ["nw", activeCrop.x, activeCrop.y],
      ["ne", activeCrop.x + activeCrop.width, activeCrop.y],
      ["sw", activeCrop.x, activeCrop.y + activeCrop.height],
      ["se", activeCrop.x + activeCrop.width, activeCrop.y + activeCrop.height],
    ];
    const handle = handles.find(([, x, y]) => Math.abs(point.x - x) <= handleSize && Math.abs(point.y - y) <= handleSize);
    if (handle) return handle[0];
    if (point.x >= activeCrop.x && point.x <= activeCrop.x + activeCrop.width && point.y >= activeCrop.y && point.y <= activeCrop.y + activeCrop.height) {
      return "move";
    }
    return "draw";
  }

  function handlePointerDown(event) {
    if (tool !== "crop") return;
    const canvas = canvasRef.current;
    const point = canvasPoint(event);
    const activeCrop = normalizeCrop(cropRef.current, canvas.width, canvas.height);
    dragRef.current = {
      mode: hitCropHandle(point, activeCrop),
      start: point,
      initial: activeCrop,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!dragRef.current) return;
    const canvas = canvasRef.current;
    const point = canvasPoint(event);
    const { mode, start, initial } = dragRef.current;
    const dx = point.x - start.x;
    const dy = point.y - start.y;
    let nextCrop = initial;

    if (mode === "move") {
      nextCrop = { ...initial, x: initial.x + dx, y: initial.y + dy };
    } else if (mode === "draw") {
      nextCrop = {
        x: Math.min(start.x, point.x),
        y: Math.min(start.y, point.y),
        width: Math.abs(dx),
        height: Math.abs(dy),
      };
    } else {
      const left = mode.includes("w") ? initial.x + dx : initial.x;
      const top = mode.includes("n") ? initial.y + dy : initial.y;
      const right = mode.includes("e") ? initial.x + initial.width + dx : initial.x + initial.width;
      const bottom = mode.includes("s") ? initial.y + initial.height + dy : initial.y + initial.height;
      nextCrop = {
        x: Math.min(left, right),
        y: Math.min(top, bottom),
        width: Math.abs(right - left),
        height: Math.abs(bottom - top),
      };
    }

    setCrop(normalizeCrop(nextCrop, canvas.width, canvas.height));
  }

  function handlePointerUp(event) {
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  function resetCrop() {
    const canvas = canvasRef.current;
    const width = canvas?.width || DEFAULT_SIZE;
    const height = canvas?.height || DEFAULT_SIZE;
    const size = Math.min(width, height) * 0.75;
    setCrop({ x: (width - size) / 2, y: (height - size) / 2, width: size, height: size });
  }

  function getExportImageDataFromCanvas(sourceCanvas) {
    const canvas = canvasRef.current;
    const activeCrop = normalizeCrop(cropRef.current, canvas.width, canvas.height);
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = Number(settings.width) || DEFAULT_SIZE;
    outputCanvas.height = Number(settings.height) || DEFAULT_SIZE;
    const outputCtx = outputCanvas.getContext("2d", { willReadFrequently: true });
    outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
    outputCtx.drawImage(
      sourceCanvas,
      activeCrop.x,
      activeCrop.y,
      activeCrop.width,
      activeCrop.height,
      0,
      0,
      outputCanvas.width,
      outputCanvas.height
    );
    return outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
  }

  function renderExportImageData(source) {
    const width = Number(settings.width) || DEFAULT_SIZE;
    const height = Number(settings.height) || DEFAULT_SIZE;
    const cleanCanvas = document.createElement("canvas");
    cleanCanvas.width = width;
    cleanCanvas.height = height;
    const cleanCtx = cleanCanvas.getContext("2d", { willReadFrequently: true });
    cleanCtx.clearRect(0, 0, width, height);
    renderSource(cleanCtx, source, width, height, false);
    return getExportImageDataFromCanvas(cleanCanvas);
  }

  async function exportPng() {
    const canvas = canvasRef.current;
    if (!canvas || !file) return;
    const source = sourceKind === "gif" && gifFramesRef.current.length ? currentGifFrame()?.image : mediaRef.current;
    const imageData = renderExportImageData(source || canvas);
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = imageData.width;
    outputCanvas.height = imageData.height;
    outputCanvas.getContext("2d").putImageData(imageData, 0, 0);
    const blob = await new Promise((resolve) => outputCanvas.toBlob(resolve, "image/png"));
    if (!blob) {
      setError("Could not export this frame.");
      return;
    }
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(URL.createObjectURL(blob));
    setOutputName(`${file.name.replace(/\.[^.]+$/, "") || "edited"}-frame.png`);
    setStatus("PNG frame exported.");
  }

  async function exportGif() {
    const canvas = canvasRef.current;
    const media = mediaRef.current;
    if (!canvas || !file) {
      setError("Choose a source file first.");
      return;
    }

    setError("");
    setStatus("");
    setIsRecording(true);
    try {
      const duration = sourceKind === "video" && media?.duration && Number.isFinite(media.duration)
        ? clamp(media.duration, 1, 12)
        : 1;
      const frameCount = Math.max(1, Math.round(duration * GIF_FPS));
      const fallbackDelayMs = Math.round(1000 / GIF_FPS);
      const frames = [];

      if (sourceKind === "gif" && gifFramesRef.current.length) {
        gifFramesRef.current.forEach((frame) => {
          frames.push({
            imageData: renderExportImageData(frame.image),
            delayMs: frame.duration,
          });
        });
      } else if (sourceKind === "video" && media) {
        media.pause();
        for (let frame = 0; frame < frameCount; frame += 1) {
          await seekMedia(media, Math.min(frame / GIF_FPS, Math.max(0, media.duration - 0.05)));
          await wait(25);
          frames.push({ imageData: renderExportImageData(media), delayMs: fallbackDelayMs });
        }
      } else {
        frames.push({ imageData: renderExportImageData(media || canvas), delayMs: fallbackDelayMs });
      }

      const blob = encodeGif(frames, Number(settings.width) || DEFAULT_SIZE, Number(settings.height) || DEFAULT_SIZE, fallbackDelayMs);
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      setOutputUrl(URL.createObjectURL(blob));
      setOutputName(`${file.name.replace(/\.[^.]+$/, "") || "edited"}-edited.gif`);
      setStatus("GIF exported with transparent cut areas.");
    } catch (exportError) {
      setError(exportError.message || "Could not export GIF.");
    } finally {
      setIsRecording(false);
    }
  }

  return (
    <AppShell>
      <TopNav />
      <div className="grid gap-5">
        <Panel className="p-5 sm:p-7">
          <SectionHeader
            label="GIF Editor"
            title="Cut, Remove Background, Export GIF"
            action={<Button href="/" tone="neutral">Home</Button>}
          >
            Upload media, drag the crop box like Photoshop, remove a selected background color, and export an animated GIF.
          </SectionHeader>
        </Panel>

        {error ? <Alert tone="red">{error}</Alert> : null}
        {status ? <Alert tone="gold">{status}</Alert> : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.2fr)]">
          <Panel className="p-5">
            <div className="grid gap-4">
              <Field label="Source file">
                <input
                  type="file"
                  accept="image/gif,image/*,video/*"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  className={inputClass}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Output width">
                  <input type="number" min="128" max="1600" value={settings.width} onChange={(event) => updateSettings({ width: clamp(Number(event.target.value) || DEFAULT_SIZE, 128, 1600) })} className={inputClass} />
                </Field>
                <Field label="Output height">
                  <input type="number" min="128" max="1600" value={settings.height} onChange={(event) => updateSettings({ height: clamp(Number(event.target.value) || DEFAULT_SIZE, 128, 1600) })} className={inputClass} />
                </Field>
              </div>

              <Field label={`Make bigger ${Number(settings.zoom).toFixed(2)}x`}>
                <input type="range" min="0.5" max="4" step="0.05" value={settings.zoom} onChange={(event) => updateSettings({ zoom: Number(event.target.value) })} className="h-12 w-full accent-[var(--gold)]" />
              </Field>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button tone={tool === "crop" ? "gold" : "neutral"} onClick={() => setTool("crop")}>Crop tool</Button>
                <Button tone="neutral" onClick={resetCrop}>Reset crop</Button>
              </div>
              <Field label={`Cut left / right ${settings.x}px`}>
                <input type="range" min="-600" max="600" step="1" value={settings.x} onChange={(event) => updateSettings({ x: Number(event.target.value) })} className="h-12 w-full accent-[var(--gold)]" />
              </Field>
              <Field label={`Cut up / down ${settings.y}px`}>
                <input type="range" min="-600" max="600" step="1" value={settings.y} onChange={(event) => updateSettings({ y: Number(event.target.value) })} className="h-12 w-full accent-[var(--gold)]" />
              </Field>

              <div className="grid gap-3">
                <Field label="Remove color">
                  <input type="color" value={backgroundRemoval.color} onChange={(event) => setBackgroundRemoval((current) => ({ ...current, color: event.target.value }))} className={`${inputClass} h-12 p-1`} />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
                <Button tone={backgroundRemoval.enabled ? "red" : "neutral"} onClick={() => setBackgroundRemoval((current) => ({ ...current, enabled: !current.enabled }))}>
                  {backgroundRemoval.enabled ? "Color remove on" : "Color remove off"}
                </Button>
                <Field label={`Tolerance ${backgroundRemoval.tolerance}`}>
                  <input type="range" min="0" max="180" step="1" value={backgroundRemoval.tolerance} onChange={(event) => setBackgroundRemoval((current) => ({ ...current, tolerance: Number(event.target.value) }))} className="h-12 w-full accent-[var(--gold)]" />
                </Field>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button tone="blue" onClick={exportPng} disabled={!file}>Export PNG</Button>
                <Button tone="gold" onClick={exportGif} disabled={!file || isRecording}>{isRecording ? "Exporting" : "Export GIF"}</Button>
              </div>

              {outputUrl ? (
                <Panel className="p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted-8)]">Edited output</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href={outputUrl} download={outputName} className="inline-flex min-h-10 items-center justify-center rounded-md border border-[color:var(--success-52)] bg-[rgba(103,224,143,0.12)] px-4 py-2 text-center text-xs font-black uppercase tracking-[0.2em] text-[var(--color-success)]">
                      Download file
                    </a>
                  </div>
                </Panel>
              ) : null}
            </div>
          </Panel>

          <Panel className="grid min-h-[520px] place-items-center overflow-hidden p-4">
            <div className="grid w-full gap-4">
              <div className="grid place-items-center rounded-lg border border-[color:var(--color-surface-border-4)] bg-black/45 p-4">
                <canvas
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="max-h-[68vh] max-w-full cursor-crosshair rounded-md border border-[color:var(--gold-35)] bg-[conic-gradient(#222_25%,#111_0_50%,#222_0_75%,#111_0)] bg-[length:24px_24px]"
                />
              </div>
              {!file ? (
                <p className="text-center text-sm leading-6 text-[var(--color-text-muted)]">Choose a GIF, image, or video to start editing.</p>
              ) : sourceKind === "unsupported" ? (
                <p className="text-center text-sm leading-6 text-[var(--color-danger)]">This file type is not supported.</p>
              ) : null}
            </div>
          </Panel>
        </div>
      </div>

      {sourceUrl && sourceKind === "video" ? (
        <video ref={mediaRef} src={sourceUrl} muted playsInline loop autoPlay className="hidden" />
      ) : null}
      {sourceUrl && (sourceKind === "image" || sourceKind === "gif") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={mediaRef} src={sourceUrl} alt="" className="hidden" />
      ) : null}
    </AppShell>
  );
}
