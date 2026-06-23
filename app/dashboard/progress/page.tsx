"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ─────────────────────────────────────────────────────────────────────
type Stats = { totalInterviews: number; totalCodingSessions: number; totalMcqTests: number; totalResumeAnalyses: number };
type Performance = { avgInterviewScore: number; avgCodingAccuracy: number; avgMcqScore: number; avgResumeScore: number };
type Activity = { type: string; label: string; score: number | null; date: string };
type Interview = { id: string; type: string; difficulty: string; score: number | null; recommendation: string | null; date: string; questionsCount: number };
type CodingItem = { id: string; title: string; difficulty: string; passed: number; total: number; runtime: string; verdict: string; date: string };
type McqItem = { id: string; topic: string; difficulty: string; correct: number; total: number; percentage: number; grade: string; date: string };
type ResumeItem = { id: string; fileName: string; overallScore: number; atsScore: number; topRole: string; topRoleMatch: number; date: string };
type ChartPoint = { label: string; score: number; date: string };

type DashboardData = {
  user: { name: string; credits: number };
  stats: Stats;
  performance: Performance;
  recentActivity: Activity[];
  history: { interviews: Interview[]; coding: CodingItem[]; mcq: McqItem[]; resumes: ResumeItem[] };
  charts: { interviewChartData: ChartPoint[]; codingChartData: ChartPoint[]; mcqChartData: ChartPoint[] };
  insights: { strengths: string[]; improvements: string[] };
};


// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function scoreColor(v: number): string {
  return v >= 80 ? "rgba(100,220,130,0.9)" : v >= 60 ? "rgba(255,190,60,0.9)" : "rgba(255,90,90,0.9)";
}

