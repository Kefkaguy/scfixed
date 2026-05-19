import { NextResponse } from "next/server";
import { createPresignedS3Upload } from "@/lib/s3";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_FOLDERS = new Set(["character-icons", "character-art", "arena-backgrounds"]);

function normalizeText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const fileName = normalizeText(payload?.fileName, "file.bin");
    const contentType = normalizeText(payload?.contentType, "application/octet-stream");
    const folder = normalizeText(payload?.folder, "uploads");
    const namePrefix = normalizeText(payload?.namePrefix, "file");
    const size = Number(payload?.size || 0);

    if (!ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json({ error: "Choose a valid upload folder." }, { status: 400 });
    }
    if (!size || size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Files must be 15 MB or smaller." }, { status: 413 });
    }
    if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
      return NextResponse.json({ error: "Only image and video uploads are supported." }, { status: 400 });
    }

    const upload = await createPresignedS3Upload({ fileName, contentType, folder, namePrefix });
    return NextResponse.json({ upload });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to prepare upload." },
      { status: 500 }
    );
  }
}
