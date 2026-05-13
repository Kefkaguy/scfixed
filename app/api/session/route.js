import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getClassesCollection, getUsersCollection } from "@/lib/mongodb";
import { auth } from "@/lib/auth";
import { buildClassQuery, mapMongoDocument } from "@/lib/classes";
import { ensureGeneralClass } from "@/lib/general-class";

export async function GET() {
  try {
    const session = await auth();
    const role = session?.user?.role || null;
    const isAdmin = role === "teacher" && !session?.user?.mustChangePassword;
    const usersCollection = await getUsersCollection();

    let currentClass = null;
    let isMemberOfCurrentClass = false;
    let activeClassId = null;

    if (session?.user?.id && ObjectId.isValid(session.user.id)) {
      const userDocument = await usersCollection.findOne(
        { _id: new ObjectId(session.user.id) },
        { projection: { activeClassId: 1 } }
      );
      activeClassId = userDocument?.activeClassId || null;
    }

    const generalClass = await ensureGeneralClass();
    activeClassId = generalClass._id;

    if (activeClassId) {
      const classesCollection = await getClassesCollection();
      const classDocument = await classesCollection.findOne(buildClassQuery(activeClassId));
      if (classDocument) {
        const members = Array.isArray(classDocument.members) ? classDocument.members : [];
        const memberCount = members.length;
        const mappedClass = mapMongoDocument(classDocument);
        if (session?.user?.id) {
          isMemberOfCurrentClass = members.some((member) => member.userId === session.user.id);
        }
        if (mappedClass?.isGeneralClass) {
          isMemberOfCurrentClass = true;
        }
        const memberObjectIds = members
          .map((member) => member?.userId)
          .filter((userId) => ObjectId.isValid(userId))
          .map((userId) => new ObjectId(userId));
        const memberDocuments = memberObjectIds.length
          ? await usersCollection
              .find(
                { _id: { $in: memberObjectIds } },
                { projection: { name: 1, display_name: 1, email: 1, profileImageSrc: 1, uploads: 1, customLevels: 1 } }
              )
              .toArray()
          : [];
        const memberDocumentById = new Map(
          memberDocuments.map((document) => [String(document._id), document])
        );
        currentClass = {
          ...mappedClass,
          memberCount,
          members: isAdmin
            ? members.map((member) => ({
                userId: member?.userId || null,
                studentName: memberDocumentById.get(member?.userId || "")?.display_name || memberDocumentById.get(member?.userId || "")?.name || member?.studentName || "",
                email: memberDocumentById.get(member?.userId || "")?.email || member?.email || "",
                image: memberDocumentById.get(member?.userId || "")?.profileImageSrc || null,
                hasFighter: Array.isArray(memberDocumentById.get(member?.userId || "")?.uploads)
                  ? memberDocumentById.get(member?.userId || "").uploads.some((upload) => upload?.classId === mappedClass._id)
                  : false,
                hasArena: Array.isArray(memberDocumentById.get(member?.userId || "")?.customLevels)
                  ? memberDocumentById.get(member?.userId || "").customLevels.some((arena) => arena?.classId === mappedClass._id)
                  : false,
                joinedAt: member?.joinedAt || null,
                lastJoinedAt: member?.lastJoinedAt || null,
              }))
            : [],
        };
      }
    }

    return NextResponse.json({
      user: session?.user || null,
      isAdmin,
      classSession: activeClassId ? { classId: activeClassId } : null,
      currentClass,
      canUploadToClass:
        Boolean(currentClass) &&
        Boolean(session?.user) &&
        (isAdmin || (isMemberOfCurrentClass && !currentClass.isLocked)),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load session." },
      { status: 500 }
    );
  }
}
