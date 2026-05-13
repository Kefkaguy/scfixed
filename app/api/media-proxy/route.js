import { NextResponse } from "next/server";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUrl = searchParams.get("url");

    if (!rawUrl) {
      return NextResponse.json({ error: "Missing media URL." }, { status: 400 });
    }

    const mediaUrl = new URL(rawUrl);
    if (!ALLOWED_PROTOCOLS.has(mediaUrl.protocol)) {
      return NextResponse.json({ error: "Unsupported media URL." }, { status: 400 });
    }

    const response = await fetch(mediaUrl, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ error: "Media could not be loaded." }, { status: response.status });
    }

    const headers = new Headers();
    headers.set("Content-Type", response.headers.get("Content-Type") || "application/octet-stream");
    headers.set("Cache-Control", "public, max-age=300");
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(response.body, {
      status: 200,
      headers,
    });
  } catch {
    return NextResponse.json({ error: "Media could not be loaded." }, { status: 400 });
  }
}
