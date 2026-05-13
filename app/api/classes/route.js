import { NextResponse } from "next/server";
import { mapMongoDocument } from "@/lib/classes";
import { ensureGeneralClass } from "@/lib/general-class";
import { isTeacherRequest } from "@/lib/auth";

async function enrichClasses(classes) {
  return classes.map((classDocument) => ({
    ...mapMongoDocument(classDocument),
    memberCount: Array.isArray(classDocument.members) ? classDocument.members.length : 0,
  }));
}

export async function GET() {
  try {
    const isAdmin = await isTeacherRequest();
    if (!isAdmin) {
      return NextResponse.json({ classes: [] });
    }

    const generalClass = await ensureGeneralClass();

    return NextResponse.json({ classes: await enrichClasses([generalClass]) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load classes." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const isAdmin = await isTeacherRequest();
    if (!isAdmin) {
      return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
    }

    await request.json().catch(() => null);
    return NextResponse.json(
      { error: "Class creation is disabled. The site uses one general class for everyone." },
      { status: 403 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create class." },
      { status: 500 }
    );
  }
}
