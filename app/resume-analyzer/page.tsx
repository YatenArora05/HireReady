"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
type SkillCategory = { label: string; skills: string[]; missing?: string[] };

type ProjectReview = {
  name: string;
  technologies: string[];
  strengths: string[];
  suggestions: string[];
  impactScore: number;
};

type RoleMatch = { role: string; match: number };

type AnalysisResult = {
  overallScore: number;
  atsScore: number;
  technicalStrength: number;
  projectQuality: number;
  formatting: number;
  skillCategories: SkillCategory[];
  atsChecks: { pass: string[]; warn: string[] };
  projectsFound: number;
  projectComplexity: string;
  strongestProject: string;
  projects: ProjectReview[];
  strengths: string[];
  improvements: string[];
  roleMatches: RoleMatch[];
  interviewReadiness: number;
};


// ─── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({ value, size = 96, stroke = 7, color = "#fff" }: {
  value: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
      />
    </svg>
  );
}

// ─── Score card ───────────────────────────────────────────────────────────────
function ScoreCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.08)",
        borderRadius: 16, padding: "20px 16px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        position: "relative", overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color, opacity: 0.6 }} />
      <div style={{ position: "relative" }}>
        <ScoreRing value={value} size={80} stroke={6} color={color} />
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-syne), sans-serif", fontSize: 18, fontWeight: 800,
          transform: "rotate(0deg)",
        }}>
          {value}
        </div>
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textAlign: "center", lineHeight: 1.4 }}>{label}</div>
    </motion.div>
  );
}


// ─── Bar ─────────────────────────────────────────────────────────────────────
function Bar({ value, color, delay = 0 }: { value: number; color: string; delay?: number }) {
  return (
    <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 6, overflow: "hidden", flex: 1 }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay }}
        style={{ height: "100%", background: color, borderRadius: 6 }}
      />
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, emoji, children, delay = 0 }: {
  title: string; emoji: string; children: React.ReactNode; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: "rgba(8,8,12,0.9)", border: "0.5px solid rgba(255,255,255,0.08)",
        borderRadius: 20, padding: "28px 28px", marginBottom: 16, position: "relative", overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 20 }}>{emoji}</span>
        <h3 style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: "-0.3px" }}>{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}


// ─── Upload zone ──────────────────────────────────────────────────────────────
function UploadZone({ onFile, loading }: { onFile: (f: File) => void; loading: boolean }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handle = (file?: File | null) => {
    if (!file) return;
    if (!file.name.match(/\.(pdf|docx?)$/i)) { alert("Please upload a PDF or DOCX file."); return; }
    onFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      onClick={() => !loading && ref.current?.click()}
      style={{
        border: `1.5px dashed ${drag ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)"}`,
        borderRadius: 20, padding: "48px 24px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
        cursor: loading ? "not-allowed" : "pointer",
        background: drag ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
        transition: "all 0.25s",
      }}
    >
      <input ref={ref} type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }}
        onChange={(e) => handle(e.target.files?.[0])} />
      <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.07)", border: "0.5px solid rgba(255,255,255,0.13)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
        {loading ? "⏳" : "📄"}
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
          {loading ? "Analyzing your resume…" : "Drop your resume here"}
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
          {loading ? "AI is reading every line — this takes ~10 seconds" : "PDF or DOCX · Click to browse"}
        </div>
      </div>
      {loading && (
        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
          {[0, 1, 2].map((i) => (
            <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.5)" }} />
          ))}
        </div>
      )}
    </div>
  );
}


