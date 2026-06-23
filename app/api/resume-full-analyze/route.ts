import { NextResponse } from "next/server";
import { createRequire } from "module";
import mammoth from "mammoth";

export const dynamic = "force-dynamic";
const require = createRequire(import.meta.url);

// ─── Extract text ─────────────────────────────────────────────────────────────
async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buf  = Buffer.from(await file.arrayBuffer());
  if (name.endsWith(".pdf")) {
    const pdfParse = require("pdf-parse") as (b: Buffer) => Promise<{ text?: string }>;
    return (await pdfParse(buf)).text ?? "";
  }
  if (name.endsWith(".docx") || name.endsWith(".doc")) {
    return (await mammoth.extractRawText({ buffer: buf })).value ?? "";
  }
  return file.text();
}

// ─── Sanitize JSON ────────────────────────────────────────────────────────────
function extractJson(raw: string): string {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error("AI did not return valid JSON.");
  return cleaned.slice(s, e + 1);
}

// ─── Call Groq ────────────────────────────────────────────────────────────────
async function callGroq(prompt: string, resumeText: string): Promise<unknown> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set.");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are a JSON-only responder. Return valid JSON only, no markdown." },
        { role: "user", content: `${prompt}\n\nResume text:\n${resumeText.slice(0, 28000)}` },
      ],
      temperature: 0.4,
      max_tokens: 3000,
    }),
  });
  if (!res.ok) throw new Error(`Groq error: ${await res.text()}`);
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content ?? "";
  return JSON.parse(extractJson(raw));
}

// ─── POST /api/resume-full-analyze ───────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("resume");
    if (!(file instanceof File)) return NextResponse.json({ error: "Resume file required." }, { status: 400 });

    const resumeText = (await extractText(file)).trim();
    if (!resumeText) return NextResponse.json({ error: "Could not extract text from resume." }, { status: 400 });

    const prompt = `You are an expert resume analyst and career coach. Analyze the following resume thoroughly.

Return ONLY this exact JSON structure (no extra text, no markdown):
{
  "overallScore": <0-100>,
  "atsScore": <0-100>,
  "technicalStrength": <0-100>,
  "projectQuality": <0-100>,
  "formatting": <0-100>,
  "skillCategories": [
    { "label": "Languages", "skills": [...], "missing": [...] },
    { "label": "Frontend", "skills": [...], "missing": [...] },
    { "label": "Backend", "skills": [...], "missing": [...] },
    { "label": "Database", "skills": [...], "missing": [...] },
    { "label": "Tools & DevOps", "skills": [...], "missing": [...] }
  ],
  "atsChecks": {
    "pass": ["Proper section headings found", "Contact information present", ...],
    "warn": ["No GitHub link detected", ...]
  },
  "projectsFound": <number>,
  "projectComplexity": "Low|Medium|High",
  "strongestProject": "<project name>",
  "projects": [
    {
      "name": "<project name>",
      "technologies": [...],
      "strengths": [...],
      "suggestions": [...],
      "impactScore": <1-10 float>
    }
  ],
  "strengths": ["<strength 1>", ...],
  "improvements": ["<improvement 1>", ...],
  "roleMatches": [
    { "role": "Frontend Developer", "match": <0-100> },
    { "role": "Software Engineer", "match": <0-100> },
    { "role": "Full Stack Developer", "match": <0-100> },
    { "role": "Backend Developer", "match": <0-100> },
    { "role": "Data Analyst", "match": <0-100> }
  ],
  "interviewReadiness": <0-100>
}

Scoring guidelines:
- overallScore: weighted average of all metrics
- atsScore: how well formatted for ATS scanners (headings, contact info, keywords)
- technicalStrength: depth and breadth of technical skills
- projectQuality: complexity, impact, and variety of projects
- formatting: clarity, structure, and professional presentation
- roleMatches: infer from skills and experience what roles they're best suited for
- interviewReadiness: how ready they appear for a technical interview`;

    const analysis = await callGroq(prompt, resumeText);
    return NextResponse.json(analysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
