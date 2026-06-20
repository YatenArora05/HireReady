import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

// Called when a voice practice session starts — deducts 10 credits
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const userId  = session?.user?.id ?? null;

    const client = await clientPromise;
    const db     = client.db();

    let remainingCredits: number | null = null;

    if (userId) {
      const userDoc = await db.collection("users").findOneAndUpdate(
        { _id: new ObjectId(userId), credits: { $gte: 10 } },
        { $inc: { credits: -10 }, $set: { updatedAt: new Date() } },
        { returnDocument: "after", projection: { credits: 1 } }
      );

      if (!userDoc) {
        return NextResponse.json(
          { error: "Insufficient credits. Please upgrade your plan." },
          { status: 402 }
        );
      }

      remainingCredits = userDoc.credits as number;

      // Log the session start
      await db.collection("voice_sessions").insertOne({
        userId:    new ObjectId(userId),
        startedAt: new Date(),
      });
    }

    return NextResponse.json({ ok: true, remainingCredits });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start voice session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
