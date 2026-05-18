import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getClassesCollection, getUsersCollection } from "@/lib/mongodb";
import { deleteFileFromS3, getS3KeyFromUrl, uploadFileToS3 } from "@/lib/s3";
import { auth, isTeacherRequest } from "@/lib/auth";
import { buildClassQuery, mapMongoDocument, normalizeText } from "@/lib/classes";
import { findArenaOwnerById, mapArenaDocument, normalizeDifficulty, removeUserArena, replaceUserArena } from "@/lib/arenas";

async function getClassLockState(classId) {
  if (!classId) {
    return false;
  }

  const classesCollection = await getClassesCollection();
  const classDocument = await classesCollection.findOne(buildClassQuery(classId), {
    projection: { isLocked: 1 },
  });
  return Boolean(classDocument?.isLocked);
}

async function resolveEditableClass({ requestedClassId, fallbackClassId, session, isAdmin }) {
  const classId = isAdmin && requestedClassId ? requestedClassId : fallbackClassId;
  if (!classId) {
    return null;
  }

  const classesCollection = await getClassesCollection();
  const classDocument = await classesCollection.findOne(buildClassQuery(classId));
  if (!classDocument) {
    return null;
  }

  if (!isAdmin) {
    return mapMongoDocument(classDocument);
  }

  const createdByUserId = classDocument.createdByUserId ? String(classDocument.createdByUserId) : "";
  const canUseClass =
    createdByUserId === session?.user?.id ||
    !createdByUserId;

  return canUseClass ? mapMongoDocument(classDocument) : null;
}

export async function PUT(request, { params }) {
  try {
    const isAdmin = await isTeacherRequest();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }
    let activeClassId = null;
    if (session?.user?.id && ObjectId.isValid(session.user.id)) {
      const usersCollection = await getUsersCollection();
      const userDocument = await usersCollection.findOne(
        { _id: new ObjectId(session.user.id) },
        { projection: { activeClassId: 1 } }
      );
      activeClassId = userDocument?.activeClassId || null;
    }

    const { id } = await params;
    const ownerRecord = await findArenaOwnerById(id);
    const existingArena = ownerRecord?.arena || null;

    if (!existingArena) {
      return NextResponse.json({ error: "Arena not found." }, { status: 404 });
    }

    const isOwner = existingArena.createdByUserId === session.user.id;
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "You can only edit your own arena." }, { status: 403 });
    }

    const isClassLocked = await getClassLockState(existingArena.classId);
    if (isClassLocked && !isAdmin) {
      return NextResponse.json(
        { error: "This class is locked. Students cannot edit arenas right now." },
        { status: 403 }
      );
    }

    if (!isAdmin && activeClassId && existingArena.classId !== activeClassId) {
      return NextResponse.json({ error: "Switch to that class before editing its arenas." }, { status: 403 });
    }

    const formData = await request.formData();
    const name = normalizeText(formData.get("name")).toUpperCase();
    const icon = normalizeText(formData.get("icon"), "SWRD");
    const description = normalizeText(formData.get("description"));
    const difficulty = normalizeDifficulty(formData.get("difficulty"), existingArena.difficulty || 1);
    const requestedClassId = normalizeText(formData.get("classId"));
    const visibilityScope = isAdmin && formData.get("visibilityScope") === "all" ? "all" : "class";

    if (!name) {
      return NextResponse.json({ error: "Arena name is required." }, { status: 400 });
    }

    const bgFile = formData.get("bgFile");
    const existingBgSrc = normalizeText(formData.get("bgSrc")) || null;
    let bgSrc = existingBgSrc;
    let bgKey = existingArena.bgKey || getS3KeyFromUrl(existingArena.bgSrc);
    const targetClass = await resolveEditableClass({
      requestedClassId,
      fallbackClassId: existingArena.classId,
      session,
      isAdmin,
    });
    if (!targetClass) {
      return NextResponse.json({ error: "Choose a valid class for this arena." }, { status: 403 });
    }

    if (bgFile instanceof File && bgFile.size > 0) {
      const bgUpload = await uploadFileToS3({
        file: bgFile,
        folder: "arena-backgrounds",
        namePrefix: name,
      });

      if (bgKey && bgKey !== bgUpload.key) {
        await deleteFileFromS3(bgKey);
      }

      bgSrc = bgUpload.url;
      bgKey = bgUpload.key;
    }

    const nextArena = {
      ...existingArena,
      name,
      icon,
      description,
      difficulty,
      classId: targetClass._id,
      className: targetClass.name,
      visibilityScope,
      bgSrc: bgSrc || null,
      bgKey: bgKey || null,
      updatedAt: new Date(),
    };

    const result = await replaceUserArena(String(ownerRecord.userDocument._id), existingArena.id, nextArena);
    if (!result) {
      return NextResponse.json({ error: "Arena not found." }, { status: 404 });
    }

    return NextResponse.json({ arena: mapArenaDocument(nextArena) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update arena." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    const isAdmin = await isTeacherRequest();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }
    let activeClassId = null;
    if (session?.user?.id && ObjectId.isValid(session.user.id)) {
      const usersCollection = await getUsersCollection();
      const userDocument = await usersCollection.findOne(
        { _id: new ObjectId(session.user.id) },
        { projection: { activeClassId: 1 } }
      );
      activeClassId = userDocument?.activeClassId || null;
    }

    const { id } = await params;
    const ownerRecord = await findArenaOwnerById(id);
    const arena = ownerRecord?.arena || null;

    if (!arena) {
      return NextResponse.json({ error: "Arena not found." }, { status: 404 });
    }

    const isOwner = arena.createdByUserId === session.user.id;
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "You can only delete your own arena." }, { status: 403 });
    }

    const isClassLocked = await getClassLockState(arena.classId);
    if (isClassLocked && !isAdmin) {
      return NextResponse.json(
        { error: "This class is locked. Students cannot delete arenas right now." },
        { status: 403 }
      );
    }

    if (!isAdmin && activeClassId && arena.classId !== activeClassId) {
      return NextResponse.json({ error: "Switch to that class before deleting its arenas." }, { status: 403 });
    }

    const bgKey = arena.bgKey || getS3KeyFromUrl(arena.bgSrc);
    if (bgKey) {
      await deleteFileFromS3(bgKey);
    }

    const result = await removeUserArena(String(ownerRecord.userDocument._id), arena.id);
    if (!result.modifiedCount) {
      return NextResponse.json({ error: "Arena not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete arena." },
      { status: 500 }
    );
  }
}
