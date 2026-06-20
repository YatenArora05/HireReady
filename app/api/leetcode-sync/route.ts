import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

// ─── Types ───────────────────────────────────────────────────────────────────
type LCProblem = {
  title: string;
  titleSlug: string;
  difficulty: string;      // "EASY" | "MEDIUM" | "HARD"
  paidOnly: boolean;
  topicTags: { name: string; slug: string }[];
};

// ─── Fetch all free problems from LeetCode via GraphQL ───────────────────────
// Paginates through all problems in batches of 100
async function fetchAllProblems(): Promise<LCProblem[]> {
  const allProblems: LCProblem[] = [];
  const batchSize = 100;
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch("https://leetcode.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Referer": "https://leetcode.com",
          "User-Agent": "Mozilla/5.0 (compatible; HireReady/1.0)",
        },
        body: JSON.stringify({
          query: `query {
            problemsetQuestionListV2(
              categorySlug: ""
              limit: ${batchSize}
              skip: ${skip}
              filters: { filterCombineType: ALL }
            ) {
              questions {
                title
                titleSlug
                difficulty
                paidOnly
                topicTags { name slug }
              }
            }
          }`,
        }),
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) throw new Error(`LeetCode list request failed: ${res.status}`);

      const data = await res.json() as {
        data?: { problemsetQuestionListV2?: { questions: LCProblem[] } };
        errors?: { message: string }[];
      };

      if (data.errors?.length) throw new Error(data.errors[0].message);

      const batch = data.data?.problemsetQuestionListV2?.questions ?? [];
      allProblems.push(...batch);

      // If we got fewer than requested, we've reached the end
      hasMore = batch.length === batchSize;
      skip += batchSize;

      // Safety cap — LeetCode has ~3000 free problems
      if (skip > 3000) break;
    } catch (err) {
      clearTimeout(timer);
      // Stop pagination on error but return what we have so far
      console.error(`Pagination stopped at skip=${skip}:`, err);
      break;
    }
  }

  return allProblems;
}

// ─── POST /api/leetcode-sync ─────────────────────────────────────────────────
// Call this once to populate / refresh the problems cache in MongoDB.
// Subsequent question fetches will read from this cache instantly.
export async function POST() {
  try {
    const problems = await fetchAllProblems();

    // Keep only free problems
    const free = problems.filter((p) => !p.paidOnly);

    if (free.length === 0) {
      return NextResponse.json({ error: "No problems fetched from LeetCode." }, { status: 502 });
    }

    const client = await clientPromise;
    const db = client.db();
    const col = db.collection("leetcode_problems");

    // Upsert each problem by titleSlug
    const ops = free.map((p) => ({
      updateOne: {
        filter: { titleSlug: p.titleSlug },
        update: {
          $set: {
            title:     p.title,
            titleSlug: p.titleSlug,
            difficulty: p.difficulty,
            topicTags: p.topicTags.map((t) => t.name),
            syncedAt:  new Date(),
          },
        },
        upsert: true,
      },
    }));

    const result = await col.bulkWrite(ops, { ordered: false });

    // Create indexes for fast filtering
    await col.createIndex({ difficulty: 1 });
    await col.createIndex({ topicTags: 1 });
    await col.createIndex({ titleSlug: 1 }, { unique: true });

    return NextResponse.json({
      message: "Sync complete",
      total: free.length,
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── GET /api/leetcode-sync ──────────────────────────────────────────────────
// Returns the current cache stats
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const col = db.collection("leetcode_problems");

    const total = await col.countDocuments();
    const byDifficulty = await col.aggregate([
      { $group: { _id: "$difficulty", count: { $sum: 1 } } },
    ]).toArray();
    const lastSynced = await col.findOne({}, { sort: { syncedAt: -1 }, projection: { syncedAt: 1 } });

    return NextResponse.json({
      total,
      byDifficulty,
      lastSynced: lastSynced?.syncedAt ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get stats.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
