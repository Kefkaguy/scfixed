import { getUsersCollection } from "@/lib/mongodb";
import { mapArenaDocument } from "@/lib/arenas";
import { listApprovedGeneralSubmissions } from "@/lib/general-class";
import { mapUploadDocument, migrateLegacyCharactersToUsers } from "@/lib/uploads";

function hasMedia(item, keys) {
  return keys.some((key) => typeof item?.[key] === "string" && item[key].trim());
}

function isTeacherCreated(item) {
  const role = String(item?.createdByRole || "").toLowerCase();
  return role === "teacher" || !role;
}

function sortByCreatedAtDesc(left, right) {
  return new Date(right?.createdAt || 0).getTime() - new Date(left?.createdAt || 0).getTime();
}

export async function getPublicGallery() {
  await migrateLegacyCharactersToUsers();

  const usersCollection = await getUsersCollection();
  const teacherRows = await usersCollection
    .find(
      { role: "teacher" },
      { projection: { name: 1, display_name: 1, uploads: 1, customLevels: 1 } }
    )
    .toArray();

  const approvedStudentRows = await listApprovedGeneralSubmissions();

  const fighters = [
    ...teacherRows
    .flatMap((userDocument) =>
      (Array.isArray(userDocument.uploads) ? userDocument.uploads : []).map((upload) => ({
        ...upload,
        sourceKind: "teacher-asset",
        sourceId: upload?.id || null,
        createdByUserName: upload?.createdByUserName || userDocument.display_name || userDocument.name || "Teacher",
      }))
    )
    .filter((upload) => isTeacherCreated(upload))
    .filter((upload) => hasMedia(upload, ["artSrc", "iconSrc"])),
    ...approvedStudentRows
      .filter((item) => item.assetType === "fighter")
      .map((item) => ({
        ...item,
        sourceKind: "submission",
        sourceId: String(item._id),
      })),
  ]
    .filter((upload) => hasMedia(upload, ["artSrc", "iconSrc"]))
    .map(mapUploadDocument)
    .sort(sortByCreatedAtDesc);

  const arenas = [
    ...teacherRows
    .flatMap((userDocument) =>
      (Array.isArray(userDocument.customLevels) ? userDocument.customLevels : []).map((arena) => ({
        ...arena,
        sourceKind: "teacher-asset",
        sourceId: arena?.id || null,
        createdByUserName: arena?.createdByUserName || userDocument.display_name || userDocument.name || "Teacher",
      }))
    )
    .filter((arena) => isTeacherCreated(arena))
    .filter((arena) => hasMedia(arena, ["bgSrc"])),
    ...approvedStudentRows
      .filter((item) => item.assetType === "arena")
      .map((item) => ({
        ...item,
        sourceKind: "submission",
        sourceId: String(item._id),
      })),
  ]
    .filter((arena) => hasMedia(arena, ["bgSrc"]))
    .map(mapArenaDocument)
    .sort(sortByCreatedAtDesc);

  return { fighters, arenas };
}
