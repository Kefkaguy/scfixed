import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { auth, isTeacherRequest } from "@/lib/auth";
import { getSubmissionsCollection } from "@/lib/mongodb";
const RECOVERY_WINDOW_MS = 24 * 60 * 60 * 1000;

function idQuery(id) {
  return ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
}

export async function PATCH(request, { params }) {
  try {
    const isTeacher = await isTeacherRequest();
    const session = await auth();
    if (!isTeacher) {
      return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
    }

    const { id } = await params;
    const payload = await request.json();
    const action = String(payload?.action || "").toLowerCase();
    const allowedActions = new Set(["approve", "deny", "hide", "show", "edit", "restore"]);
    if (!allowedActions.has(action)) {
      return NextResponse.json({ error: "Choose a valid moderation action." }, { status: 400 });
    }

    const now = new Date();
    const set = { updatedAt: now };
    if (action === "restore") {
      const submissionsCollection = await getSubmissionsCollection();
      const existingSubmission = await submissionsCollection.findOne(idQuery(id));
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
      if (typeof payload.name === "string" && payload.name.trim()) set.name = payload.name.trim().toUpperCase();
      if (typeof payload.description === "string") set.description = payload.description.trim();
      if (typeof payload.period === "string") set.period = payload.period.trim();
      if (typeof payload.studentName === "string" && payload.studentName.trim()) set.studentName = payload.studentName.trim();
      if (typeof payload.email === "string") set.email = payload.email.trim() || null;
    }

    const submissionsCollection = await getSubmissionsCollection();
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
