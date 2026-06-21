import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

type FinalReport = {
  overallScore:   number;
  communication:  number;
  confidence:     number;
  technicalComm:  number;
  strengths:      string[];
  improvements:   string[];
  recommendation: string;
};

async function generateReport(
  interviewType: string,
  evaluations: Record<string, unknown>[]
): Promise<FinalReport> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("GROQ_API_KEY is not set.");

  const prompt = `You are an interview coach reviewing a complete ${interviewType} interview.
Below are evaluations from ${evaluations.length} interview questions:
${JSON.stringify(evaluations, null, 2)}

Generate a comprehensive final interview report.
Return valid JSON only — no markdown, no extra text:
{
  "overallScore":   0,
  "communication":  0,
  "confidence":     0,
  "technicalComm":  0,
  "strengths":      [""],
  "improvements":   [""],
  "recommendation": ""
}

Where:
- overallScore: 0-100 (aggregate score)
- communication: 0-100
- confidence: 0-100
- technicalComm: 0-100 (technical communication quality)
- strengths: top 3 strengths observed
- improvements: top 3 areas for improvement
- recommendation: one of "Strong Hire", "Likely to clear this round", "Borderline", "Not recommended"`;

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
  const raw  = (data.choices?.[0]?.message?.content ?? "")
    .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

  const start = raw.indexOf("{");
  const end   = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Groq returned invalid report JSON.");

  const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<FinalReport>;

  return {
    overallScore:   Math.min(100, Math.max(0, Number(parsed.overallScore  ?? 50))),
    communication:  Math.min(100, Math.max(0, Number(parsed.communication ?? 50))),
    confidence:     Math.min(100, Math.max(0, Number(parsed.confidence    ?? 50))),
    technicalComm:  Math.min(100, Math.max(0, Number(parsed.technicalComm ?? 50))),
    strengths:      Array.isArray(parsed.strengths)    ? parsed.strengths.filter(Boolean).slice(0, 3)    : [],
    improvements:   Array.isArray(parsed.improvements) ? parsed.improvements.filter(Boolean).slice(0, 3) : [],
    recommendation: parsed.recommendation?.toString().trim() ?? "Borderline",
  };
}

// ─── POST /api/voice-report ───────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json() as { sessionId: string };
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    const client = await clientPromise;
    const db     = client.db();

    const sessionDoc = await db.collection("voice_interviews").findOne({
      _id: new ObjectId(sessionId),
    });

    if (!sessionDoc) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const questions = sessionDoc.questions as { question: string; answer: string; evaluation: Record<string, unknown> | null }[];

    // Gather all evaluations that exist
    const evaluations = questions
      .filter((q) => q.evaluation !== null)
      .map((q) => ({
        question:   q.question,
        answer:     q.answer,
        evaluation: q.evaluation,
      }));

    if (evaluations.length === 0) {
      return NextResponse.json({ error: "No answered questions found." }, { status: 400 });
    }

    const report = await generateReport(sessionDoc.interviewType as string, evaluations);

    // Save final report + mark session complete
    await db.collection("voice_interviews").updateOne(
      { _id: new ObjectId(sessionId) },
      {
        $set: {
          finalReport: report,
          status:      "completed",
          updatedAt:   new Date(),
        },
      }
    );

    return NextResponse.json({ ok: true, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate report.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
