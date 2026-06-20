import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

const DEDUCT_AMOUNT = 10;
const MIN_CREDITS   = 0;

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const client = await clientPromise;
    const db     = client.db();
    const users  = db.collection("users");

    // Fetch current credits
    const user = await users.findOne(
      { _id: new ObjectId(session.user.id) },
      { projection: { credits: 1 } }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const currentCredits = user.credits ?? 100;

    if (currentCredits < DEDUCT_AMOUNT) {
      return NextResponse.json(
        { error: "Insufficient credits. Please upgrade your plan.", credits: currentCredits },
        { status: 402 }
      );
    }

    // Atomic decrement — won't go below MIN_CREDITS
    const result = await users.findOneAndUpdate(
      { _id: new ObjectId(session.user.id), credits: { $gte: DEDUCT_AMOUNT } },
      { $inc: { credits: -DEDUCT_AMOUNT }, $set: { updatedAt: new Date() } },
      { returnDocument: "after", projection: { credits: 1 } }
    );

    if (!result) {
      // Race condition — re-fetch and return current balance
      const refetch = await users.findOne(
        { _id: new ObjectId(session.user.id) },
        { projection: { credits: 1 } }
      );
      return NextResponse.json(
        { error: "Insufficient credits.", credits: refetch?.credits ?? MIN_CREDITS },
        { status: 402 }
      );
    }

    const newCredits = result.credits as number;

    return NextResponse.json({ ok: true, credits: newCredits, deducted: DEDUCT_AMOUNT });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to deduct credits.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
