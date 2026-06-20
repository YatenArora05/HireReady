import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export const dynamic = "force-dynamic";

// ─── Topic mapping ────────────────────────────────────────────────────────────
const INTERVIEW_MAPPING: Record<string, Record<string, string[]>> = {
  technical: {
    beginner:     ["Arrays", "Strings", "DBMS Basics", "OS Basics"],
    intermediate: ["Trees", "Hash Maps", "REST APIs", "DBMS"],
    advanced:     ["Graphs", "Dynamic Programming", "Microservices", "Distributed Systems"],
    expert:       ["System Design", "Kafka", "Cloud Architecture", "Kubernetes"],
  },
  behavioral: {
    beginner:     ["Teamwork", "Communication"],
    intermediate: ["Conflict Resolution", "Problem Solving"],
    advanced:     ["Leadership", "Ownership"],
    expert:       ["Strategic Thinking", "Mentorship"],
  },
  hr: {
    beginner:     ["Introduction", "Strengths", "Weaknesses"],
    intermediate: ["Career Goals", "Motivation"],
    advanced:     ["Company Fit", "Work Style"],
    expert:       ["Leadership Philosophy", "Long-Term Vision"],
  },
};

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner:     "beginner (entry-level)",
  intermediate: "intermediate (mid-level)",
  advanced:     "advanced (senior-level)",
  expert:       "expert (staff/principal-level)",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type MCQQuestion = {
  id: number;
  text: string;
  tag: string;
  options: string[];
  answer: number;  // 0-indexed correct option
};

// ─── Build Groq prompt ────────────────────────────────────────────────────────
function buildPrompt(
  interviewType: string,
  difficulty: string,
  experience: string,
  topics: string[]
): string {
  const diffLabel = DIFFICULTY_LABEL[difficulty] ?? difficulty;
  const topicsStr = topics.join(", ");

  return `You are an expert technical interviewer. Generate exactly 15 multiple choice questions for a Software Engineer interview.

Interview Type: ${interviewType}
Difficulty: ${diffLabel}
Experience Level: ${experience}
Topics to cover: ${topicsStr}

Rules:
- Each question must have exactly 4 options (A, B, C, D)
- Only ONE option is correct
- Questions must be appropriate for the difficulty level and experience
- Spread questions across the given topics
- For technical interviews, focus on code/concept questions
- For behavioral/HR, focus on situational questions

Return ONLY a valid JSON array with exactly 15 objects. Each object:
{
  "id": <number 1-15>,
  "text": "<question text>",
  "tag": "<topic name>",
  "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
  "answer": <0-indexed correct option, 0 to 3>
}

No explanation, no markdown, no code fences. Just the raw JSON array.`;
}

// ─── Call Groq ────────────────────────────────────────────────────────────────
async function generateWithGroq(prompt: string): Promise<MCQQuestion[]> {
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
        {
          role: "system",
          content: "You are a JSON-only responder. Always return valid JSON arrays with no markdown or extra text.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error: ${err}`);
  }

  const data = await res.json() as {
    choices?: { message?: { content?: string } }[];
  };

  const raw = data.choices?.[0]?.message?.content ?? "";

  // Strip any accidental markdown fences
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Find the JSON array
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("Groq did not return a valid JSON array.");

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as MCQQuestion[];

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Groq returned an empty or invalid question list.");
  }

  // Ensure exactly 15 and validate shape
  const valid = parsed
    .filter(
      (q) =>
        typeof q.text === "string" &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        typeof q.answer === "number" &&
        q.answer >= 0 &&
        q.answer <= 3
    )
    .slice(0, 15);

  if (valid.length < 5) throw new Error("Not enough valid questions generated. Please retry.");

  // Re-index ids
  return valid.map((q, i) => ({ ...q, id: i + 1 }));
}

// ─── POST /api/mcq-generate ───────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId  = session?.user?.id ?? null;

    const body = await req.json() as {
      interviewType?: string;
      difficulty?: string;
      experience?: string;
    };

    const interviewType = (body.interviewType ?? "technical").toLowerCase();
    const difficulty    = (body.difficulty    ?? "intermediate").toLowerCase();
    const experience    = body.experience     ?? "1 year";

    // Resolve topics
    const typeMap   = INTERVIEW_MAPPING[interviewType] ?? INTERVIEW_MAPPING.technical;
    const topics    = typeMap[difficulty] ?? typeMap.intermediate ?? [];

    const client = await clientPromise;
    const db     = client.db();

    // ── Deduct 10 credits if user is logged in ────────────────────────────
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
    }

    // Generate questions via Groq
    const prompt    = buildPrompt(interviewType, difficulty, experience, topics);
    const questions = await generateWithGroq(prompt);

    // Save session to MongoDB
    const ins = await db.collection("mcq_sessions").insertOne({
      userId:      userId ? new ObjectId(userId) : null,
      interviewType,
      difficulty,
      experience,
      topics,
      questions,
      createdAt: new Date(),
    });

    return NextResponse.json({
      sessionId:        ins.insertedId.toHexString(),
      questions:        questions.map(({ answer: _a, ...q }) => q),
      total:            questions.length,
      topics,
      remainingCredits,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate questions.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
