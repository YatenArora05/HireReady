import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export const dynamic = "force-dynamic";

// ─── Prompt builders ──────────────────────────────────────────────────────────
function buildPrompt(interviewType: string, difficulty: string, experience: string): string {
  const type = interviewType.toLowerCase();

  if (type === "technical") {
    return `You are a senior technical recruiter conducting a Software Engineer interview.
Generate exactly 5 Technical Interview questions.
Difficulty: ${difficulty}
Experience: ${experience}
Focus on: DSA, DBMS, Operating Systems, Computer Networks, System Design.
Questions should be realistic and suitable for a Software Engineer with ${experience} experience.
Questions must not repeat.
Return valid JSON only — no markdown, no explanation.
Format:
{
  "questions": [
    { "id": 1, "question": "..." },
    { "id": 2, "question": "..." },
    { "id": 3, "question": "..." },
    { "id": 4, "question": "..." },
    { "id": 5, "question": "..." }
  ]
}`;
  }

  if (type === "hr") {
    return `You are an experienced HR recruiter conducting a screening interview.
Generate exactly 5 HR Screening interview questions.
Difficulty: ${difficulty}
Experience: ${experience}
Focus on: Career Goals, Motivation, Strengths, Weaknesses, Company Fit.
Questions should be realistic for a Software Engineer with ${experience} experience.
Questions must not repeat.
Return valid JSON only — no markdown, no explanation.
Format:
{
  "questions": [
    { "id": 1, "question": "..." },
    { "id": 2, "question": "..." },
    { "id": 3, "question": "..." },
    { "id": 4, "question": "..." },
    { "id": 5, "question": "..." }
  ]
}`;
  }

  // Default: behavioral
  return `You are a senior technical recruiter conducting a behavioral interview.
Generate exactly 5 Behavioral interview questions.
Difficulty: ${difficulty}
Experience: ${experience}
Questions should be realistic, situational, and suitable for a Software Engineer with ${experience} experience.
Questions must not repeat. Use STAR-method style prompts.
Return valid JSON only — no markdown, no explanation.
Format:
{
  "questions": [
    { "id": 1, "question": "..." },
    { "id": 2, "question": "..." },
    { "id": 3, "question": "..." },
    { "id": 4, "question": "..." },
    { "id": 5, "question": "..." }
  ]
}`;
}

// ─── Call Groq ────────────────────────────────────────────────────────────────
async function generateQuestions(prompt: string): Promise<{ id: number; question: string }[]> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("GROQ_API_KEY is not set.");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are a JSON-only responder. Return valid JSON only, no markdown, no explanation." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) throw new Error(`Groq API error: ${await res.text()}`);

  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const raw = (data.choices?.[0]?.message?.content ?? "")
    .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Groq did not return valid JSON.");

  const parsed = JSON.parse(raw.slice(start, end + 1)) as { questions?: { id: number; question: string }[] };
  const questions = parsed.questions ?? [];

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("Groq returned no questions.");
  }

  return questions.slice(0, 5).map((q, i) => ({ id: i + 1, question: q.question?.trim() ?? "" }));
}

// ─── POST /api/voice-generate ─────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId  = session?.user?.id ?? null;

    const body = await req.json() as {
      interviewType?: string;
      difficulty?: string;
      experience?: string;
    };

    const interviewType = body.interviewType ?? "behavioral";
    const difficulty    = body.difficulty    ?? "intermediate";
    const experience    = body.experience    ?? "1 year";

    const prompt    = buildPrompt(interviewType, difficulty, experience);
    const generated = await generateQuestions(prompt);

    const questions = generated.map((q) => ({
      questionId:  q.id,
      question:    q.question,
      answer:      "",
      evaluation:  null as null | Record<string, unknown>,
    }));

    const client = await clientPromise;
    const db     = client.db();

    const ins = await db.collection("voice_interviews").insertOne({
      userId:        userId ? new ObjectId(userId) : null,
      interviewType,
      difficulty,
      experience,
      questions,
      status:        "in-progress",
      finalReport:   null,
      createdAt:     new Date(),
      updatedAt:     new Date(),
    });

    return NextResponse.json({
      sessionId: ins.insertedId.toHexString(),
      questions: generated,
      interviewType,
      difficulty,
      experience,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate questions.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