// ─── Mini line chart (pure SVG) ───────────────────────────────────────────────
function MiniChart({ data, color }: { data: ChartPoint[]; color: string }) {
  if (data.length < 2) return <div style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", padding: "20px 0" }}>Not enough data yet</div>;
  const W = 320, H = 80, pad = 8;
  const scores = data.map(d => d.score);
  const min = Math.min(...scores), max = Math.max(...scores);
  const range = max - min || 1;
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = H - pad - ((d.score - min) / range) * (H - pad * 2);
    return `${x},${y}`;
  });
  const pathD = `M ${pts.join(" L ")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 80 }}>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts.join(" ")} />
      {data.map((d, i) => {
        const [x, y] = pts[i].split(",").map(Number);
        return <circle key={i} cx={x} cy={y} r="3" fill={color} opacity="0.8" />;
      })}
      <path d={`${pathD} L ${pts[pts.length-1].split(",")[0]},${H} L ${pts[0].split(",")[0]},${H} Z`}
        fill={color} opacity="0.06" />
    </svg>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ emoji, label, value, sub, color }: { emoji: string; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, borderColor: "rgba(255,255,255,0.18)" }}
      style={{ background: "rgba(8,8,12,0.9)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "22px 20px", position: "relative", overflow: "hidden", transition: "border-color 0.2s" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color, opacity: 0.5 }} />
      <div style={{ fontSize: 22, marginBottom: 10 }}>{emoji}</div>
      <div style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: "-1px", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 3 }}>{sub}</div>}
    </motion.div>
  );
}

// ─── Performance card ─────────────────────────────────────────────────────────
function PerfCard({ label, value, color, emoji }: { label: string; value: number; color: string; emoji: string }) {
  const r = 30, circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      style={{ background: "rgba(8,8,12,0.9)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "22px 20px", display: "flex", alignItems: "center", gap: 16, transition: "all 0.2s" }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <svg width={72} height={72} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
          <motion.circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={6}
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontFamily: "var(--font-syne), sans-serif", fontWeight: 800 }}>{value}%</div>
      </div>
      <div>
        <div style={{ fontSize: 18, marginBottom: 4 }}>{emoji}</div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
      </div>
    </motion.div>
  );
}


// ─── History table row ────────────────────────────────────────────────────────
function HistoryRow({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      whileHover={{ background: "rgba(255,255,255,0.04)" }}
      style={{ display: "grid", padding: "14px 18px", borderBottom: "0.5px solid rgba(255,255,255,0.05)", transition: "background 0.2s", borderRadius: 8 }}>
      {children}
    </motion.div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, emoji, action }: { title: string; emoji: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>{emoji}</span>
        <h2 style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 16, fontWeight: 800, letterSpacing: "-0.3px" }}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

// ─── Glass panel ──────────────────────────────────────────────────────────────
function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "rgba(8,8,12,0.9)", border: "0.5px solid rgba(255,255,255,0.08)",
      borderRadius: 20, padding: "24px 24px", position: "relative", overflow: "hidden",
      ...style,
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent)" }} />
      {children}
    </div>
  );
}


// ─── Main component ───────────────────────────────────────────────────────────
export default function ProgressPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"interviews" | "coding" | "mcq" | "resumes">("interviews");
  const [openProfileMenu, setOpenProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") router.push("/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/dashboard/progress")
      .then(r => r.json())
      .then((d: DashboardData & { error?: string }) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load."))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100svh", background: "#060608", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 36, height: 36, border: "2px solid rgba(255,255,255,0.07)", borderTopColor: "rgba(255,255,255,0.4)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>Loading your progress…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isEmpty = data && data.stats.totalInterviews === 0 && data.stats.totalCodingSessions === 0 && data.stats.totalMcqTests === 0;
  const userName = data?.user.name ?? session?.user?.name ?? "User";
  const userInitial = userName.charAt(0).toUpperCase();
  const credits = data?.user.credits ?? session?.user?.credits ?? 0;


  return (
    <>
      {/* Background */}
      <div style={{ position: "fixed", inset: 0, background: "#060608", zIndex: -1 }} />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(circle,rgba(255,255,255,0.04) 1px,transparent 1px)", backgroundSize: "36px 36px", pointerEvents: "none", zIndex: 0, maskImage: "radial-gradient(ellipse 90% 90% at 50% 50%,black 20%,transparent 100%)" }} />
      <div style={{ position: "fixed", top: "-200px", left: "50%", transform: "translateX(-50%)", width: "900px", height: "600px", background: "radial-gradient(ellipse,rgba(255,255,255,0.025) 0%,transparent 65%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Nav */}
      <nav>
        <Link href="/" className="nav-logo">prep<span>/</span>ai</Link>
        <div className="nav-links">
          <Link href="/#how">How it works</Link>
          <Link href="/#roles">Roles</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/resume-analyzer">Resume AI</Link>
        </div>
        <div className="nav-cta">
          <div className="auth-user-wrap">
            <div className="credits-pill"><span className="credits-icon">$</span>{credits}</div>
            <div className="profile-menu-wrap" ref={profileMenuRef}>
              <button type="button" className={`account-avatar-btn ${openProfileMenu ? "open" : ""}`}
                onClick={() => setOpenProfileMenu(p => !p)} aria-label="Open profile menu">
                <span className="account-avatar">{userInitial}</span>
              </button>
              <div className={`profile-dropdown ${openProfileMenu ? "open" : ""}`}>
                <div className="profile-name">{userName}</div>
                <button type="button" className="profile-logout-btn" onClick={() => signOut({ callbackUrl: "/" })}>Logout</button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 1060, margin: "0 auto", padding: "88px 24px 60px" }}>

        {/* ── Page header ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "5px 14px", fontSize: 11, color: "rgba(255,255,255,0.45)", letterSpacing: "0.05em", marginBottom: 14 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(100,220,130,0.8)" }} />
            Progress Dashboard
          </div>
          <h1 style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: "clamp(24px,4vw,36px)", fontWeight: 800, letterSpacing: "-1px", marginBottom: 6 }}>
            Welcome back, {userName.split(" ")[0]}. 👋
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
            Here&apos;s your complete practice overview and performance insights.
          </p>
        </motion.div>


        {/* ── Empty state ── */}
        {isEmpty && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: "center", padding: "80px 24px", background: "rgba(8,8,12,0.9)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🚀</div>
            <h2 style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 12 }}>No practice sessions yet</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 28, maxWidth: 380, margin: "0 auto 28px" }}>
              Start your first interview to begin tracking your progress, scores, and improvements here.
            </p>
            <Link href="/interview-start" style={{ display: "inline-block", background: "#fff", color: "#000", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 14, fontWeight: 700, padding: "13px 28px", borderRadius: 12, textDecoration: "none" }}>
              Start Practising →
            </Link>
          </motion.div>
        )}

        {!isEmpty && data && (
          <>
            {/* ── Stat cards ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 28 }}>
              <StatCard emoji="💳" label="Credits Remaining" value={credits} color="rgba(99,102,241,0.9)" />
              <StatCard emoji="🎙️" label="Interviews" value={data.stats.totalInterviews} color="rgba(232,121,249,0.9)" />
              <StatCard emoji="💻" label="Coding Sessions" value={data.stats.totalCodingSessions} color="rgba(251,146,60,0.9)" />
              <StatCard emoji="📝" label="MCQ Tests" value={data.stats.totalMcqTests} color="rgba(100,220,130,0.9)" />
              <StatCard emoji="📄" label="Resume Analyses" value={data.stats.totalResumeAnalyses} color="rgba(56,189,248,0.9)" />
            </div>

            {/* ── Performance overview ── */}
            <div style={{ marginBottom: 28 }}>
              <SectionHeader title="Performance Overview" emoji="📊" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
                <PerfCard label="Interview Score" value={data.performance.avgInterviewScore} color={scoreColor(data.performance.avgInterviewScore)} emoji="🎙️" />
                <PerfCard label="Coding Accuracy" value={data.performance.avgCodingAccuracy} color={scoreColor(data.performance.avgCodingAccuracy)} emoji="💻" />
                <PerfCard label="MCQ Average" value={data.performance.avgMcqScore} color={scoreColor(data.performance.avgMcqScore)} emoji="📝" />
                <PerfCard label="Resume Score" value={data.performance.avgResumeScore} color={scoreColor(data.performance.avgResumeScore)} emoji="📄" />
              </div>
            </div>


            {/* ── Recent activity ── */}
            <Panel style={{ marginBottom: 28 }}>
              <SectionHeader title="Recent Activity" emoji="⚡" />
              {data.recentActivity.length === 0 ? (
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>No recent activity.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {data.recentActivity.map((a, i) => {
                    const typeEmoji = a.type === "interview" ? "🎙️" : a.type === "coding" ? "💻" : a.type === "mcq" ? "📝" : "📄";
                    return (
                      <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "0.5px solid rgba(255,255,255,0.05)" }}>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{typeEmoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{a.label}</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{timeAgo(a.date)}</div>
                        </div>
                        {a.score !== null && (
                          <div style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 15, fontWeight: 800, color: scoreColor(a.score) }}>
                            {a.score}%
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </Panel>

            {/* ── Charts ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14, marginBottom: 28 }}>
              {[
                { title: "Interview Scores", data: data.charts.interviewChartData, color: "rgba(232,121,249,0.8)" },
                { title: "Coding Accuracy", data: data.charts.codingChartData, color: "rgba(251,146,60,0.8)" },
                { title: "MCQ Scores", data: data.charts.mcqChartData, color: "rgba(100,220,130,0.8)" },
              ].map((chart) => (
                <Panel key={chart.title}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 600, marginBottom: 12, letterSpacing: "0.03em" }}>{chart.title}</div>
                  <MiniChart data={chart.data} color={chart.color} />
                </Panel>
              ))}
            </div>


            {/* ── AI Insights ── */}
            {(data.insights.strengths.length > 0 || data.insights.improvements.length > 0) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
                <div style={{ background: "rgba(100,220,130,0.04)", border: "0.5px solid rgba(100,220,130,0.15)", borderRadius: 20, padding: "22px 20px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "rgba(100,220,130,0.4)" }} />
                  <SectionHeader title="Your Strengths" emoji="💪" />
                  {data.insights.strengths.map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                      style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginBottom: 10, display: "flex", gap: 8 }}>
                      <span style={{ color: "rgba(100,220,130,0.8)", flexShrink: 0 }}>✓</span>{s}
                    </motion.div>
                  ))}
                </div>
                <div style={{ background: "rgba(255,190,60,0.03)", border: "0.5px solid rgba(255,190,60,0.15)", borderRadius: 20, padding: "22px 20px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "rgba(255,190,60,0.4)" }} />
                  <SectionHeader title="Areas to Improve" emoji="🎯" />
                  {data.insights.improvements.map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                      style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginBottom: 10, display: "flex", gap: 8 }}>
                      <span style={{ color: "rgba(255,190,60,0.8)", flexShrink: 0 }}>⚠</span>{s}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* ── History tabs ── */}
            <Panel>
              <SectionHeader title="Practice History" emoji="🗂️" />
              {/* Tab bar */}
              <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 4, marginBottom: 20, width: "fit-content" }}>
                {(["interviews", "coding", "mcq", "resumes"] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "var(--font-dm-sans), sans-serif", transition: "all 0.2s",
                      background: activeTab === tab ? "rgba(255,255,255,0.1)" : "transparent",
                      color: activeTab === tab ? "#fff" : "rgba(255,255,255,0.3)",
                    }}>
                    {tab === "interviews" ? "🎙️ Interviews" : tab === "coding" ? "💻 Coding" : tab === "mcq" ? "📝 MCQ" : "📄 Resumes"}
                  </button>
                ))}
              </div>


              <AnimatePresence mode="wait">
                {activeTab === "interviews" && (
                  <motion.div key="interviews" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {data.history.interviews.length === 0 ? <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>No interviews yet.</p> : (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 100px 80px", gap: 8, padding: "8px 18px", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          <span>Type</span><span>Difficulty</span><span>Score</span><span>Date</span><span>Qs</span>
                        </div>
                        {data.history.interviews.map((iv, i) => (
                          <HistoryRow key={iv.id}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 100px 80px", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: 13, fontWeight: 500, textTransform: "capitalize" }}>{iv.type}</span>
                              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", textTransform: "capitalize" }}>{iv.difficulty}</span>
                              <span style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 13, fontWeight: 700, color: iv.score !== null ? scoreColor(iv.score) : "rgba(255,255,255,0.3)" }}>{iv.score !== null ? `${iv.score}%` : "—"}</span>
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{timeAgo(iv.date)}</span>
                              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{iv.questionsCount}Q</span>
                            </div>
                          </HistoryRow>
                        ))}
                      </>
                    )}
                  </motion.div>
                )}

                {activeTab === "coding" && (
                  <motion.div key="coding" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {data.history.coding.length === 0 ? <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>No coding sessions yet.</p> : (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px 80px 100px", gap: 8, padding: "8px 18px", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          <span>Question</span><span>Difficulty</span><span>Tests</span><span>Runtime</span><span>Date</span>
                        </div>
                        {data.history.coding.map((c) => (
                          <HistoryRow key={c.id}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px 80px 100px", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: 13, fontWeight: 500 }}>{c.title}</span>
                              <span style={{ fontSize: 12, color: c.difficulty === "Easy" ? "rgba(100,220,130,0.7)" : c.difficulty === "Hard" ? "rgba(255,90,90,0.7)" : "rgba(255,190,60,0.7)" }}>{c.difficulty}</span>
                              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{c.passed}/{c.total}</span>
                              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{c.runtime}</span>
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{timeAgo(c.date)}</span>
                            </div>
                          </HistoryRow>
                        ))}
                      </>
                    )}
                  </motion.div>
                )}

                {activeTab === "mcq" && (
                  <motion.div key="mcq" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {data.history.mcq.length === 0 ? <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>No MCQ tests yet.</p> : (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 80px 100px", gap: 8, padding: "8px 18px", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          <span>Topic</span><span>Difficulty</span><span>Score</span><span>Grade</span><span>Date</span>
                        </div>
                        {data.history.mcq.map((m) => (
                          <HistoryRow key={m.id}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 80px 100px", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: 13, fontWeight: 500, textTransform: "capitalize" }}>{m.topic}</span>
                              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", textTransform: "capitalize" }}>{m.difficulty}</span>
                              <span style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 13, fontWeight: 700, color: scoreColor(m.percentage) }}>{m.correct}/{m.total}</span>
                              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{m.grade}</span>
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{timeAgo(m.date)}</span>
                            </div>
                          </HistoryRow>
                        ))}
                      </>
                    )}
                  </motion.div>
                )}

                {activeTab === "resumes" && (
                  <motion.div key="resumes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {data.history.resumes.length === 0 ? <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>No resume analyses yet.</p> : (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 1fr 100px", gap: 8, padding: "8px 18px", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          <span>File</span><span>Score</span><span>ATS</span><span>Best Match</span><span>Date</span>
                        </div>
                        {data.history.resumes.map((r) => (
                          <HistoryRow key={r.id}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 1fr 100px", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: 13, fontWeight: 500 }}>{r.fileName}</span>
                              <span style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 13, fontWeight: 700, color: scoreColor(r.overallScore) }}>{r.overallScore}%</span>
                              <span style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 13, fontWeight: 700, color: scoreColor(r.atsScore) }}>{r.atsScore}%</span>
                              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{r.topRole} ({r.topRoleMatch}%)</span>
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{timeAgo(r.date)}</span>
                            </div>
                          </HistoryRow>
                        ))}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </Panel>

            {/* ── CTA ── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              style={{ textAlign: "center", marginTop: 40, padding: "40px 24px", background: "rgba(8,8,12,0.9)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 20 }}>
              <h3 style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 10 }}>
                Keep improving your scores 🚀
              </h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>
                Every session sharpens your skills. Start another round of practice.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/interview-start" style={{ background: "#fff", color: "#000", fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 12, textDecoration: "none", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                  Start Interview →
                </Link>
                <Link href="/resume-analyzer" style={{ background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 14, fontWeight: 500, padding: "12px 24px", borderRadius: 12, textDecoration: "none", border: "0.5px solid rgba(255,255,255,0.13)", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                  Analyze Resume
                </Link>
              </div>
            </motion.div>
          </>
        )}

        {error && (
          <div style={{ padding: "16px 20px", background: "rgba(255,60,60,0.06)", border: "0.5px solid rgba(255,60,60,0.2)", borderRadius: 12, fontSize: 13, color: "rgba(255,90,90,0.9)", marginTop: 20 }}>
            ⚠ {error}
          </div>
        )}

      </main>
    </>
  );
}
