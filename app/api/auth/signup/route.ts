import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const firstName = body?.firstName?.toString().trim();
    const lastName = body?.lastName?.toString().trim();
    const email = body?.email?.toString().trim().toLowerCase();
    const password = body?.password?.toString();

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const users = db.collection("users");

    const existing = await users.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "Email is already registered." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const name = `${firstName} ${lastName}`.trim();

    await users.insertOne({
      name,
      email,
      passwordHash,
      credits: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error && error.message.toLowerCase().includes("authentication failed")
        ? "MongoDB authentication failed. Please verify your MongoDB username/password in .env connection string."
        : "Failed to create account.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
