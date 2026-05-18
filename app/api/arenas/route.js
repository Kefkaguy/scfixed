import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getUsersCollection } from "@/lib/mongodb";
import { uploadFileToS3 } from "@/lib/s3";
import { auth, isTeacherRequest } from "@/lib/auth";
import { normalizeText } from "@/lib/classes";
import { ensureGeneralClass, listPlayableGeneralSubmissions } from "@/lib/general-class";
import { addArenaToUser, listArenasForClass, mapArenaDocument, normalizeDifficulty } from "@/lib/arenas";

async function getActiveClass() {
  return ensureGeneralClass();
}

async function resolveUploadClass({ activeClass }) {
  return activeClass;
}

export async function GET() {
  try {
    const activeClass = await getActiveClass();
    const [arenas, playableStudentArenas] = await Promise.all([
      listArenasForClass(activeClass._id),
      listPlayableGeneralSubmissions("arena"),
    ]);
    return NextResponse.json({
      arenas: [...arenas, ...playableStudentArenas].map(mapArenaDocument),
      currentClass: activeClass,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load class arenas." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const isAdmin = await isTeacherRequest();
    const session = await auth();
    const formData = await request.formData();
    const requestedClassId = normalizeText(formData.get("classId"));
    const visibilityScope = isAdmin && formData.get("visibilityScope") === "all" ? "all" : "class";
    const activeClass = await resolveUploadClass({
      activeClass: await getActiveClass(),
      requestedClassId,
      session,
      isAdmin,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Login required before uploading arenas." }, { status: 401 });
    }

    if (!activeClass) {
      return NextResponse.json({ error: "Join or select a class before uploading arenas." }, { status: 403 });
    }

    if (activeClass.isLocked && !isAdmin) {
      return NextResponse.json(
        { error: "This class is locked. Students cannot upload arenas right now." },
        { status: 403 }
      );
    }

    if (!isAdmin) {
      const membership = Array.isArray(activeClass.members)
        ? activeClass.members.find((member) => member.userId === session.user.id)
        : null;

      if (!membership) {
        return NextResponse.json({ error: "You must join this class before uploading arenas." }, { status: 403 });
      }
    }

    const usersCollection = await getUsersCollection();
    const userDocument = await usersCollection.findOne(
      { _id: new ObjectId(session.user.id) },
      { projection: { customLevels: 1 } }
    );
    const existingArenas = Array.isArray(userDocument?.customLevels) ? userDocument.customLevels : [];
    const alreadyHasClassArena = existingArenas.some((arena) => arena?.classId === activeClass._id);

    if (!isAdmin && alreadyHasClassArena) {
      return NextResponse.json(
        { error: "You can only upload 1 arena per class." },
        { status: 409 }
      );
    }

    const name = normalizeText(formData.get("name")).toUpperCase();
    const icon = normalizeText(formData.get("icon"), "SWRD");
    const description = normalizeText(formData.get("description"));
    const difficulty = normalizeDifficulty(formData.get("difficulty"), 1);

    if (!name) {
      return NextResponse.json({ error: "Arena name is required." }, { status: 400 });
    }

    const bgFile = formData.get("bgFile");
    const existingBgSrc = normalizeText(formData.get("bgSrc")) || null;

    let bgUpload = existingBgSrc ? { url: existingBgSrc } : null;

    if (bgFile instanceof File && bgFile.size > 0) {
      bgUpload = await uploadFileToS3({
        file: bgFile,
        folder: "arena-backgrounds",
        namePrefix: name,
      });
    }

    if (!bgUpload?.url) {
      return NextResponse.json({ error: "Arena background is required." }, { status: 400 });
    }

    const now = new Date();
    const arena = {
      id: `arena_${crypto.randomUUID()}`,
      classId: activeClass._id,
      className: activeClass.name,
      visibilityScope,
      name,
      icon,
      description,
      difficulty,
      bgSrc: bgUpload.url,
      bgKey: bgUpload.key || null,
      createdAt: now,
      updatedAt: now,
      createdByRole: isAdmin ? session.user.role || "teacher" : "student",
      createdByUserId: session.user.id,
      createdByUserName: session.user.name || "",
    };

    await addArenaToUser(session.user.id, arena);

    return NextResponse.json({ arena: mapArenaDocument(arena) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create arena." },
      { status: 500 }
    );
  }
}
