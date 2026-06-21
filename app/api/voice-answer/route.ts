import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

type Evaluation = {
  clarity: number;
  structure: number;
  confidence: number;
  relevance: number;
  communication: number;
  overall: number;
  strengths: string[];
  improvements: string[];
  feedback: string;
};

async function evaluateAnswer(
  interviewType: string,
  question: string,
  answer: string
): Promise<Evaluation> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("GROQ_API_KEY is not set.");

  const prompt = `You are an expert interviewer evaluating a candidate's answer.
Interview Type: ${interviewType}
Question: ${question}
Candidate Answer: ${answer || "(No answer provided)"}

Evaluate the answer on the following 5 dimensions, each scored 0-10:
1. Clarity — how clearly the answer is communicated
2. Structure — logical flow and organisation
3. Confidence — assertiveness and certainty in the response
4. Relevance — how well the answer addresses the question
5. Communication — overall verbal communication quality

Return valid JSON only — no markdown, no extra text:
{
  "clarity": 0,
  "structure": 0,
  "confidence": 0,
  "relevance": 0,
  "communication": 0,
  "overall": 0,
  "strengths": [""],
  "improvements": [""],
  "feedback": ""
}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are a JSON-only responder. Return valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) throw new Error(`Groq API error: ${await res.text()}`);

  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const raw = (data.choices?.[0]?.message?.content ?? "")
    .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

  const start = raw.indexOf("{");
  const end   = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Groq returned invalid evaluation JSON.");

  const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<Evaluation>;

  return {
    clarity:       Math.min(10, Math.max(0, Number(parsed.clarity       ?? 5))),
    structure:     Math.min(10, Math.max(0, Number(parsed.structure     ?? 5))),
    confidence:    Math.min(10, Math.max(0, Number(parsed.confidence    ?? 5))),
    relevance:     Math.min(10, Math.max(0, Number(parsed.relevance     ?? 5))),
    communication: Math.min(10, Math.max(0, Number(parsed.communication ?? 5))),
    overall:       Math.min(10, Math.max(0, Number(parsed.overall       ?? 5))),
    strengths:     Array.isArray(parsed.strengths)    ? parsed.strengths.filter(Boolean)    : [],
    improvements:  Array.isArray(parsed.improvements) ? parsed.improvements.filter(Boolean) : [],
    feedback:      parsed.feedback?.toString().trim() ?? "",
  };
}

// ─── POST /api/voice-answer ───────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      sessionId:   string;
      questionId:  number;
      answer:      string;
    };

    const { sessionId, questionId, answer } = body;
    if (!sessionId || !questionId) {
      return NextResponse.json({ error: "sessionId and questionId are required." }, { status: 400 });
    }

    const client = await clientPromise;
    const db     = client.db();

    const sessionDoc = await db.collection("voice_interviews").findOne({
      _id: new ObjectId(sessionId),
    });

    if (!sessionDoc) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const questions = sessionDoc.questions as { questionId: number; question: string; answer: string; evaluation: unknown }[];
    const qEntry    = questions.find((q) => q.questionId === questionId);

    if (!qEntry) {
      return NextResponse.json({ error: "Question not found in session." }, { status: 404 });
    }

    // Evaluate the answer
    const evaluation = await evaluateAnswer(
      sessionDoc.interviewType as string,
      qEntry.question,
      answer
    );

    // Update MongoDB — save answer + evaluation for this question
    await db.collection("voice_interviews").updateOne(
      { _id: new ObjectId(sessionId), "questions.questionId": questionId },
      {
        $set: {
          "questions.$.answer":     answer,
          "questions.$.evaluation": evaluation,
          updatedAt:                new Date(),
        },
      }
    );

    return NextResponse.json({ ok: true, evaluation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to evaluate answer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
