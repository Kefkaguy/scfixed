import { NextResponse } from "next/server";
import { getPublicGallery } from "@/lib/public-gallery";

export async function GET() {
  try {
    const gallery = await getPublicGallery();
    return NextResponse.json(gallery);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load public gallery." },
      { status: 500 }
    );
  }
}
