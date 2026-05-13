import { getClassesCollection, getSubmissionsCollection } from "@/lib/mongodb";
import { generateJoinCode, mapMongoDocument } from "@/lib/classes";
import { deleteFileFromS3, getS3KeyFromUrl } from "@/lib/s3";

export const GENERAL_CLASS_ID = "general_showcase_class";
export const GENERAL_CLASS_NAME = "General Showcase";
export const TEMP_UPLOAD_HOURS = 12;

export async function ensureGeneralClass() {
  const classesCollection = await getClassesCollection();
  const now = new Date();
  const existingClass = await classesCollection.findOne({ id: GENERAL_CLASS_ID });

  if (existingClass) {
    return mapMongoDocument(existingClass);
  }

  let joinCode = String(process.env.GENERAL_CLASS_JOIN_CODE || "").trim().toUpperCase() || generateJoinCode();
  while (await classesCollection.findOne({ joinCode })) {
    joinCode = generateJoinCode();
  }

  const classDocument = {
    id: GENERAL_CLASS_ID,
    name: GENERAL_CLASS_NAME,
    slug: "general-showcase",
    joinCode,
    maxMembers: 100000,
    isLocked: false,
    isGeneralClass: true,
    members: [],
    createdByUserId: null,
    createdByUserName: "System",
    createdAt: now,
    updatedAt: now,
  };

  const result = await classesCollection.insertOne(classDocument);
  return mapMongoDocument({ ...classDocument, _id: result.insertedId });
}

export function mapSubmissionDocument(document) {
  return {
    ...document,
    _id: String(document._id),
  };
}

export function isApprovedShowcaseItem(item) {
  const status = String(item?.status || "approved").toLowerCase();
  return status === "approved" && item?.isHidden !== true;
}

export async function listApprovedGeneralSubmissions(assetType) {
  await cleanupExpiredGeneralSubmissions();

  const submissionsCollection = await getSubmissionsCollection();
  const query = {
    status: "approved",
    isHidden: { $ne: true },
    expiresAt: null,
  };
  if (assetType) {
    query.assetType = assetType;
  }

  return submissionsCollection.find(query).sort({ approvedAt: -1, createdAt: -1 }).toArray();
}

export async function listPlayableGeneralSubmissions(assetType) {
  await cleanupExpiredGeneralSubmissions();

  const submissionsCollection = await getSubmissionsCollection();
  const now = new Date();
  const query = {
    isHidden: { $ne: true },
    $or: [
      { status: "approved", expiresAt: null },
      { status: "temporary", expiresAt: { $gt: now } },
    ],
  };
  if (assetType) {
    query.assetType = assetType;
  }

  return submissionsCollection.find(query).sort({ approvedAt: -1, createdAt: -1 }).toArray();
}

export async function cleanupExpiredGeneralSubmissions() {
  const submissionsCollection = await getSubmissionsCollection();
  const expiredRows = await submissionsCollection
    .find({ expiresAt: { $lte: new Date() } })
    .limit(25)
    .toArray();

  for (const row of expiredRows) {
    const keys = [
      row.iconKey || getS3KeyFromUrl(row.iconSrc),
      row.artKey || getS3KeyFromUrl(row.artSrc),
      row.moveLeftArtKey || getS3KeyFromUrl(row.moveLeftArtSrc),
      row.moveRightArtKey || getS3KeyFromUrl(row.moveRightArtSrc),
      row.bgKey || getS3KeyFromUrl(row.bgSrc),
    ].filter(Boolean);

    for (const key of [...new Set(keys)]) {
      await deleteFileFromS3(key);
    }
    await submissionsCollection.deleteOne({ _id: row._id });
  }
}
