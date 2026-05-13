import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { isTeacherRequest } from "@/lib/auth";
import { buildClassQuery, mapMongoDocument } from "@/lib/classes";
import { getClassesCollection, getUsersCollection } from "@/lib/mongodb";
import { deleteFileFromS3, getS3KeyFromUrl } from "@/lib/s3";
import { mapArenaDocument } from "@/lib/arenas";
import { mapUploadDocument, migrateLegacyCharactersToUsers } from "@/lib/uploads";

export async function DELETE(_request, { params }) {
  try {
    const isAdmin = await isTeacherRequest();
    if (!isAdmin) {
      return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
    }

    const { id, userId } = await params;
    const classesCollection = await getClassesCollection();
    const usersCollection = await getUsersCollection();
    const classDocument = await classesCollection.findOne(buildClassQuery(id));

    if (!classDocument) {
      return NextResponse.json({ error: "Class not found." }, { status: 404 });
    }

    const members = Array.isArray(classDocument.members) ? classDocument.members : [];
    const memberExists = members.some((member) => member?.userId === userId);
    if (!memberExists) {
      return NextResponse.json({ error: "Student is not in this class." }, { status: 404 });
    }

    await migrateLegacyCharactersToUsers();

    let classUploads = [];
    let classArenas = [];
    if (ObjectId.isValid(userId)) {
      const userDocument = await usersCollection.findOne(
        { _id: new ObjectId(userId) },
        { projection: { uploads: 1, customLevels: 1 } }
      );

      classUploads = Array.isArray(userDocument?.uploads)
        ? userDocument.uploads
            .filter((upload) => upload?.classId === String(classDocument._id))
            .map(mapUploadDocument)
        : [];
      classArenas = Array.isArray(userDocument?.customLevels)
        ? userDocument.customLevels
            .filter((arena) => arena?.classId === String(classDocument._id))
            .map(mapArenaDocument)
        : [];
    }

    for (const upload of classUploads) {
      const iconKey = upload.iconKey || getS3KeyFromUrl(upload.iconSrc);
      const artKey = upload.artKey || getS3KeyFromUrl(upload.artSrc);
      const moveLeftArtKey = upload.moveLeftArtKey || getS3KeyFromUrl(upload.moveLeftArtSrc);
      const moveRightArtKey = upload.moveRightArtKey || getS3KeyFromUrl(upload.moveRightArtSrc);

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
    }

    for (const arena of classArenas) {
      const bgKey = arena.bgKey || getS3KeyFromUrl(arena.bgSrc);
      if (bgKey) {
        await deleteFileFromS3(bgKey);
      }
    }

    await classesCollection.updateOne(
      { _id: classDocument._id },
      {
        $pull: { members: { userId } },
        $set: { updatedAt: new Date() },
      }
    );

    const classId = String(classDocument._id);
    if (ObjectId.isValid(userId)) {
      const userObjectId = new ObjectId(userId);

      await usersCollection.updateOne(
        { _id: userObjectId },
        {
          $pull: {
            joinedClassIds: classId,
            uploads: { classId },
            customLevels: { classId },
          },
          $set: { updatedAt: new Date() },
        }
      );

      await usersCollection.updateOne(
        { _id: userObjectId, activeClassId: classId },
        {
          $unset: { activeClassId: "" },
          $set: { updatedAt: new Date() },
        }
      );
    }

    const updatedClass = await classesCollection.findOne(buildClassQuery(id));

    return NextResponse.json({
      ok: true,
      class: {
        ...mapMongoDocument(updatedClass),
        memberCount: Array.isArray(updatedClass?.members) ? updatedClass.members.length : 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove student from class." },
      { status: 500 }
    );
  }
}