// ─── Main page ────────────────────────────────────────────────────────────────
export default function ResumeAnalyzerPage() {
  const { data: session } = useSession();
  const isLoggedIn  = Boolean(session?.user);
  const credits     = session?.user?.credits ?? 100;
  const userName    = session?.user?.name?.trim() || "User";
  const userInitial = userName.charAt(0).toUpperCase();
  const [openProfileMenu, setOpenProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [result, setResult]     = useState<AnalysisResult | null>(null);
  const [fileName, setFileName] = useState("");
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const analyzeResume = async (file: File) => {
    setLoading(true);
    setError("");
    setResult(null);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("resume", file);
      const res  = await fetch("/api/resume-full-analyze", { method: "POST", body: formData });
      const data = await res.json() as AnalysisResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Analysis failed.");
      setResult(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (v: number) =>
    v >= 80 ? "rgba(100,220,130,0.9)" : v >= 60 ? "rgba(255,190,60,0.9)" : "rgba(255,90,90,0.9)";

  const roleBarColor = (v: number) =>
    v >= 80 ? "rgba(100,220,130,0.8)" : v >= 60 ? "rgba(255,190,60,0.8)" : "rgba(255,90,90,0.7)";

  return (
    <>
      {/* Background */}
      <div style={{ position: "fixed", inset: 0, background: "#060608", zIndex: -1 }} />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(circle,rgba(255,255,255,0.045) 1px,transparent 1px)", backgroundSize: "36px 36px", pointerEvents: "none", zIndex: 0, maskImage: "radial-gradient(ellipse 90% 90% at 50% 50%,black 20%,transparent 100%)" }} />
      <div style={{ position: "fixed", top: "-200px", left: "50%", transform: "translateX(-50%)", width: "800px", height: "600px", background: "radial-gradient(ellipse,rgba(255,255,255,0.03) 0%,transparent 65%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-150px", right: "-150px", width: "500px", height: "500px", background: "radial-gradient(ellipse,rgba(255,255,255,0.02) 0%,transparent 65%)", pointerEvents: "none", zIndex: 0 }} />


      {/* Nav */}
      <nav>
        <Link href="/" className="nav-logo">HireReady</Link>
        <div className="nav-links">
          <Link href="/#how">How it works</Link>
          <Link href="/#roles">Roles</Link>
          <Link href="/#reviews">Reviews</Link>
          <Link href="/#faq">FAQ</Link>
          <Link href="/pricing">Pricing</Link>
        </div>
        <div className="nav-cta">
          {isLoggedIn ? (
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
          ) : (
            <>
              <Link href="/signin" className="auth-btn auth-btn-signin">Sign In</Link>
              <Link href="/signup" className="auth-btn auth-btn-signup" aria-label="Sign Up">
                <span className="signup-text-track" aria-hidden="true"><span>Sign Up</span><span>Get Started</span></span>
              </Link>
            </>
          )}
        </div>
      </nav>


      {/* Hero */}
      <main style={{ position: "relative", zIndex: 1, maxWidth: 860, margin: "0 auto", padding: "96px 24px 60px" }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.13)", borderRadius: 20, padding: "5px 14px", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.05em", marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.6)" }} />
            AI Resume Analyzer
          </div>
          <h1 style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: "clamp(28px,5vw,48px)", fontWeight: 800, letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 16 }}>
            Get your resume<br /><em style={{ fontStyle: "normal", color: "rgba(255,255,255,0.3)" }}>scored by AI.</em>
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", maxWidth: 480, margin: "0 auto 28px", lineHeight: 1.7 }}>
            Upload your resume and get an instant deep analysis — ATS score, skill gaps, role matches, project quality, and actionable improvements.
          </p>
          {isLoggedIn && (
            <Link href="/interview-start" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "6px 14px", background: "rgba(255,255,255,0.03)" }}>
              <span>→</span> Start interview practice
            </Link>
          )}
        </motion.div>

        {/* Upload */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
          <UploadZone onFile={analyzeResume} loading={loading} />
        </motion.div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ marginTop: 16, padding: "14px 18px", background: "rgba(255,60,60,0.06)", border: "0.5px solid rgba(255,60,60,0.2)", borderRadius: 12, fontSize: 13, color: "rgba(255,90,90,0.9)" }}>
            ⚠ {error}
          </motion.div>
        )}


        {/* ── Results ── */}
        <AnimatePresence>
          {result && (
            <motion.div ref={resultsRef} key="results"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ marginTop: 48 }}>

              {/* File badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, padding: "10px 16px", background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 12, width: "fit-content" }}>
                <span style={{ fontSize: 16 }}>📄</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{fileName}</span>
                <button onClick={() => { setResult(null); setFileName(""); }} style={{ marginLeft: 8, background: "none", border: "none", color: "rgba(255,255,255,0.22)", cursor: "pointer", fontSize: 12 }}>✕ Re-upload</button>
              </div>

              {/* ── 1. Score overview ── */}
              <Section title="Resume Score" emoji="🎯" delay={0.05}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
                  <div style={{ position: "relative", width: 140, height: 140 }}>
                    <ScoreRing value={result.overallScore} size={140} stroke={10} color={scoreColor(result.overallScore)} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{result.overallScore}</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>/ 100</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Overall Resume Score</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12 }}>
                  <ScoreCard label="ATS Compatibility" value={result.atsScore} color="rgba(100,220,130,0.9)" />
                  <ScoreCard label="Technical Strength" value={result.technicalStrength} color="rgba(99,102,241,0.9)" />
                  <ScoreCard label="Project Quality" value={result.projectQuality} color="rgba(251,146,60,0.9)" />
                  <ScoreCard label="Formatting" value={result.formatting} color="rgba(232,121,249,0.9)" />
                </div>
              </Section>


              {/* ── 2. Skills ── */}
              <Section title="Extracted Skills" emoji="🛠️" delay={0.1}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {result.skillCategories.map((cat) => (
                    <div key={cat.label}>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>{cat.label}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {cat.skills.map((s) => (
                          <span key={s} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, background: "rgba(100,220,130,0.08)", border: "0.5px solid rgba(100,220,130,0.25)", color: "rgba(100,220,130,0.85)", display: "flex", alignItems: "center", gap: 5 }}>
                            <span>✓</span> {s}
                          </span>
                        ))}
                        {(cat.missing ?? []).map((s) => (
                          <span key={s} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, background: "rgba(255,190,60,0.06)", border: "0.5px solid rgba(255,190,60,0.2)", color: "rgba(255,190,60,0.8)", display: "flex", alignItems: "center", gap: 5 }}>
                            <span>⚠</span> {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* ── 3. ATS Report ── */}
              <Section title="ATS Compatibility Report" emoji="🤖" delay={0.15}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                  <div style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 40, fontWeight: 800, color: scoreColor(result.atsScore) }}>{result.atsScore}%</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>ATS Score</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                      {result.atsScore >= 80 ? "Likely to pass ATS filters" : result.atsScore >= 60 ? "May struggle with some ATS" : "Needs improvement"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {result.atsChecks.pass.map((c) => (
                    <div key={c} style={{ fontSize: 12, color: "rgba(100,220,130,0.85)", display: "flex", gap: 6, alignItems: "flex-start" }}><span>✓</span> {c}</div>
                  ))}
                  {result.atsChecks.warn.map((c) => (
                    <div key={c} style={{ fontSize: 12, color: "rgba(255,190,60,0.8)", display: "flex", gap: 6, alignItems: "flex-start" }}><span>⚠</span> {c}</div>
                  ))}
                </div>
              </Section>


              {/* ── 4. Projects ── */}
              <Section title="Project Analysis" emoji="💻" delay={0.2}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Projects Found", value: String(result.projectsFound) },
                    { label: "Complexity", value: result.projectComplexity },
                    { label: "Top Project", value: result.strongestProject },
                  ].map((s) => (
                    <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px" }}>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
                      <div style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 15, fontWeight: 700 }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {result.projects.map((p) => (
                    <div key={p.name} style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <div style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                        <div style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 13, fontWeight: 700, color: scoreColor(p.impactScore * 10) }}>
                          {p.impactScore}/10
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                        {p.technologies.map((t) => (
                          <span key={t} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: "rgba(99,102,241,0.08)", border: "0.5px solid rgba(99,102,241,0.2)", color: "rgba(165,167,255,0.8)" }}>{t}</span>
                        ))}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                          {p.strengths.map((s) => <div key={s} style={{ fontSize: 12, color: "rgba(100,220,130,0.8)", marginBottom: 4, display: "flex", gap: 6 }}><span>✓</span>{s}</div>)}
                        </div>
                        <div>
                          {p.suggestions.map((s) => <div key={s} style={{ fontSize: 12, color: "rgba(255,190,60,0.75)", marginBottom: 4, display: "flex", gap: 6 }}><span>•</span>{s}</div>)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>


              {/* ── 5. Strengths + Improvements ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
                  style={{ background: "rgba(100,220,130,0.04)", border: "0.5px solid rgba(100,220,130,0.15)", borderRadius: 20, padding: "24px 22px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "rgba(100,220,130,0.4)" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: 18 }}>💪</span>
                    <h3 style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 14, fontWeight: 800 }}>Strengths</h3>
                  </div>
                  {result.strengths.map((s) => (
                    <div key={s} style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginBottom: 10, display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ color: "rgba(100,220,130,0.8)", flexShrink: 0, marginTop: 1 }}>✓</span>{s}
                    </div>
                  ))}
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
                  style={{ background: "rgba(255,190,60,0.03)", border: "0.5px solid rgba(255,190,60,0.15)", borderRadius: 20, padding: "24px 22px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "rgba(255,190,60,0.4)" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: 18 }}>🎯</span>
                    <h3 style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 14, fontWeight: 800 }}>Areas to Improve</h3>
                  </div>
                  {result.improvements.map((s) => (
                    <div key={s} style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginBottom: 10, display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ color: "rgba(255,190,60,0.8)", flexShrink: 0, marginTop: 1 }}>⚠</span>{s}
                    </div>
                  ))}
                </motion.div>
              </div>


              {/* ── 6. Role Match ── */}
              <Section title="Role Match Analysis" emoji="🎭" delay={0.35}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {result.roleMatches.map((rm, i) => (
                    <motion.div key={rm.role}
                      initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.35 + i * 0.07 }}
                      style={{ display: "flex", alignItems: "center", gap: 14 }}
                    >
                      <div style={{ width: 180, fontSize: 13, color: "rgba(255,255,255,0.65)", flexShrink: 0 }}>{rm.role}</div>
                      <Bar value={rm.match} color={roleBarColor(rm.match)} delay={0.4 + i * 0.07} />
                      <div style={{ width: 44, textAlign: "right", fontFamily: "var(--font-syne), sans-serif", fontSize: 14, fontWeight: 700, color: roleBarColor(rm.match), flexShrink: 0 }}>
                        {rm.match}%
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Section>

              {/* ── 7. Interview Readiness ── */}
              <Section title="Interview Readiness" emoji="🚀" delay={0.4}>
                <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <ScoreRing value={result.interviewReadiness} size={100} stroke={8} color={scoreColor(result.interviewReadiness)} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{result.interviewReadiness}</span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>/ 100</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
                      {result.interviewReadiness >= 80 ? "You're ready to interview! 🎉" : result.interviewReadiness >= 60 ? "Almost there — a few things to polish" : "More prep needed before interviews"}
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 16 }}>
                      Based on your resume analysis, your technical foundation, project experience, and skill breadth have been evaluated to estimate how prepared you are for a technical interview.
                    </div>
                    {isLoggedIn ? (
                      <Link href="/interview-start" style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        background: "#fff", color: "#000", fontSize: 13, fontWeight: 700,
                        padding: "11px 22px", borderRadius: 12, textDecoration: "none",
                        fontFamily: "var(--font-dm-sans), sans-serif",
                      }}>
                        Start Interview Practice →
                      </Link>
                    ) : (
                      <Link href="/signup" style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 13, fontWeight: 600,
                        padding: "11px 22px", borderRadius: 12, textDecoration: "none",
                        border: "0.5px solid rgba(255,255,255,0.2)",
                        fontFamily: "var(--font-dm-sans), sans-serif",
                      }}>
                        Sign up to start practising →
                      </Link>
                    )}
                  </div>
                </div>
              </Section>

            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </>
  );
}
