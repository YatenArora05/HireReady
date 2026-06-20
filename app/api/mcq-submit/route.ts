import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export const dynamic = "force-dynamic";

type AnswerMap = Record<number, number>; // questionId (1-based) → selected option (0-indexed)

type MCQQuestion = {
  id: number;
  text: string;
  tag: string;
  options: string[];
  answer: number;
};

// ─── POST /api/mcq-submit ─────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId  = session?.user?.id ?? null;

    const body = await req.json() as {
      sessionId: string;
      answers: AnswerMap;   // { 1: 2, 2: 0, 3: 3, ... }
    };

    const { sessionId, answers } = body;
    if (!sessionId || !answers) {
      return NextResponse.json({ error: "sessionId and answers are required." }, { status: 400 });
    }

    const client = await clientPromise;
    const db     = client.db();

    // Fetch session with answers from MongoDB
    const mcqSession = await db.collection("mcq_sessions").findOne({
      _id: new ObjectId(sessionId),
    });

    if (!mcqSession) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const questions = mcqSession.questions as MCQQuestion[];

    // Score each question
    let correct  = 0;
    let wrong    = 0;
    let skipped  = 0;

    const results = questions.map((q) => {
      const selected = answers[q.id];
      const wasAnswered = selected !== undefined && selected !== null;

      if (!wasAnswered) {
        skipped++;
        return {
          id:            q.id,
          text:          q.text,
          tag:           q.tag,
          options:       q.options,
          correctAnswer: q.answer,
          selectedAnswer: null,
          status:        "skipped" as const,
        };
      }

      const isCorrect = selected === q.answer;
      if (isCorrect) correct++; else wrong++;

      return {
        id:             q.id,
        text:           q.text,
        tag:            q.tag,
        options:        q.options,
        correctAnswer:  q.answer,
        selectedAnswer: selected,
        status:         isCorrect ? ("correct" as const) : ("wrong" as const),
      };
    });

    const total      = questions.length;
    const percentage = Math.round((correct / total) * 100);
    const grade =
      percentage >= 90 ? "Excellent" :
      percentage >= 75 ? "Good" :
      percentage >= 60 ? "Average" :
      percentage >= 40 ? "Needs Improvement" :
      "Poor";

    // Save result
    await db.collection("mcq_results").insertOne({
      sessionId:   new ObjectId(sessionId),
      userId:      userId ? new ObjectId(userId) : null,
      interviewType: mcqSession.interviewType,
      difficulty:  mcqSession.difficulty,
      experience:  mcqSession.experience,
      correct,
      wrong,
      skipped,
      total,
      percentage,
      grade,
      answers,
      submittedAt: new Date(),
    });

    return NextResponse.json({
      correct,
      wrong,
      skipped,
      total,
      percentage,
      grade,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Submission failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
