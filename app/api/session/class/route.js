import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getClassesCollection, getUsersCollection } from "@/lib/mongodb";
import { buildClassQuery, mapMongoDocument, normalizeText } from "@/lib/classes";
import { auth, isTeacherRequest } from "@/lib/auth";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const isAdmin = await isTeacherRequest();
    if (!isAdmin) {
      return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
    }

    const payload = await request.json();
    const classId = normalizeText(payload?.classId);
    if (!classId) {
      return NextResponse.json({ error: "Class id is required." }, { status: 400 });
    }

    const classesCollection = await getClassesCollection();
    const classDocument = await classesCollection.findOne(buildClassQuery(classId));

    if (!classDocument) {
      return NextResponse.json({ error: "Class not found." }, { status: 404 });
    }

    const usersCollection = await getUsersCollection();
    await usersCollection.updateOne(
      { _id: new ObjectId(session.user.id) },
      { $set: { activeClassId: String(classDocument._id), updatedAt: new Date() } }
    );

    return NextResponse.json({ ok: true, currentClass: mapMongoDocument(classDocument) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set active class." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const session = await auth();
  if (session?.user?.id && ObjectId.isValid(session.user.id)) {
    const usersCollection = await getUsersCollection();
    await usersCollection.updateOne(
      { _id: new ObjectId(session.user.id) },
      { $unset: { activeClassId: "" }, $set: { updatedAt: new Date() } }
    );
  }
  return NextResponse.json({ ok: true });
}
