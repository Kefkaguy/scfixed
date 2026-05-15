import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { auth, isTeacherRequest } from "@/lib/auth";
import { getSubmissionsCollection } from "@/lib/mongodb";
import { deleteFileFromS3, getS3KeyFromUrl, uploadFileToS3 } from "@/lib/s3";
const RECOVERY_WINDOW_MS = 24 * 60 * 60 * 1000;

function idQuery(id) {
  return ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
}

function normalizeText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeColor(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

async function replaceUpload({ formData, field, folder, namePrefix, currentSrc, currentKey }) {
  const file = formData?.get(field);
  if (!(file instanceof File) || file.size <= 0) {
    return {
      src: currentSrc || null,
      key: currentKey || getS3KeyFromUrl(currentSrc) || null,
    };
  }

  const upload = await uploadFileToS3({ file, folder, namePrefix });
  const existingKey = currentKey || getS3KeyFromUrl(currentSrc);
  if (existingKey && existingKey !== upload.key) {
    await deleteFileFromS3(existingKey);
  }
  return { src: upload.url, key: upload.key };
}

export async function PATCH(request, { params }) {
  try {
    const isTeacher = await isTeacherRequest();
    const session = await auth();
    if (!isTeacher) {
      return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
    }

    const { id } = await params;
    const contentType = request.headers.get("content-type") || "";
    const formData = contentType.includes("multipart/form-data") ? await request.formData() : null;
    const payload = formData ? null : await request.json();
    const readValue = (key) => formData ? formData.get(key) : payload?.[key];
    const action = String(readValue("action") || "").toLowerCase();
    const allowedActions = new Set(["approve", "deny", "hide", "show", "edit", "restore"]);
    if (!allowedActions.has(action)) {
      return NextResponse.json({ error: "Choose a valid moderation action." }, { status: 400 });
    }

    const now = new Date();
    const set = { updatedAt: now };
    const submissionsCollection = await getSubmissionsCollection();
    const existingSubmission = action === "restore" || action === "edit"
      ? await submissionsCollection.findOne(idQuery(id))
      : null;
    if (action === "restore") {
      if (!existingSubmission) {
        return NextResponse.json({ error: "Submission not found." }, { status: 404 });
      }
      if (existingSubmission.status !== "deleted" || new Date(existingSubmission.recoverUntil || 0) <= now) {
        return NextResponse.json({ error: "This submission can no longer be recovered." }, { status: 410 });
      }
    }
    if (action === "approve") {
      set.status = "approved";
      set.isHidden = false;
      set.approvedAt = now;
      set.approvedByUserId = session?.user?.id || null;
      set.approvedByUserName = session?.user?.name || "Teacher";
    }
    if (action === "deny") {
      set.status = "denied";
      set.isHidden = true;
      set.deniedAt = now;
      set.deniedByUserId = session?.user?.id || null;
      set.deniedByUserName = session?.user?.name || "Teacher";
    }
    if (action === "hide") set.isHidden = true;
    if (action === "show") set.isHidden = false;
    if (action === "restore") {
      set.status = "approved";
      set.isHidden = false;
      set.restoredAt = now;
      set.restoredByUserId = session?.user?.id || null;
      set.restoredByUserName = session?.user?.name || "Teacher";
    }
    if (action === "edit") {
      if (!existingSubmission) {
        return NextResponse.json({ error: "Submission not found." }, { status: 404 });
      }

      const name = normalizeText(readValue("name"), existingSubmission.name).toUpperCase();
      if (!name) {
        return NextResponse.json({ error: "Asset name is required." }, { status: 400 });
      }

      set.name = name;
      set.description = normalizeText(readValue("description"));
      set.period = normalizeText(readValue("period"));
      set.studentName = normalizeText(readValue("studentName"), existingSubmission.studentName || "Student");
      set.email = normalizeText(readValue("email")) || null;

      if (existingSubmission.assetType === "fighter") {
        set.color = normalizeColor(readValue("color"), existingSubmission.color || "#e8001a");
        set.accent = set.color;
        set.bgTint = set.color;
        set.lore = normalizeText(readValue("lore"));
        set.entranceQuote = normalizeText(readValue("entranceQuote"));

        const iconUpload = await replaceUpload({
          formData,
          field: "iconFile",
          folder: "character-icons",
          namePrefix: name,
          currentSrc: existingSubmission.iconSrc,
          currentKey: existingSubmission.iconKey,
        });
        const artUpload = await replaceUpload({
          formData,
          field: "artFile",
          folder: "character-art",
          namePrefix: name,
          currentSrc: existingSubmission.artSrc,
          currentKey: existingSubmission.artKey,
        });
        const moveLeftUpload = await replaceUpload({
          formData,
          field: "moveLeftArtFile",
          folder: "character-art",
          namePrefix: `${name}-left`,
          currentSrc: existingSubmission.moveLeftArtSrc,
          currentKey: existingSubmission.moveLeftArtKey,
        });
        const moveRightUpload = await replaceUpload({
          formData,
          field: "moveRightArtFile",
          folder: "character-art",
          namePrefix: `${name}-right`,
          currentSrc: existingSubmission.moveRightArtSrc,
          currentKey: existingSubmission.moveRightArtKey,
        });

        set.iconSrc = iconUpload.src;
        set.iconKey = iconUpload.key;
        set.artSrc = artUpload.src;
        set.artKey = artUpload.key;
        set.moveLeftArtSrc = moveLeftUpload.src;
        set.moveLeftArtKey = moveLeftUpload.key;
        set.moveRightArtSrc = moveRightUpload.src;
        set.moveRightArtKey = moveRightUpload.key;

        if (formData?.get("clearMoveLeftArt") === "1") {
          const key = existingSubmission.moveLeftArtKey || getS3KeyFromUrl(existingSubmission.moveLeftArtSrc);
          if (key) await deleteFileFromS3(key);
          set.moveLeftArtSrc = null;
          set.moveLeftArtKey = null;
        }
        if (formData?.get("clearMoveRightArt") === "1") {
          const key = existingSubmission.moveRightArtKey || getS3KeyFromUrl(existingSubmission.moveRightArtSrc);
          if (key) await deleteFileFromS3(key);
          set.moveRightArtSrc = null;
          set.moveRightArtKey = null;
        }
      }

      if (existingSubmission.assetType === "arena") {
        set.icon = normalizeText(readValue("icon"), existingSubmission.icon || "*");
        set.difficulty = Math.min(10, Math.max(1, Number.parseInt(String(readValue("difficulty") || existingSubmission.difficulty || "1"), 10) || 1));
        const bgUpload = await replaceUpload({
          formData,
          field: "bgFile",
          folder: "arena-backgrounds",
          namePrefix: name,
          currentSrc: existingSubmission.bgSrc,
          currentKey: existingSubmission.bgKey,
        });
        set.bgSrc = bgUpload.src;
        set.bgKey = bgUpload.key;
      }
    }

    const result = await submissionsCollection.findOneAndUpdate(
      idQuery(id),
      {
        $set: set,
        ...(action === "restore" ? { $unset: { deletedAt: "", deletedByUserId: "", deletedByUserName: "", recoverUntil: "" } } : {}),
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    return NextResponse.json({ submission: { ...result, _id: String(result._id) } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update submission." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    const isTeacher = await isTeacherRequest();
    const session = await auth();
    if (!isTeacher) {
      return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
    }

    const { id } = await params;
    const submissionsCollection = await getSubmissionsCollection();
    const submission = await submissionsCollection.findOne(idQuery(id));
    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    const now = new Date();
    const recoverUntil = new Date(now.getTime() + RECOVERY_WINDOW_MS);
    await submissionsCollection.updateOne(
      { _id: submission._id },
      {
        $set: {
          status: "deleted",
          isHidden: true,
          deletedAt: now,
          deletedByUserId: session?.user?.id || null,
          deletedByUserName: session?.user?.name || "Teacher",
          recoverUntil,
          updatedAt: now,
        },
      }
    );
    return NextResponse.json({ ok: true, recoverUntil: recoverUntil.toISOString() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete submission." },
      { status: 500 }
    );
  }
}
