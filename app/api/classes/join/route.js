import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getClassesCollection, getUsersCollection } from "@/lib/mongodb";
import { auth } from "@/lib/auth";
import { mapMongoDocument, normalizeText } from "@/lib/classes";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Login required before joining a class." }, { status: 401 });
    }

    const payload = await request.json();
    const joinCode = normalizeText(payload?.joinCode).toUpperCase();
    const studentName = normalizeText(session.user.name) || "Student";

    if (!joinCode) {
      return NextResponse.json({ error: "Join code is required." }, { status: 400 });
    }

    const classesCollection = await getClassesCollection();
    const classDocument = await classesCollection.findOne({ joinCode });

    if (!classDocument) {
      return NextResponse.json({ error: "That class code was not found." }, { status: 404 });
    }

    const classId = String(classDocument._id);
    const userId = session.user.id;
    const members = Array.isArray(classDocument.members) ? classDocument.members : [];
    const existingMembership = members.find((member) => member.userId === userId);

    if (!existingMembership) {
      if (members.length >= Number(classDocument.maxMembers || 0)) {
        return NextResponse.json({ error: "This class is already full." }, { status: 409 });
      }
    }

    if (existingMembership) {
      await classesCollection.updateOne(
        { _id: classDocument._id },
        {
          $set: {
            "members.$[member].studentName": studentName,
            "members.$[member].email": session.user.email || null,
            "members.$[member].lastJoinedAt": new Date(),
            updatedAt: new Date(),
          },
        },
        {
          arrayFilters: [{ "member.userId": userId }],
        }
      );
    } else {
      await classesCollection.updateOne(
        { _id: classDocument._id },
        {
          $push: {
            members: {
              userId,
              studentName,
              email: session.user.email || null,
              joinedAt: new Date(),
              lastJoinedAt: new Date(),
            },
          },
          $set: {
            updatedAt: new Date(),
          },
        }
      );
    }

    const usersCollection = await getUsersCollection();
    await usersCollection.updateOne(
      { _id: new ObjectId(session.user.id) },
      {
        $set: { activeClassId: classId, updatedAt: new Date() },
        $addToSet: { joinedClassIds: classId },
      }
    );

    return NextResponse.json({
      ok: true,
      currentClass: {
        ...mapMongoDocument(classDocument),
        memberCount: existingMembership ? members.length : members.length + 1,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to join class." },
      { status: 500 }
    );
  }
}
