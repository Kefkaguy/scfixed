import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getClassesCollection, getUsersCollection } from "@/lib/mongodb";
import { deleteFileFromS3, getS3KeyFromUrl, uploadFileToS3 } from "@/lib/s3";
import { auth, isTeacherRequest } from "@/lib/auth";
import { buildClassQuery, mapMongoDocument, normalizeText } from "@/lib/classes";
import { findUploadOwnerById, mapUploadDocument, removeUserUpload, replaceUserUpload } from "@/lib/uploads";

function normalizeColor(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

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
    const formData = await request.formData();
    const name = normalizeText(formData.get("name")).toUpperCase();
    const description = normalizeText(formData.get("description"));
    const lore = normalizeText(formData.get("lore"));
    const entranceQuote = normalizeText(formData.get("entranceQuote"));
    const color = normalizeColor(formData.get("color"), "#e8001a");
    const accent = normalizeColor(formData.get("accent"), "#ff6644");
    const element = normalizeText(formData.get("element"), "\uD83D\uDD25");
    const bgTint = normalizeColor(formData.get("bgTint"), "#2a0000");
    const requestedClassId = normalizeText(formData.get("classId"));
    const visibilityScope = isAdmin && formData.get("visibilityScope") === "all" ? "all" : "class";

    if (!name) {
      return NextResponse.json(
        { error: "Character name is required." },
        { status: 400 }
      );
    }

    const iconFile = formData.get("iconFile");
    const artFile = formData.get("artFile");
    const moveLeftArtFile = formData.get("moveLeftArtFile");
    const moveRightArtFile = formData.get("moveRightArtFile");
    const existingIconSrc = normalizeText(formData.get("iconSrc")) || null;
    const existingArtSrc = normalizeText(formData.get("artSrc")) || null;
    const existingMoveLeftArtSrc = normalizeText(formData.get("moveLeftArtSrc")) || null;
    const existingMoveRightArtSrc = normalizeText(formData.get("moveRightArtSrc")) || null;
    const clearMoveLeftArt = formData.get("clearMoveLeftArt") === "1";
    const clearMoveRightArt = formData.get("clearMoveRightArt") === "1";

    const ownerRecord = await findUploadOwnerById(id);
    const existingCharacter = ownerRecord?.upload || null;

    if (!existingCharacter) {
      return NextResponse.json(
        { error: "Character not found." },
        { status: 404 }
      );
    }

    const isOwner = existingCharacter.createdByUserId === session.user.id;
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "You can only edit your own GIF fighter." }, { status: 403 });
    }

    const isClassLocked = await getClassLockState(existingCharacter.classId);
    if (isClassLocked && !isAdmin) {
      return NextResponse.json(
        { error: "This class is locked. Students cannot edit GIF fighters right now." },
        { status: 403 }
      );
    }

    if (!isAdmin && activeClassId && existingCharacter.classId !== activeClassId) {
      return NextResponse.json({ error: "Switch to that class before editing its GIFs." }, { status: 403 });
    }

    const targetClass = await resolveEditableClass({
      requestedClassId,
      fallbackClassId: existingCharacter.classId,
      session,
      isAdmin,
    });
    if (!targetClass) {
      return NextResponse.json({ error: "Choose a valid class for this GIF fighter." }, { status: 403 });
    }

    let iconSrc = existingIconSrc;
    let artSrc = existingArtSrc;
    let moveLeftArtSrc = existingMoveLeftArtSrc;
    let moveRightArtSrc = existingMoveRightArtSrc;
    let iconKey = existingCharacter.iconKey || getS3KeyFromUrl(existingCharacter.iconSrc);
    let artKey = existingCharacter.artKey || getS3KeyFromUrl(existingCharacter.artSrc);
    let moveLeftArtKey = existingCharacter.moveLeftArtKey || getS3KeyFromUrl(existingCharacter.moveLeftArtSrc);
    let moveRightArtKey = existingCharacter.moveRightArtKey || getS3KeyFromUrl(existingCharacter.moveRightArtSrc);

    if (iconFile instanceof File && iconFile.size > 0) {
      const iconUpload = await uploadFileToS3({
        file: iconFile,
        folder: "character-icons",
        namePrefix: name,
      });
      if (iconKey && iconKey !== iconUpload.key) {
        await deleteFileFromS3(iconKey);
      }
      iconSrc = iconUpload.url;
      iconKey = iconUpload.key;
    }

    if (artFile instanceof File && artFile.size > 0) {
      const artUpload = await uploadFileToS3({
        file: artFile,
        folder: "character-art",
        namePrefix: name,
      });
      if (artKey && artKey !== artUpload.key) {
        await deleteFileFromS3(artKey);
      }
      artSrc = artUpload.url;
      artKey = artUpload.key;
    }

    if (moveLeftArtFile instanceof File && moveLeftArtFile.size > 0) {
      const moveLeftArtUpload = await uploadFileToS3({
        file: moveLeftArtFile,
        folder: "character-art",
        namePrefix: `${name}-left`,
      });
      if (moveLeftArtKey && moveLeftArtKey !== moveLeftArtUpload.key) {
        await deleteFileFromS3(moveLeftArtKey);
      }
      moveLeftArtSrc = moveLeftArtUpload.url;
      moveLeftArtKey = moveLeftArtUpload.key;
    }

    if (moveRightArtFile instanceof File && moveRightArtFile.size > 0) {
      const moveRightArtUpload = await uploadFileToS3({
        file: moveRightArtFile,
        folder: "character-art",
        namePrefix: `${name}-right`,
      });
      if (moveRightArtKey && moveRightArtKey !== moveRightArtUpload.key) {
        await deleteFileFromS3(moveRightArtKey);
      }
      moveRightArtSrc = moveRightArtUpload.url;
      moveRightArtKey = moveRightArtUpload.key;
    }

    if (clearMoveLeftArt) {
      if (moveLeftArtKey) {
        await deleteFileFromS3(moveLeftArtKey);
      }
      moveLeftArtSrc = null;
      moveLeftArtKey = null;
    }

    if (clearMoveRightArt) {
      if (moveRightArtKey) {
        await deleteFileFromS3(moveRightArtKey);
      }
      moveRightArtSrc = null;
      moveRightArtKey = null;
    }

    const update = {
      $set: {
        name,
        description,
        lore,
        entranceQuote,
        color,
        accent,
        element,
        bgTint,
        classId: targetClass._id,
        className: targetClass.name,
        visibilityScope,
        iconSrc: iconSrc || null,
        iconKey: iconKey || null,
        artSrc: artSrc || null,
        artKey: artKey || null,
        moveLeftArtSrc: moveLeftArtSrc || null,
        moveLeftArtKey: moveLeftArtKey || null,
        moveRightArtSrc: moveRightArtSrc || null,
        moveRightArtKey: moveRightArtKey || null,
        updatedAt: new Date(),
      },
    };

    const nextCharacter = {
      ...existingCharacter,
      ...update.$set,
    };
    delete nextCharacter.title;

    const result = await replaceUserUpload(String(ownerRecord.userDocument._id), existingCharacter.id, nextCharacter);

    if (!result) {
      return NextResponse.json(
        { error: "Character not found." },
        { status: 404 }
      );
    }

    console.log("[api/characters][PUT] updated:", {
      id,
      name: nextCharacter.name,
      iconSrc: nextCharacter.iconSrc,
      artSrc: nextCharacter.artSrc,
    });
    return NextResponse.json({ character: mapUploadDocument(nextCharacter) });
  } catch (error) {
    console.error("Failed to update character", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update character." },
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
    const ownerRecord = await findUploadOwnerById(id);
    const character = ownerRecord?.upload || null;

    if (!character) {
      return NextResponse.json(
        { error: "Character not found." },
        { status: 404 }
      );
    }

    const isOwner = character.createdByUserId === session.user.id;
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "You can only delete your own GIF fighter." }, { status: 403 });
    }

    const isClassLocked = await getClassLockState(character.classId);
    if (isClassLocked && !isAdmin) {
      return NextResponse.json(
        { error: "This class is locked. Students cannot delete GIF fighters right now." },
        { status: 403 }
      );
    }

    if (!isAdmin && activeClassId && character.classId !== activeClassId) {
      return NextResponse.json({ error: "Switch to that class before deleting its GIFs." }, { status: 403 });
    }

    const iconKey = character.iconKey || getS3KeyFromUrl(character.iconSrc);
    const artKey = character.artKey || getS3KeyFromUrl(character.artSrc);
    const moveLeftArtKey = character.moveLeftArtKey || getS3KeyFromUrl(character.moveLeftArtSrc);
    const moveRightArtKey = character.moveRightArtKey || getS3KeyFromUrl(character.moveRightArtSrc);

    if (iconKey) {
      await deleteFileFromS3(iconKey);
    }

    if (artKey && artKey !== iconKey) {
      await deleteFileFromS3(artKey);
    }

    if (moveLeftArtKey && moveLeftArtKey !== iconKey && moveLeftArtKey !== artKey) {
      await deleteFileFromS3(moveLeftArtKey);
    }

    if (
      moveRightArtKey &&
      moveRightArtKey !== iconKey &&
      moveRightArtKey !== artKey &&
      moveRightArtKey !== moveLeftArtKey
    ) {
      await deleteFileFromS3(moveRightArtKey);
    }

    const result = await removeUserUpload(String(ownerRecord.userDocument._id), character.id);

    if (!result.modifiedCount) {
      return NextResponse.json(
        { error: "Character not found." },
        { status: 404 }
      );
    }

    console.log("[api/characters][DELETE] deleted:", {
      id,
      deletedCount: result.modifiedCount,
      name: character.name,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete character", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete character." },
      { status: 500 }
    );
  }
}
