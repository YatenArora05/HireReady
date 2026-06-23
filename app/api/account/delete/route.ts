import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const userId = new ObjectId(session.user.id);
    const client = await clientPromise;
    const db     = client.db();

    // Delete the user document
    const result = await db.collection("users").deleteOne({ _id: userId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Clean up related data (non-blocking — best effort)
    await Promise.allSettled([
      db.collection("mcq_sessions").deleteMany({ userId }),
      db.collection("mcq_results").deleteMany({ userId }),
      db.collection("voice_interviews").deleteMany({ userId }),
      db.collection("voice_sessions").deleteMany({ userId }),
      db.collection("submissions").deleteMany({ userId }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
