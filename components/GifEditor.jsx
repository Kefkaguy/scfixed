"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GIFEncoder, applyPalette, quantize } from "gifenc";
import { Alert, AppShell, Button, Field, Panel, SectionHeader, TopNav, inputClass } from "@/components/ui/AppUI";

const DEFAULT_SIZE = 512;
const GIF_FPS = 10;
const GIF_EDITOR_CONTEXT_PREFIX = "digital-art-battle:gif-editor:";
const GIF_TRANSPARENT_ALPHA = 127;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isVideoFile(file) {
  return file?.type?.startsWith("video/");
}

function isImageFile(file) {
  return file?.type?.startsWith("image/");
}

function proxiedMediaUrl(src) {
  if (!src) return "";
  if (/^https?:\/\//i.test(src)) {
    return `/api/media-proxy?url=${encodeURIComponent(src)}`;
  }
  return src;
}

function extensionFromContentType(contentType) {
  const type = String(contentType || "").split(";")[0].trim().toLowerCase();
  if (type === "image/png") return "png";
  if (type === "image/jpeg") return "jpg";
  if (type === "image/gif") return "gif";
  if (type === "image/webp") return "webp";
  if (type === "video/webm") return "webm";
  if (type === "video/mp4") return "mp4";
  if (type === "video/quicktime") return "mov";
  return "";
}

function extensionFromUrl(src, contentType) {
  const fromType = extensionFromContentType(contentType);
  if (fromType) return fromType;

  try {
    const path = new URL(src, window.location.origin).pathname;
    const match = path.match(/\.([a-z0-9]{2,5})$/i);
    return match ? match[1].toLowerCase() : "gif";
  } catch {
    return "gif";
  }
}

function sanitizeFileName(value, fallback = "fighter") {
  return String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || fallback;
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

function prepareGifImageData(imageData) {
  const prepared = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  const data = prepared.data;
  let hasTransparency = false;
  let opaquePixelCount = 0;

  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] <= GIF_TRANSPARENT_ALPHA) {
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 0;
      hasTransparency = true;
    } else {
      data[offset + 3] = 255;
      opaquePixelCount += 1;
    }
  }

  return { imageData: prepared, hasTransparency, opaquePixelCount };
}

function opaquePixels(imageData, opaquePixelCount) {
  const source = imageData.data;
  const output = new Uint8ClampedArray(opaquePixelCount * 4);
  let targetOffset = 0;

  for (let offset = 0; offset < source.length; offset += 4) {
    if (source[offset + 3] > GIF_TRANSPARENT_ALPHA) {
      output[targetOffset] = source[offset];
      output[targetOffset + 1] = source[offset + 1];
      output[targetOffset + 2] = source[offset + 2];
      output[targetOffset + 3] = 255;
      targetOffset += 4;
    }
  }

  return output;
}

