import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export const dynamic = "force-dynamic";

// ─── Experience → topic mapping ─────────────────────────────────────────────
const EXPERIENCE_TOPICS: Record<string, string[]> = {
  fresher:  ["Array", "String", "Hash Table", "Linked List", "Stack", "Queue"],
  junior:   ["Array", "String", "Hash Table", "Linked List", "Stack", "Queue", "Binary Search", "Tree", "Heap"],
  midLevel: ["Tree", "Graph", "Heap", "Greedy", "Backtracking", "Sliding Window", "Dynamic Programming"],
  senior:   ["Graph", "Dynamic Programming", "Trie", "Union Find", "Segment Tree", "Topological Sort", "Shortest Path"],
};

const DIFFICULTY_MAP: Record<string, string[]> = {
  beginner:     ["EASY"],
  intermediate: ["MEDIUM"],
  advanced:     ["MEDIUM", "HARD"],
  expert:       ["HARD"],
};

function parseYears(experience: string): number {
  const match = experience.match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

function resolveLevel(years: number): string {
  if (years < 1) return "fresher";
  if (years < 3) return "junior";
  if (years < 5) return "midLevel";
  return "senior";
}

// ─── Types ───────────────────────────────────────────────────────────────────
type LCProblemDoc = {
  _id: ObjectId;
  title: string;
  titleSlug: string;
  difficulty: string;
  topicTags: string[];
};

type LCQuestionDetail = {
  title: string;
  difficulty: string;
  content: string;
  exampleTestcases: string;
  topicTags: { name: string }[];
  hints: string[];
  codeSnippets: { lang: string; langSlug: string; code: string }[];
};

// ─── Fetch full detail from LeetCode for a single slug ───────────────────────
async function fetchQuestionDetail(titleSlug: string): Promise<LCQuestionDetail> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Referer": "https://leetcode.com",
        "User-Agent": "Mozilla/5.0 (compatible; HireReady/1.0)",
        "x-csrftoken": "dummy",
      },
      body: JSON.stringify({
        query: `query questionContent($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            title
            difficulty
            content
            exampleTestcases
            topicTags { name }
            hints
            codeSnippets { lang langSlug code }
          }
        }`,
        variables: { titleSlug },
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`LeetCode responded with ${res.status}`);

    const data = await res.json() as {
      data?: { question: LCQuestionDetail };
      errors?: { message: string }[];
    };

    if (data.errors?.length) throw new Error(data.errors[0].message);
    if (!data.data?.question) throw new Error("Question not found.");

    return data.data.question;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Parse exampleTestcases into test case array ─────────────────────────────
function guessArgCount(codeSnippets: { langSlug: string; code: string }[]): number {
  const js = codeSnippets.find((s) => s.langSlug === "javascript");
  if (!js) return 1;
  const match = js.code.match(/var\s+\w+\s*=\s*function\s*\(([^)]*)\)|function\s+\w+\s*\(([^)]*)\)/);
  if (!match) return 1;
  const params = (match[1] ?? match[2] ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  return Math.max(1, params.length);
}

function parseTestCases(
  raw: string,
  argsPerCase: number
): { input: string[]; expected: string }[] {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const cases: { input: string[]; expected: string }[] = [];
  for (let i = 0; i + argsPerCase <= lines.length; i += argsPerCase) {
    cases.push({ input: lines.slice(i, i + argsPerCase), expected: "" });
  }
  return cases;
}

// ─── Pick a random problem from MongoDB using $sample ────────────────────────
async function pickFromDb(
  difficulties: string[],
  topics: string[]
): Promise<LCProblemDoc | null> {
  const client = await clientPromise;
  const db = client.db();
  const col = db.collection<LCProblemDoc>("leetcode_problems");

  // Try: match both difficulty and topic
  let results = await col.aggregate<LCProblemDoc>([
    { $match: { difficulty: { $in: difficulties }, topicTags: { $in: topics } } },
    { $sample: { size: 1 } },
  ]).toArray();

  if (results.length > 0) return results[0];

  // Fallback 1: just difficulty
  results = await col.aggregate<LCProblemDoc>([
    { $match: { difficulty: { $in: difficulties } } },
    { $sample: { size: 1 } },
  ]).toArray();

  if (results.length > 0) return results[0];

  // Fallback 2: anything in the collection
  results = await col.aggregate<LCProblemDoc>([
    { $sample: { size: 1 } },
  ]).toArray();

  return results[0] ?? null;
}

// ─── GET /api/leetcode-question ───────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const session  = await getServerSession(authOptions);
    const userId   = session?.user?.id ?? null;

    const { searchParams } = new URL(req.url);
    const experience = searchParams.get("experience") ?? "1 year";
    const difficulty  = searchParams.get("difficulty")  ?? "intermediate";

    const years        = parseYears(experience);
    const level        = resolveLevel(years);
    const topics       = EXPERIENCE_TOPICS[level];
    const difficulties = DIFFICULTY_MAP[difficulty] ?? ["MEDIUM"];

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

    // Check if the problem cache exists in MongoDB
    const cacheCount = await db.collection("leetcode_problems").countDocuments();

    if (cacheCount === 0) {
      // Cache is empty — tell the frontend to trigger a sync first
      return NextResponse.json(
        {
          error: "Problem cache is empty. Please sync the problem list first.",
          needsSync: true,
        },
        { status: 503 }
      );
    }

    // Pick a random matching problem from MongoDB (instant)
    const picked = await pickFromDb(difficulties, topics);
    if (!picked) {
      return NextResponse.json({ error: "No matching problems found in cache." }, { status: 404 });
    }

    // Fetch full content from LeetCode (~2-3s, single call)
    const detail = await fetchQuestionDetail(picked.titleSlug);

    // Build starter code map
    const starterCode: Record<string, string> = {};
    for (const s of detail.codeSnippets ?? []) {
      starterCode[s.langSlug] = s.code;
    }

    // Parse visible test cases
    const argCount = guessArgCount(detail.codeSnippets ?? []);
    const visibleTestCases = parseTestCases(detail.exampleTestcases ?? "", argCount);
    const hiddenTestCases  = visibleTestCases.map((tc) => ({ ...tc }));

    // Upsert full question into questions collection
    const questionsCol = db.collection("questions");
    const existing = await questionsCol.findOne({ slug: picked.titleSlug });
    let questionId: string;

    if (existing) {
      questionId = (existing._id as ObjectId).toHexString();
    } else {
      const ins = await questionsCol.insertOne({
        title:            detail.title,
        slug:             picked.titleSlug,
        difficulty:       detail.difficulty,
        description:      detail.content,
        starterCode,
        visibleTestCases,
        hiddenTestCases,
        topicTags:        detail.topicTags.map((t) => t.name),
        hints:            detail.hints ?? [],
        codeSnippets:     detail.codeSnippets ?? [],
        createdAt:        new Date(),
      });
      questionId = ins.insertedId.toHexString();
    }

    return NextResponse.json({
      questionId,
      title:            detail.title,
      titleSlug:        picked.titleSlug,
      difficulty:       detail.difficulty,
      content:          detail.content,
      exampleTestcases: detail.exampleTestcases,
      topicTags:        detail.topicTags.map((t) => t.name),
      hints:            detail.hints ?? [],
      codeSnippets:     detail.codeSnippets ?? [],
      visibleTestCases,
      level,
      topics,
      remainingCredits,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch question.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
