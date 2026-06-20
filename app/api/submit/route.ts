import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export const dynamic = "force-dynamic";

const LANG_ID: Record<string, number> = {
  javascript: 63,
  python3:    71,
  java:       62,
  cpp:        54,
};

function buildWrapper(
  lang: string,
  userCode: string,
  testCases: { input: string[] }[]
): string {
  const inputsJson = JSON.stringify(testCases.map((tc) => tc.input));

  if (lang === "javascript") {
    return `${userCode}

const __tests = ${inputsJson};
for (const __args of __tests) {
  try {
    const __match = \`${userCode.replace(/`/g, "\\`")}\`.match(/var (\\w+) = function|function (\\w+)\\s*\\(/);
    const __fnName = __match ? (__match[1] || __match[2]) : null;
    if (!__fnName) { console.log('ERROR: could not find function'); continue; }
    const __result = eval(__fnName + '(...__args)');
    console.log(JSON.stringify(__result));
  } catch(e) {
    console.log('ERROR: ' + e.message);
  }
}
`;
  }

  if (lang === "python3") {
    const inputsStr = testCases
      .map((tc) => `[${tc.input.join(", ")}]`)
      .join(",\n    ");
    return `${userCode}

import json

_sol = Solution()
_method = [m for m in dir(_sol) if not m.startswith('_')][0]
_fn = getattr(_sol, _method)
_tests = [
    ${inputsStr}
]
for _args in _tests:
    try:
        _result = _fn(*_args)
        print(json.dumps(_result))
    except Exception as e:
        print('ERROR: ' + str(e))
`;
  }

  return userCode;
}

type Judge0Result = {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
};

async function runOnJudge0(sourceCode: string, languageId: number): Promise<Judge0Result> {
  const base = process.env.JUDGE0_API_URL ?? "https://judge0-ce.p.rapidapi.com";
  const apiKey = process.env.JUDGE0_API_KEY ?? "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
  };
  if (apiKey) headers["X-RapidAPI-Key"] = apiKey;

  const createRes = await fetch(`${base}/submissions?base64_encoded=false&wait=false`, {
    method: "POST",
    headers,
    body: JSON.stringify({ source_code: sourceCode, language_id: languageId, stdin: "" }),
  });

  if (!createRes.ok) throw new Error(`Judge0 submission failed: ${createRes.status}`);
  const { token } = await createRes.json() as { token: string };

  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const pollRes = await fetch(
      `${base}/submissions/${token}?base64_encoded=false&fields=stdout,stderr,compile_output,status,time,memory`,
      { headers }
    );
    if (!pollRes.ok) continue;
    const result = await pollRes.json() as Judge0Result;
    if (result.status.id > 2) return result;
  }
  throw new Error("Judge0 execution timed out.");
}

function normalizeOutput(s: string): string {
  try { return JSON.stringify(JSON.parse(s.trim())); } catch { return s.trim(); }
}

// ─── Groq AI feedback ────────────────────────────────────────────────────────
async function getAiFeedback(
  title: string,
  code: string,
  language: string,
  passed: number,
  total: number
): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return "";

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "You are a senior software engineer giving concise interview code review feedback. Be specific, constructive, and brief (3-4 sentences max).",
          },
          {
            role: "user",
            content: `Question: ${title}\nLanguage: ${language}\nPassed: ${passed}/${total}\n\nCode:\n${code}\n\nGive interview feedback on this solution.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 256,
      }),
    });
    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  } catch {
    return "";
  }
}

// ─── POST /api/submit ────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    const body = await req.json() as {
      questionId: string;
      language: string;
      code: string;
    };

    const { questionId, language, code } = body;
    if (!questionId || !language || !code) {
      return NextResponse.json({ error: "questionId, language, and code are required." }, { status: 400 });
    }

    const langId = LANG_ID[language];
    if (!langId) return NextResponse.json({ error: `Unsupported language: ${language}` }, { status: 400 });

    const client = await clientPromise;
    const db = client.db();
    const question = await db.collection("questions").findOne({ _id: new ObjectId(questionId) });
    if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });

    // Use hidden test cases for submit
    const testCases = question.hiddenTestCases as { input: string[]; expected: string }[];

    const wrappedCode = buildWrapper(language, code, testCases);
    const result = await runOnJudge0(wrappedCode, langId);

    // Compile error
    if (result.status.id === 6) {
      return NextResponse.json({
        verdict: "Compilation Error",
        details: result.compile_output ?? result.stderr ?? "",
        passed: 0, total: testCases.length,
        testResults: [],
        aiFeedback: "",
      });
    }

    const lines = (result.stdout ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

    const testResults = testCases.map((tc, i) => {
      const actual = lines[i] ?? "";
      const expected = tc.expected ?? "";
      const passed = !expected
        ? actual.length > 0 && !actual.startsWith("ERROR")
        : normalizeOutput(actual) === normalizeOutput(expected);
      return { index: i + 1, input: tc.input.join(", "), expected, actual, passed };
    });

    const passed = testResults.filter((r) => r.passed).length;
    const total = testCases.length;
    const verdict = passed === total ? "Accepted" : `Wrong Answer`;
    const runtime = result.time ? `${Math.round(parseFloat(result.time) * 1000)}ms` : "N/A";
    const memory = result.memory ? `${(result.memory / 1024).toFixed(1)} MB` : "N/A";

    // AI feedback
    const aiFeedback = await getAiFeedback(
      question.title as string, code, language, passed, total
    );

    // Save submission
    await db.collection("submissions").insertOne({
      userId:       userId ? new ObjectId(userId) : null,
      questionId:   new ObjectId(questionId),
      questionTitle: question.title,
      language,
      code,
      passedTests:  passed,
      totalTests:   total,
      runtime,
      memory,
      verdict,
      aiFeedback,
      submittedAt:  new Date(),
    });

    return NextResponse.json({
      verdict,
      passed,
      total,
      runtime,
      memory,
      testResults,
      aiFeedback,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Submission failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
