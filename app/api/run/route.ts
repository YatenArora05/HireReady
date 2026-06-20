import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

// ─── Judge0 language IDs ─────────────────────────────────────────────────────
const LANG_ID: Record<string, number> = {
  javascript: 63,
  python3:    71,
  java:       62,
  cpp:        54,
};

// ─── Wrapper code builders ───────────────────────────────────────────────────
// Each builder injects the user's solution then calls it with each test input
// and prints JSON.stringify of the result, one line per test case.

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
    const __fn = Object.values(this || {}).find(v => typeof v === 'function')
      || eval(Object.getOwnPropertyNames(globalThis).find(k => typeof globalThis[k] === 'function' && k !== 'eval' && k !== 'Function') || '');
    // Extract the solution function name from the code
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

import json, inspect

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

  if (lang === "java") {
    return `${userCode}

public class Main {
    public static void main(String[] args) {
        Solution sol = new Solution();
        // Java test execution requires manual setup; output placeholder
        System.out.println("Java execution not fully automated");
    }
}
`;
  }

  if (lang === "cpp") {
    return `#include <bits/stdc++.h>
using namespace std;

${userCode}

int main() {
    // C++ test execution requires manual setup; output placeholder
    cout << "C++ execution not fully automated" << endl;
    return 0;
}
`;
  }

  return userCode;
}

// ─── Submit to Judge0 and poll result ────────────────────────────────────────
type Judge0Result = {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
};

async function runOnJudge0(
  sourceCode: string,
  languageId: number
): Promise<Judge0Result> {
  const base = process.env.JUDGE0_API_URL ?? "https://judge0-ce.p.rapidapi.com";
  const apiKey = process.env.JUDGE0_API_KEY ?? "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
  };
  if (apiKey) headers["X-RapidAPI-Key"] = apiKey;

  // Create submission
  const createRes = await fetch(`${base}/submissions?base64_encoded=false&wait=false`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      source_code: sourceCode,
      language_id: languageId,
      stdin: "",
    }),
  });

  if (!createRes.ok) {
    const txt = await createRes.text();
    throw new Error(`Judge0 submission failed: ${createRes.status} ${txt}`);
  }

  const { token } = await createRes.json() as { token: string };

  // Poll up to 10 times with 1s delay
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const pollRes = await fetch(
      `${base}/submissions/${token}?base64_encoded=false&fields=stdout,stderr,compile_output,status,time,memory`,
      { headers }
    );
    if (!pollRes.ok) continue;
    const result = await pollRes.json() as Judge0Result;
    // Status 1 = In Queue, 2 = Processing
    if (result.status.id > 2) return result;
  }

  throw new Error("Judge0 execution timed out.");
}

// ─── Compare outputs ─────────────────────────────────────────────────────────
function normalizeOutput(s: string): string {
  try {
    // Re-serialize parsed JSON to normalize whitespace
    return JSON.stringify(JSON.parse(s.trim()));
  } catch {
    return s.trim();
  }
}

// ─── POST /api/run ────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      questionId: string;
      language: string;   // "javascript" | "python3" | "java" | "cpp"
      code: string;
    };

    const { questionId, language, code } = body;
    if (!questionId || !language || !code) {
      return NextResponse.json({ error: "questionId, language, and code are required." }, { status: 400 });
    }

    const langId = LANG_ID[language];
    if (!langId) {
      return NextResponse.json({ error: `Unsupported language: ${language}` }, { status: 400 });
    }

    // Fetch question from MongoDB
    const client = await clientPromise;
    const db = client.db();
    const question = await db.collection("questions").findOne({ _id: new ObjectId(questionId) });
    if (!question) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }

    const testCases = question.visibleTestCases as { input: string[]; expected: string }[];

    // Build wrapped code
    const wrappedCode = buildWrapper(language, code, testCases);

    // Run on Judge0
    const result = await runOnJudge0(wrappedCode, langId);

    // Handle compile error
    if (result.status.id === 6) {
      return NextResponse.json({
        error: "Compilation error",
        details: result.compile_output ?? result.stderr ?? "Unknown compile error",
        testResults: [],
      }, { status: 200 });
    }

    // Handle runtime error
    if (result.status.id === 11 || result.status.id === 12) {
      return NextResponse.json({
        error: "Runtime error",
        details: result.stderr ?? "Unknown runtime error",
        testResults: [],
      }, { status: 200 });
    }

    // Parse stdout lines
    const lines = (result.stdout ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

    // Compare with expected outputs
    const testResults = testCases.map((tc, i) => {
      const actual = lines[i] ?? "";
      const expected = tc.expected;
      // If expected is empty (we don't have it), just show the output
      if (!expected) {
        return {
          index: i + 1,
          input: tc.input.join(", "),
          expected: "N/A",
          actual,
          passed: actual.length > 0 && !actual.startsWith("ERROR"),
        };
      }
      return {
        index: i + 1,
        input: tc.input.join(", "),
        expected,
        actual,
        passed: normalizeOutput(actual) === normalizeOutput(expected),
      };
    });

    const passed = testResults.filter((r) => r.passed).length;

    return NextResponse.json({
      passed,
      total: testCases.length,
      runtime: result.time ? `${Math.round(parseFloat(result.time) * 1000)}ms` : "N/A",
      memory: result.memory ? `${(result.memory / 1024).toFixed(1)} MB` : "N/A",
      testResults,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
