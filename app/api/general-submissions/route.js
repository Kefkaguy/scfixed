import { NextResponse } from "next/server";
import { auth, isTeacherRequest } from "@/lib/auth";
import { normalizeText } from "@/lib/classes";
import { cleanupExpiredGeneralSubmissions, ensureGeneralClass, mapSubmissionDocument, TEMP_UPLOAD_HOURS } from "@/lib/general-class";
import { getClassesCollection, getSubmissionsCollection } from "@/lib/mongodb";
import { uploadFileToS3 } from "@/lib/s3";

function normalizeColor(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function publicAssetFields(document) {
  const mapped = mapSubmissionDocument(document);
  return {
    ...mapped,
    classId: mapped.classId,
    className: mapped.className,
    createdByUserName: mapped.studentName || mapped.createdByUserName || "Student",
    createdByRole: mapped.createdByRole || "student",
  };
}

async function uploadOptionalFile(formData, field, folder, namePrefix) {
  const file = formData.get(field);
  if (file instanceof File && file.size > 0) {
    return uploadFileToS3({ file, folder, namePrefix });
  }
  const existingSrc = normalizeText(formData.get(field.replace("File", "Src"))) || null;
  const existingKey = normalizeText(formData.get(field.replace("File", "Key"))) || null;
  return existingSrc ? { url: existingSrc, key: existingKey } : null;
}

export async function GET(request) {
  try {
    const isTeacher = await isTeacherRequest();
    await cleanupExpiredGeneralSubmissions();
    if (!isTeacher) {
      return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = normalizeText(searchParams.get("status"));
    const assetType = normalizeText(searchParams.get("assetType"));
    const period = normalizeText(searchParams.get("period"));
    const includeDeleted = searchParams.get("includeDeleted") === "1";
    const submissionsCollection = await getSubmissionsCollection();
    const query = includeDeleted
      ? { expiresAt: null, status: "deleted", recoverUntil: { $gt: new Date() } }
      : { expiresAt: null, status: { $ne: "deleted" } };
    if (!includeDeleted && status && status !== "all") query.status = status;
    if (assetType && assetType !== "all") query.assetType = assetType;
    if (period) query.period = period;

    const submissions = await submissionsCollection.find(query).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ submissions: submissions.map(publicAssetFields) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load submissions." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    await cleanupExpiredGeneralSubmissions();
    const isTeacher = session?.user?.role === "teacher" && !session?.user?.mustChangePassword;
    const formData = await request.formData();
    const mode = normalizeText(formData.get("mode"), "submit");
    const assetType = normalizeText(formData.get("assetType"), "fighter");
    const generalClass = await ensureGeneralClass();

    if (!["fighter", "arena"].includes(assetType)) {
      return NextResponse.json({ error: "Choose fighter or arena upload." }, { status: 400 });
    }

    const studentName = normalizeText(formData.get("studentName")) || normalizeText(session?.user?.name);
    const email = normalizeText(formData.get("email"));
    const period = normalizeText(formData.get("period"));
    if (!isTeacher && mode !== "test" && (!studentName || !period)) {
      return NextResponse.json({ error: "Name and period/class are required." }, { status: 400 });
    }

    const name = normalizeText(formData.get("name")).toUpperCase();
    const description = normalizeText(formData.get("description"));
    if (!name) {
      return NextResponse.json({ error: assetType === "arena" ? "Arena name is required." : "Fighter name is required." }, { status: 400 });
    }
    if (!description) {
      return NextResponse.json({ error: "Description is required." }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = mode === "test" ? new Date(now.getTime() + TEMP_UPLOAD_HOURS * 60 * 60 * 1000) : null;
    const base = {
      id: `${assetType}_${crypto.randomUUID()}`,
      assetType,
      status: mode === "test" ? "temporary" : isTeacher ? "approved" : "pending",
      isHidden: false,
      classId: generalClass._id,
      className: generalClass.name,
      name,
      description,
      studentName: studentName || "Test Player",
      email: email || null,
      period: period || null,
      createdByRole: isTeacher ? session.user.role || "teacher" : "student",
      createdByUserId: isTeacher ? session.user.id : null,
      createdByUserName: isTeacher ? session.user.name || "Teacher" : studentName || "Student",
      createdAt: now,
      updatedAt: now,
      expiresAt,
      approvedAt: isTeacher ? now : null,
      approvedByUserId: isTeacher ? session.user.id : null,
      approvedByUserName: isTeacher ? session.user.name || "Teacher" : null,
    };

    let submission;
    if (assetType === "fighter") {
      const iconUpload = await uploadOptionalFile(formData, "iconFile", "character-icons", name);
      const artUpload = await uploadOptionalFile(formData, "artFile", "character-art", name);
      const moveLeftArtUpload = await uploadOptionalFile(formData, "moveLeftArtFile", "character-art", `${name}-left`);
      const moveRightArtUpload = await uploadOptionalFile(formData, "moveRightArtFile", "character-art", `${name}-right`);
      if (!iconUpload?.url || !artUpload?.url) {
        return NextResponse.json({ error: "Upload both an icon and an idle GIF/video." }, { status: 400 });
      }
      submission = {
        ...base,
        color: normalizeColor(formData.get("color"), "#e8001a"),
        accent: normalizeColor(formData.get("color"), "#e8001a"),
        element: "*",
        lore: normalizeText(formData.get("lore")),
        entranceQuote: normalizeText(formData.get("entranceQuote")),
        bgTint: normalizeColor(formData.get("color"), "#e8001a"),
        iconSrc: iconUpload?.url || null,
        iconKey: iconUpload?.key || null,
        artSrc: artUpload?.url || null,
        artKey: artUpload?.key || null,
        moveLeftArtSrc: moveLeftArtUpload?.url || null,
        moveLeftArtKey: moveLeftArtUpload?.key || null,
        moveRightArtSrc: moveRightArtUpload?.url || null,
        moveRightArtKey: moveRightArtUpload?.key || null,
      };
    } else {
      const bgUpload = await uploadOptionalFile(formData, "bgFile", "arena-backgrounds", name);
      if (!bgUpload?.url) {
        return NextResponse.json({ error: "Arena background is required." }, { status: 400 });
      }
      submission = {
        ...base,
        icon: normalizeText(formData.get("icon"), "*"),
        difficulty: Math.min(10, Math.max(1, Number.parseInt(String(formData.get("difficulty") || "1"), 10) || 1)),
        bgSrc: bgUpload.url,
        bgKey: bgUpload.key || null,
      };
    }

    const submissionsCollection = await getSubmissionsCollection();
    const result = await submissionsCollection.insertOne(submission);

    if (!isTeacher && mode !== "test") {
      const classesCollection = await getClassesCollection();
      const memberId = `${studentName.toLowerCase()}|${email.toLowerCase()}|${period.toLowerCase()}`;
      await classesCollection.updateOne(
        { id: "general_showcase_class" },
        {
          $pull: { members: { memberId } },
        }
      );
      await classesCollection.updateOne(
        { id: "general_showcase_class" },
        {
          $push: {
            members: {
              memberId,
              studentName,
              email: email || null,
              period,
              joinedAt: now,
              lastJoinedAt: now,
            },
          },
          $set: { updatedAt: now },
        }
      );
    }

    return NextResponse.json(
      {
        submission: publicAssetFields({ ...submission, _id: result.insertedId }),
        expiresAt,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save submission." },
      { status: 500 }
    );
  }
}