function encodeGif(frames, width, height, fallbackDelayMs) {
  const gif = GIFEncoder();
  frames.forEach((frame) => {
    const { imageData, hasTransparency, opaquePixelCount } = prepareGifImageData(frame.imageData || frame);
    let palette;
    let index;
    let transparentIndex = -1;

    if (hasTransparency) {
      transparentIndex = 0;
      if (opaquePixelCount > 0) {
        const visiblePalette = quantize(opaquePixels(imageData, opaquePixelCount), 255, { format: "rgb565" });
        const visibleIndex = applyPalette(imageData.data, visiblePalette, "rgb565");
        palette = [[0, 0, 0], ...visiblePalette];
        index = new Uint8Array(visibleIndex.length);

        for (let pixel = 0; pixel < visibleIndex.length; pixel += 1) {
          index[pixel] = imageData.data[pixel * 4 + 3] <= GIF_TRANSPARENT_ALPHA ? transparentIndex : visibleIndex[pixel] + 1;
        }
      } else {
        palette = [[0, 0, 0], [255, 255, 255]];
        index = new Uint8Array(imageData.width * imageData.height);
      }
    } else {
      palette = quantize(imageData.data, 256, { format: "rgb565" });
      index = applyPalette(imageData.data, palette, "rgb565");
    }

    gif.writeFrame(index, imageData.width || width, imageData.height || height, {
      palette,
      delay: frame.delayMs || fallbackDelayMs,
      transparent: transparentIndex >= 0,
      transparentIndex,
      repeat: 0,
      dispose: transparentIndex >= 0 ? 2 : -1,
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
  const searchParams = useSearchParams();
  const canvasRef = useRef(null);
  const mediaRef = useRef(null);
  const dragRef = useRef(null);
  const cropRef = useRef({ x: 64, y: 64, width: 384, height: 384 });
  const gifFramesRef = useRef([]);
  const animationStartRef = useRef(0);
  const [file, setFile] = useState(null);
  const [editContext, setEditContext] = useState(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [gifFrameCount, setGifFrameCount] = useState(0);
  const [outputUrl, setOutputUrl] = useState("");
  const [outputName, setOutputName] = useState("");
  const [outputBlob, setOutputBlob] = useState(null);
  const [outputKind, setOutputKind] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isUpdatingSource, setIsUpdatingSource] = useState(false);
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
    zoom: 1,
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
    let cancelled = false;
    async function loadEditContext() {
      const editKey = searchParams.get("editKey");
      if (!editKey) return;

      const rawContext = window.sessionStorage.getItem(`${GIF_EDITOR_CONTEXT_PREFIX}${editKey}`);
      if (!rawContext) {
        setError("Could not find the selected showcase GIF. Go back to Showcase and choose Edit GIF again.");
        return;
      }

      try {
        const parsedContext = JSON.parse(rawContext);
        const src = parsedContext?.sourceSrc;
        if (!src) throw new Error("The selected fighter does not have a GIF/video source.");

        setEditContext(parsedContext);
        setStatus(`Loading ${parsedContext?.sourceLabel || "selected fighter"} into the editor.`);

        const response = await fetch(proxiedMediaUrl(src), { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load the selected GIF/video.");

        const contentType = response.headers.get("Content-Type") || "image/gif";
        const extension = extensionFromUrl(src, contentType);
        const blob = await response.blob();
        const loadedFile = new File(
          [blob],
          `${sanitizeFileName(parsedContext?.sourceLabel, "fighter")}.${extension}`,
          { type: contentType || blob.type || "image/gif" }
        );

        if (!cancelled) {
          setFile(loadedFile);
          setStatus(`${parsedContext?.sourceLabel || "Selected fighter"} is ready to edit.`);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || "Could not load the selected GIF.");
      }
    }

    loadEditContext();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    if (!file) {
      setSourceUrl("");
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setSourceUrl(nextUrl);
    setOutputUrl("");
    setOutputName("");
    setOutputBlob(null);
    setOutputKind("");
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

  function currentGifFrame(now) {
    const frames = gifFramesRef.current;
    if (!frames.length) return null;
    if (!animationStartRef.current) animationStartRef.current = now;
    const total = frames.reduce((sum, frame) => sum + frame.duration, 0) || 100;
    let elapsed = (now - animationStartRef.current) % total;
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
    const containScale = Math.min(width / size.width, height / size.height) * Number(settings.zoom || 1);
    const drawWidth = size.width * containScale;
    const drawHeight = size.height * containScale;
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

      const source = sourceKind === "gif" && gifFramesRef.current.length ? currentGifFrame(Date.now())?.image : media;
      if (source) {
        renderSource(ctx, source, width, height, true);
      }

      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, [backgroundRemoval, settings, sourceKind, sourceUrl, gifFrameCount, tool]);

  function exportCropBox() {
    const canvas = canvasRef.current;
    const activeCrop = normalizeCrop(cropRef.current, canvas.width, canvas.height);
    const x = Math.round(activeCrop.x);
    const y = Math.round(activeCrop.y);
    return {
      x,
      y,
      width: Math.max(1, Math.min(canvas.width - x, Math.round(activeCrop.width))),
      height: Math.max(1, Math.min(canvas.height - y, Math.round(activeCrop.height))),
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
    const activeCrop = exportCropBox();
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = activeCrop.width;
    outputCanvas.height = activeCrop.height;
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

      const exportSize = frames[0]?.imageData
        ? { width: frames[0].imageData.width, height: frames[0].imageData.height }
        : exportCropBox();
      const blob = encodeGif(frames, exportSize.width, exportSize.height, fallbackDelayMs);
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      setOutputBlob(blob);
      setOutputKind("gif");
      setOutputUrl(URL.createObjectURL(blob));
      setOutputName(`${file.name.replace(/\.[^.]+$/, "") || "edited"}-edited.gif`);
      setStatus(`GIF exported at ${exportSize.width}x${exportSize.height}.`);
    } catch (exportError) {
      setError(exportError.message || "Could not export GIF.");
    } finally {
      setIsRecording(false);
    }
  }

  function appendCommonFighterFields(formData, item) {
    formData.set("name", item.name || "UNTITLED");
    formData.set("description", item.description || "No description added.");
    formData.set("color", item.color || "#e8001a");
    formData.set("accent", item.accent || item.color || "#e8001a");
    formData.set("element", item.element || "*");
    formData.set("bgTint", item.bgTint || item.color || "#e8001a");
    formData.set("lore", item.lore || "");
    formData.set("entranceQuote", item.entranceQuote || "");
    if (item.classId) formData.set("classId", item.classId);
    if (item.visibilityScope) formData.set("visibilityScope", item.visibilityScope);
    if (item.iconSrc) formData.set("iconSrc", item.iconSrc);
    if (item.artSrc) formData.set("artSrc", item.artSrc);
    if (item.moveLeftArtSrc) formData.set("moveLeftArtSrc", item.moveLeftArtSrc);
    if (item.moveRightArtSrc) formData.set("moveRightArtSrc", item.moveRightArtSrc);
  }

  async function updateSelectedGif() {
    const item = editContext?.item;
    if (!item) {
      setError("No showcase fighter is connected to this edit.");
      return;
    }
    if (!outputBlob || outputKind !== "gif") {
      setError("Export a GIF first, then update the selected fighter.");
      return;
    }

    setIsUpdatingSource(true);
    setError("");
    setStatus("");

    try {
      const formData = new FormData();
      const editedFile = new File([outputBlob], outputName || `${sanitizeFileName(item.name)}-edited.gif`, { type: outputBlob.type || "image/gif" });
      formData.set("artFile", editedFile);

      if (item.sourceKind === "submission") {
        formData.set("action", "edit");
        formData.set("name", item.name || "UNTITLED");
        formData.set("description", item.description || "No description added.");
        formData.set("period", item.period || "");
        formData.set("studentName", item.studentName || item.createdByUserName || "Student");
        formData.set("email", item.email || "");
        formData.set("color", item.color || "#e8001a");
        formData.set("lore", item.lore || "");
        formData.set("entranceQuote", item.entranceQuote || "");

        const response = await fetch(`/api/general-submissions/${encodeURIComponent(item.sourceId || item._id || item.id)}`, {
          method: "PATCH",
          body: formData,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not update the selected GIF.");
      } else {
        appendCommonFighterFields(formData, item);
        const response = await fetch(`/api/characters/${encodeURIComponent(item.sourceId || item.id || item._id)}`, {
          method: "PUT",
          body: formData,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not update the selected GIF.");
      }

      setStatus(`${item.name || "Selected fighter"} updated with the edited GIF.`);
    } catch (updateError) {
      setError(updateError.message || "Could not update the selected GIF.");
    } finally {
      setIsUpdatingSource(false);
    }
  }

  const currentExportCrop = normalizeCrop(crop, Number(settings.width) || DEFAULT_SIZE, Number(settings.height) || DEFAULT_SIZE);
  const currentExportSize = `${Math.round(currentExportCrop.width)}x${Math.round(currentExportCrop.height)}`;

  return (
    <AppShell>
      <TopNav />
      <div className="grid gap-5">
        <Panel className="p-5 sm:p-7">
          <SectionHeader
            label="GIF Editor"
            title={editContext?.sourceLabel ? `Editing ${editContext.sourceLabel}` : "Cut, Remove Background, Export GIF"}
            action={<Button href="/" tone="neutral">Home</Button>}
          >
            Upload media, drag the crop box like Photoshop, remove a selected background color, and export an animated GIF.
            {editContext ? " This editor is connected to a showcase fighter, so you can update it after exporting." : ""}
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
                <Button tone="gold" onClick={exportGif} disabled={!file || isRecording}>{isRecording ? "Exporting" : "Export GIF"}</Button>
                <span className="inline-flex min-h-10 items-center rounded-md border border-[color:var(--color-surface-border-5)] bg-[color:var(--color-surface-soft-3)] px-3 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  Export {currentExportSize}
                </span>
              </div>

              {outputUrl ? (
                <Panel className="p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted-8)]">Edited output</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href={outputUrl} download={outputName} className="inline-flex min-h-10 items-center justify-center rounded-md border border-[color:var(--success-52)] bg-[rgba(103,224,143,0.12)] px-4 py-2 text-center text-xs font-black uppercase tracking-[0.2em] text-[var(--color-success)]">
                      Download file
                    </a>
                    {editContext ? (
                      <Button tone="gold" disabled={isUpdatingSource || !outputBlob || outputKind !== "gif"} onClick={updateSelectedGif}>
                        {isUpdatingSource ? "Updating" : "Update selected GIF"}
                      </Button>
                    ) : null}
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
