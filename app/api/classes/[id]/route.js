import { NextResponse } from "next/server";
import { getClassesCollection, getUsersCollection } from "@/lib/mongodb";
import { buildClassQuery, mapMongoDocument, normalizePositiveInt, normalizeText } from "@/lib/classes";
import { isTeacherRequest } from "@/lib/auth";
import { deleteFileFromS3, getS3KeyFromUrl } from "@/lib/s3";
import { listUploadsForClass, migrateLegacyCharactersToUsers } from "@/lib/uploads";
import { listArenasForClass } from "@/lib/arenas";
import { GENERAL_CLASS_ID } from "@/lib/general-class";

export async function PUT(request, { params }) {
  try {
    const isAdmin = await isTeacherRequest();
    if (!isAdmin) {
      return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
    }

    const { id } = await params;
    const payload = await request.json();
    const name = normalizeText(payload?.name);
    const maxMembers = normalizePositiveInt(payload?.maxMembers, 30);
    const classesCollection = await getClassesCollection();

    const updateFields = {
      updatedAt: new Date(),
    };

    if (name) {
      updateFields.name = name;
    }

    if (payload?.maxMembers !== undefined) {
      updateFields.maxMembers = maxMembers;
    }

    if (payload?.isLocked !== undefined) {
      updateFields.isLocked = Boolean(payload.isLocked);
    }

    const updatedClass = await classesCollection.findOneAndUpdate(
      buildClassQuery(id),
      { $set: updateFields },
      { returnDocument: "after" }
    );

    if (!updatedClass) {
      return NextResponse.json({ error: "Class not found." }, { status: 404 });
    }

    return NextResponse.json({
      class: {
        ...mapMongoDocument(updatedClass),
        memberCount: Array.isArray(updatedClass.members) ? updatedClass.members.length : 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update class." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    const isAdmin = await isTeacherRequest();
    if (!isAdmin) {
      return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
    }

    const { id } = await params;
    const query = buildClassQuery(id);
    const classesCollection = await getClassesCollection();
    const usersCollection = await getUsersCollection();

    const existingClass = await classesCollection.findOne(query);
    if (!existingClass) {
      return NextResponse.json({ error: "Class not found." }, { status: 404 });
    }

    if (existingClass.id === GENERAL_CLASS_ID || existingClass.isGeneralClass) {
      return NextResponse.json({ error: "The general class cannot be deleted." }, { status: 403 });
    }

    const classId = String(existingClass._id);
    await migrateLegacyCharactersToUsers();
    const classUploads = await listUploadsForClass(classId);
    const classArenas = await listArenasForClass(classId);

    for (const upload of classUploads) {
      const iconKey = upload.iconKey || getS3KeyFromUrl(upload.iconSrc);
      const artKey = upload.artKey || getS3KeyFromUrl(upload.artSrc);

      if (iconKey) {
        await deleteFileFromS3(iconKey);
      }

      if (artKey && artKey !== iconKey) {
        await deleteFileFromS3(artKey);
      }
    }

    for (const arena of classArenas) {
      const bgKey = arena.bgKey || getS3KeyFromUrl(arena.bgSrc);
      if (bgKey) {
        await deleteFileFromS3(bgKey);
      }
    }

    await classesCollection.deleteOne(query);
    await usersCollection.updateMany(
      {},
      {
        $pull: {
          uploads: { classId },
          customLevels: { classId },
          joinedClassIds: classId,
        },
      }
    );
    await usersCollection.updateMany(
      { activeClassId: classId },
      {
        $set: {
          activeClassId: null,
        },
      }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete class." },
      { status: 500 }
    );
  }
}
