import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getClassesCollection, getUsersCollection } from "@/lib/mongodb";
import { buildClassQuery, mapMongoDocument } from "@/lib/classes";
import { ensureGeneralClass } from "@/lib/general-class";
import { listUploadsForUser, mapUploadDocument } from "@/lib/uploads";
import { mapArenaDocument } from "@/lib/arenas";
import { deleteFileFromS3, getS3KeyFromUrl, uploadFileToS3 } from "@/lib/s3";

function uniqueUploadersForClass(members, uploadsByUser, classId) {
  const memberIds = new Set(
    (Array.isArray(members) ? members : [])
      .map((member) => member?.userId)
      .filter(Boolean)
  );

  let count = 0;
  for (const [userId, uploads] of uploadsByUser.entries()) {
    if (!memberIds.has(userId)) {
      continue;
    }

    const hasUpload = uploads.some((upload) => upload?.classId === classId);
    if (hasUpload) {
      count += 1;
    }
  }

  return count;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const userId = session.user.id;
    const usersCollection = await getUsersCollection();
    const classesCollection = await getClassesCollection();
    const userDocument = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!userDocument) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const generalClass = await ensureGeneralClass();
    const joinedClassIds = Array.isArray(userDocument.joinedClassIds) ? userDocument.joinedClassIds : [];
    const joinedClasses = await Promise.all(
      joinedClassIds.map(async (classId) => {
        const classDocument = await classesCollection.findOne(buildClassQuery(classId));
        if (!classDocument) {
          return null;
        }
        const members = Array.isArray(classDocument.members) ? classDocument.members : [];
        return {
          ...mapMongoDocument(classDocument),
          memberCount: members.length,
        };
      })
    );

    const activeClass = {
      ...generalClass,
      memberCount: Array.isArray(generalClass.members) ? generalClass.members.length : 0,
    };

    const uploads = await listUploadsForUser(userId);
    const arenas = Array.isArray(userDocument.customLevels)
      ? userDocument.customLevels.map(mapArenaDocument)
      : [];
    const userRole = userDocument.role || "student";
    const isTeacher = userRole === "teacher" && !userDocument.must_change_password;

    let managedClasses = [];
    if (isTeacher) {
      const teacherClasses = [generalClass];
      const classIds = teacherClasses.map((classDocument) => String(classDocument._id));

      const usersWithUploads = await usersCollection
        .find(
          {
            uploads: {
              $elemMatch: {
                classId: { $in: classIds },
              },
            },
          },
          { projection: { uploads: 1 } }
        )
        .toArray();

      const uploadsByUser = new Map(
        usersWithUploads.map((userRow) => [
          String(userRow._id),
          Array.isArray(userRow.uploads) ? userRow.uploads : [],
        ])
      );

      managedClasses = teacherClasses.map((classDocument) => {
        const classId = String(classDocument._id);
        const members = Array.isArray(classDocument.members) ? classDocument.members : [];
        const memberCount = members.length;
        const uploadedByCount = uniqueUploadersForClass(members, uploadsByUser, classId);

        return {
          ...mapMongoDocument(classDocument),
          memberCount,
          uploadedByCount,
          remainingToUploadCount: Math.max(memberCount - uploadedByCount, 0),
        };
      });
    }

    return NextResponse.json({
      user: {
        id: userId,
        name: userDocument.display_name || userDocument.name || userDocument.username,
        username: userDocument.username || null,
        email: userDocument.email || null,
        image: userDocument.profileImageSrc || null,
        role: userRole,
        mustChangePassword: Boolean(userDocument.must_change_password),
        activeClassId: userDocument.activeClassId || null,
      },
      activeClass,
      joinedClasses: joinedClasses.filter(Boolean),
      managedClasses,
      uploads: uploads.map(mapUploadDocument),
      arenas,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load account." },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const usersCollection = await getUsersCollection();
    const userId = new ObjectId(session.user.id);
    const userDocument = await usersCollection.findOne(
      { _id: userId },
      { projection: { profileImageSrc: 1, profileImageKey: 1, name: 1, display_name: 1, username: 1 } }
    );

    if (!userDocument) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const formData = await request.formData();
    const profileImageFile = formData.get("profileImage");
    const clearProfileImage = formData.get("clearProfileImage") === "1";
    let profileImageSrc = userDocument.profileImageSrc || null;
    let profileImageKey = userDocument.profileImageKey || getS3KeyFromUrl(userDocument.profileImageSrc);

    if (clearProfileImage) {
      if (profileImageKey) {
        await deleteFileFromS3(profileImageKey);
      }
      profileImageSrc = null;
      profileImageKey = null;
    } else if (profileImageFile instanceof File && profileImageFile.size > 0) {
      const upload = await uploadFileToS3({
        file: profileImageFile,
        folder: "profile-images",
        namePrefix: userDocument.display_name || userDocument.name || userDocument.username || "user",
      });

      if (profileImageKey && profileImageKey !== upload.key) {
        await deleteFileFromS3(profileImageKey);
      }

      profileImageSrc = upload.url;
      profileImageKey = upload.key;
    } else {
      return NextResponse.json({ error: "No profile image provided." }, { status: 400 });
    }

    await usersCollection.updateOne(
      { _id: userId },
      {
        $set: {
          profileImageSrc,
          profileImageKey,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      ok: true,
      user: {
        id: String(userId),
        image: profileImageSrc,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update profile image." },
      { status: 500 }
    );
  }
}
