import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const userId = new ObjectId(session.user.id);
    const client = await clientPromise;
    const db = client.db();

    // ── Parallel fetch all user data ─────────────────────────────────────────
    const [
      user,
      voiceInterviews,
      codingSubmissions,
      mcqResults,
      resumeAnalyses,
    ] = await Promise.all([
      db.collection("users").findOne({ _id: userId }, { projection: { name: 1, credits: 1 } }),
      db.collection("voice_interviews").find({ userId }).sort({ createdAt: -1 }).toArray(),
      db.collection("submissions").find({ userId }).sort({ submittedAt: -1 }).toArray(),
      db.collection("mcq_results").find({ userId }).sort({ submittedAt: -1 }).toArray(),
      db.collection("resume_analyses").find({ userId }).sort({ createdAt: -1 }).toArray(),
    ]);

    // ── Stats ─────────────────────────────────────────────────────────────────
    const completedInterviews = voiceInterviews.filter(v => v.status === "completed");
    const interviewScores = completedInterviews
      .map(v => v.finalReport?.overallScore as number)
      .filter(s => typeof s === "number");
    const avgInterviewScore = interviewScores.length
      ? Math.round(interviewScores.reduce((a, b) => a + b, 0) / interviewScores.length)
      : 0;

    const codingAccuracies = codingSubmissions.map(s => {
      const total = s.totalTests as number;
      const passed = s.passedTests as number;
      return total > 0 ? Math.round((passed / total) * 100) : 0;
    });
    const avgCodingAccuracy = codingAccuracies.length
      ? Math.round(codingAccuracies.reduce((a, b) => a + b, 0) / codingAccuracies.length)
      : 0;

    const mcqPercentages = mcqResults.map(m => m.percentage as number).filter(p => typeof p === "number");
    const avgMcqScore = mcqPercentages.length
      ? Math.round(mcqPercentages.reduce((a, b) => a + b, 0) / mcqPercentages.length)
      : 0;

    const resumeScores = resumeAnalyses.map(r => r.overallScore as number).filter(s => typeof s === "number");
    const avgResumeScore = resumeScores.length
      ? Math.round(resumeScores.reduce((a, b) => a + b, 0) / resumeScores.length)
      : 0;

    // ── Recent activity ───────────────────────────────────────────────────────
    const recentActivity = [
      ...completedInterviews.slice(0, 5).map(v => ({
        type: "interview",
        label: `${v.interviewType} Interview`,
        score: v.finalReport?.overallScore ?? null,
        date: v.updatedAt ?? v.createdAt,
      })),
      ...codingSubmissions.slice(0, 5).map(s => ({
        type: "coding",
        label: s.questionTitle ?? "Coding Session",
        score: s.totalTests > 0 ? Math.round((s.passedTests / s.totalTests) * 100) : null,
        date: s.submittedAt,
      })),
      ...mcqResults.slice(0, 5).map(m => ({
        type: "mcq",
        label: `MCQ — ${m.interviewType ?? "Practice"}`,
        score: m.percentage ?? null,
        date: m.submittedAt,
      })),
      ...resumeAnalyses.slice(0, 3).map(r => ({
        type: "resume",
        label: r.fileName ?? "Resume Analysis",
        score: r.overallScore ?? null,
        date: r.createdAt,
      })),
    ]
      .filter(a => a.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    // ── Chart data ────────────────────────────────────────────────────────────
    const interviewChartData = completedInterviews.slice(0, 10).reverse().map((v, i) => ({
      label: `#${i + 1}`,
      score: v.finalReport?.overallScore ?? 0,
      date: v.updatedAt ?? v.createdAt,
    }));

    const codingChartData = codingSubmissions.slice(0, 10).reverse().map((s, i) => ({
      label: `#${i + 1}`,
      score: s.totalTests > 0 ? Math.round((s.passedTests / s.totalTests) * 100) : 0,
      date: s.submittedAt,
    }));

    const mcqChartData = mcqResults.slice(0, 10).reverse().map((m, i) => ({
      label: `#${i + 1}`,
      score: m.percentage ?? 0,
      date: m.submittedAt,
    }));

    // ── AI Insights (from latest interview report) ────────────────────────────
    const latestReport = completedInterviews[0]?.finalReport;
    const strengths: string[] = latestReport?.strengths ?? [];
    const improvements: string[] = latestReport?.improvements ?? [];

    return NextResponse.json({
      user: { name: user?.name ?? session.user.name, credits: user?.credits ?? 0 },
      stats: {
        totalInterviews:    completedInterviews.length,
        totalCodingSessions: codingSubmissions.length,
        totalMcqTests:      mcqResults.length,
        totalResumeAnalyses: resumeAnalyses.length,
      },
      performance: {
        avgInterviewScore,
        avgCodingAccuracy,
        avgMcqScore,
        avgResumeScore,
      },
      recentActivity,
      history: {
        interviews: completedInterviews.slice(0, 20).map(v => ({
          id:           v._id.toString(),
          type:         v.interviewType,
          difficulty:   v.difficulty,
          score:        v.finalReport?.overallScore ?? null,
          recommendation: v.finalReport?.recommendation ?? null,
          date:         v.updatedAt ?? v.createdAt,
          questionsCount: (v.questions as unknown[])?.length ?? 0,
        })),
        coding: codingSubmissions.slice(0, 20).map(s => ({
          id:           s._id.toString(),
          title:        s.questionTitle ?? "Coding Session",
          difficulty:   s.difficulty ?? "—",
          passed:       s.passedTests ?? 0,
          total:        s.totalTests ?? 0,
          runtime:      s.runtime ?? "—",
          verdict:      s.verdict ?? "—",
          date:         s.submittedAt,
        })),
        mcq: mcqResults.slice(0, 20).map(m => ({
          id:           m._id.toString(),
          topic:        m.interviewType ?? "Practice",
          difficulty:   m.difficulty ?? "—",
          correct:      m.correct ?? 0,
          total:        m.total ?? 0,
          percentage:   m.percentage ?? 0,
          grade:        m.grade ?? "—",
          date:         m.submittedAt,
        })),
        resumes: resumeAnalyses.slice(0, 10).map(r => ({
          id:           r._id.toString(),
          fileName:     r.fileName ?? "resume.pdf",
          overallScore: r.overallScore ?? 0,
          atsScore:     r.atsScore ?? 0,
          topRole:      r.roleMatches?.[0]?.role ?? "—",
          topRoleMatch: r.roleMatches?.[0]?.match ?? 0,
          date:         r.createdAt,
        })),
      },
      charts: { interviewChartData, codingChartData, mcqChartData },
      insights: { strengths, improvements },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to load progress.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
