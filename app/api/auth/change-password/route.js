import { compare, hash } from "bcryptjs";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUsersCollection } from "@/lib/mongodb";

function getPasswordHash(user) {
  return user?.password_hash || user?.passwordHash || "";
}

export async function POST(request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "teacher" || !ObjectId.isValid(session?.user?.id)) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const currentPassword = String(body?.currentPassword || "");
    const newPassword = String(body?.newPassword || "");

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current password and new password are required." }, { status: 400 });
    }

    if (newPassword.length < 12) {
      return NextResponse.json({ error: "New password must be at least 12 characters." }, { status: 400 });
    }

    if (newPassword === currentPassword) {
      return NextResponse.json({ error: "New password must be different from the temporary password." }, { status: 400 });
    }

    const usersCollection = await getUsersCollection();
    const user = await usersCollection.findOne({ _id: new ObjectId(session.user.id) });
    const passwordHash = getPasswordHash(user);

    if (user?.role !== "teacher" || !passwordHash) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const isValid = await compare(currentPassword, passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid current password." }, { status: 403 });
    }

    const nextPasswordHash = await hash(newPassword, 12);
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          password_hash: nextPasswordHash,
          must_change_password: false,
          updated_at: new Date(),
        },
        $unset: {
          passwordHash: "",
        },
      }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to change password." },
      { status: 500 }
    );
  }
}
