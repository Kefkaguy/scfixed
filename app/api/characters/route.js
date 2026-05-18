import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { uploadFileToS3 } from "@/lib/s3";
import { auth, isTeacherRequest } from "@/lib/auth";
import { normalizeText } from "@/lib/classes";
import { ensureGeneralClass, listPlayableGeneralSubmissions } from "@/lib/general-class";
import { addUploadToUser, listUploadsForClass, mapUploadDocument } from "@/lib/uploads";

function normalizeColor(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

async function getActiveClass() {
  return ensureGeneralClass();
}

async function resolveUploadClass({ activeClass }) {
  return activeClass;
}

export async function GET() {
  try {
    const activeClass = await getActiveClass();
    const [characters, playableStudentFighters] = await Promise.all([
      listUploadsForClass(activeClass._id),
      listPlayableGeneralSubmissions("fighter"),
    ]);
    return NextResponse.json({
      characters: [...characters, ...playableStudentFighters].map(mapUploadDocument),
      currentClass: activeClass,
    });
  } catch (error) {
    console.error("Failed to fetch characters", error);
    if (error instanceof Error && error.message.includes("Missing ")) {
      return NextResponse.json({ characters: [], warning: error.message });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch characters." },
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
      return NextResponse.json({ error: "Login required before uploading GIFs." }, { status: 401 });
    }

    if (!activeClass) {
      return NextResponse.json(
        { error: "Join or select a class before uploading GIFs." },
        { status: 403 }
      );
    }

    if (activeClass.isLocked && !isAdmin) {
      return NextResponse.json(
        { error: "This class is locked. Students cannot upload GIFs right now." },
        { status: 403 }
      );
    }

    if (!isAdmin) {
      const membership = Array.isArray(activeClass.members)
        ? activeClass.members.find((member) => member.userId === session.user.id)
        : null;

      if (!membership) {
        return NextResponse.json(
          { error: "You must join this class before uploading GIFs." },
          { status: 403 }
        );
      }
    }

    const usersCollection = await getUsersCollection();
    const userDocument = await usersCollection.findOne(
      { _id: new ObjectId(session.user.id) },
      { projection: { uploads: 1 } }
    );
    const existingUploads = Array.isArray(userDocument?.uploads) ? userDocument.uploads : [];
    const alreadyHasClassUpload = existingUploads.some((upload) => upload?.classId === activeClass._id);

    if (!isAdmin && alreadyHasClassUpload) {
      return NextResponse.json(
        { error: "You can only upload 1 GIF fighter per class." },
        { status: 409 }
      );
    }

    const name = normalizeText(formData.get("name")).toUpperCase();
    const description = normalizeText(formData.get("description"));
    const lore = normalizeText(formData.get("lore"));
    const entranceQuote = normalizeText(formData.get("entranceQuote"));
    const color = normalizeColor(formData.get("color"), "#e8001a");
    const accent = normalizeColor(formData.get("accent"), "#ff6644");
    const element = normalizeText(formData.get("element"), "FIRE");
    const bgTint = normalizeColor(formData.get("bgTint"), "#2a0000");

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

    let iconUpload = existingIconSrc ? { url: existingIconSrc } : null;
    let artUpload = existingArtSrc ? { url: existingArtSrc } : null;
    let moveLeftArtUpload = existingMoveLeftArtSrc ? { url: existingMoveLeftArtSrc } : null;
    let moveRightArtUpload = existingMoveRightArtSrc ? { url: existingMoveRightArtSrc } : null;

    if (iconFile instanceof File && iconFile.size > 0) {
      iconUpload = await uploadFileToS3({
        file: iconFile,
        folder: "character-icons",
        namePrefix: name,
      });
    }

    if (artFile instanceof File && artFile.size > 0) {
      artUpload = await uploadFileToS3({
        file: artFile,
        folder: "character-art",
        namePrefix: name,
      });
    }

    if (moveLeftArtFile instanceof File && moveLeftArtFile.size > 0) {
      moveLeftArtUpload = await uploadFileToS3({
        file: moveLeftArtFile,
        folder: "character-art",
        namePrefix: `${name}-left`,
      });
    }

    if (moveRightArtFile instanceof File && moveRightArtFile.size > 0) {
      moveRightArtUpload = await uploadFileToS3({
        file: moveRightArtFile,
        folder: "character-art",
        namePrefix: `${name}-right`,
      });
    }

    const now = new Date();
    const customCharacter = {
      id: `custom_${crypto.randomUUID()}`,
      classId: activeClass._id,
      className: activeClass.name,
      visibilityScope,
      name,
      description,
      lore,
      entranceQuote,
      color,
      accent,
      element,
      bgTint,
      iconSrc: iconUpload?.url || null,
      iconKey: iconUpload?.key || null,
      artSrc: artUpload?.url || null,
      artKey: artUpload?.key || null,
      moveLeftArtSrc: moveLeftArtUpload?.url || null,
      moveLeftArtKey: moveLeftArtUpload?.key || null,
      moveRightArtSrc: moveRightArtUpload?.url || null,
      moveRightArtKey: moveRightArtUpload?.key || null,
      createdAt: now,
      updatedAt: now,
      createdByRole: isAdmin ? session.user.role || "teacher" : "student",
      createdByUserId: session.user.id,
      createdByUserName: session.user.name || "",
    };
    console.log("[api/characters][POST] inserted:", {
      _id: customCharacter.id,
      id: customCharacter.id,
      name: customCharacter.name,
      iconSrc: customCharacter.iconSrc,
      artSrc: customCharacter.artSrc,
    });

    await addUploadToUser(session.user.id, customCharacter);

    return NextResponse.json(
      {
        character: mapUploadDocument(customCharacter),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create character", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create character." },
      { status: 500 }
    );
  }
}
