import { NextResponse } from "next/server";
import mammoth from "mammoth";

type ResumeExtract = {
  role: string;
  experience: string;
  projects: string[];
  skills: string[];
};

function sanitizeJsonText(text: string): string {
  return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

function extractFirstJsonObject(text: string): string {
  const cleaned = sanitizeJsonText(text);
  const start = cleaned.indexOf("{");
  if (start === -1) {
    throw new Error("Model did not return JSON.");
  }

  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let i = start; i < cleaned.length; i += 1) {
    const ch = cleaned[i];

    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (ch === "\\") {
        escaping = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return cleaned.slice(start, i + 1);
      }
    }
  }

  throw new Error("Incomplete JSON returned by model.");
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildMetrics(extract: ResumeExtract) {
  const skillsCount = extract.skills.length;
  const projectCount = extract.projects.length;
  const hasRole = extract.role.trim().length > 0;
  const hasExperience = extract.experience.trim().length > 0;

  const score = clampPercent(
    45 +
      Math.min(skillsCount, 10) * 4 +
      Math.min(projectCount, 5) * 3 +
      (hasRole ? 8 : 0) +
      (hasExperience ? 7 : 0)
  );

  return {
    score,
    tags: extract.skills.slice(0, 8),
  };
}

async function extractResumeText(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (fileName.endsWith(".pdf")) {
    // Import parser from lib path to avoid package-entry debug side effects.
    const pdfParseModule = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse = (pdfParseModule.default ??
      pdfParseModule) as (buffer: Buffer) => Promise<{ text?: string }>;
    const result = await pdfParse(buffer);
    return result.text ?? "";
  }

  if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? "";
  }

  return file.text();
}

export async function POST(req: Request) {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      return NextResponse.json(
        { error: "Missing GROQ_API_KEY in environment variables." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const fileEntry = formData.get("resume");

    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: "Resume file is required." }, { status: 400 });
    }

    const resumeText = (await extractResumeText(fileEntry)).trim();
    if (!resumeText) {
      return NextResponse.json({ error: "Could not extract text from resume." }, { status: 400 });
    }

    const messages = [
      {
        role: "system",
        content: `
Extract structured data from resume.

Return strictly JSON:

{
  "role": "string",
  "experience": "string",
  "projects": ["project1", "project2"],
  "skills": ["skill1", "skill2"]
}
`,
      },
      {
        role: "user",
        content: resumeText.slice(0, 30000),
      },
    ];

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!groqResponse.ok) {
      const errorBody = await groqResponse.text();
      return NextResponse.json(
        { error: `Groq request failed: ${errorBody}` },
        { status: 502 }
      );
    }

    const result = await groqResponse.json();
    const rawText = result?.choices?.[0]?.message?.content ?? "";

    const parsed = JSON.parse(extractFirstJsonObject(rawText)) as Partial<ResumeExtract>;
    const extract: ResumeExtract = {
      role: parsed.role?.toString().trim() ?? "",
      experience: parsed.experience?.toString().trim() ?? "",
      projects: Array.isArray(parsed.projects)
        ? parsed.projects.map((item) => item?.toString().trim()).filter(Boolean)
        : [],
      skills: Array.isArray(parsed.skills)
        ? parsed.skills.map((item) => item?.toString().trim()).filter(Boolean)
        : [],
    };

    const analysis = buildMetrics(extract);

    return NextResponse.json({ extract, analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze resume.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
