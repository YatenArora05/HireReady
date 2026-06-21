"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../../practice.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────
type Question = { id: number; question: string };

type Evaluation = {
  clarity: number;
  structure: number;
  confidence: number;
  relevance: number;
  communication: number;
  overall: number;
  strengths: string[];
  improvements: string[];
  feedback: string;
};

type FinalReport = {
  overallScore:   number;
  communication:  number;
  confidence:     number;
  technicalComm:  number;
  strengths:      string[];
  improvements:   string[];
  recommendation: string;
};

// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// ─── Score bar ────────────────────────────────────────────────────────────────
function ScoreBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ fontFamily: "var(--font-syne), sans-serif", fontWeight: 700 }}>{value}/{max}</span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: "100%", background: "linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0.2))", borderRadius: 4 }}
        />
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function VoicePracticeView() {
  const searchParams  = useSearchParams();
  const interviewType = searchParams.get("type")       ?? "behavioral";
  const difficulty    = searchParams.get("difficulty") ?? "intermediate";
  const experience    = searchParams.get("experience") ?? "1 year";

  const { update: updateSession } = useSession();

  // Session
  const [sessionId,   setSessionId]   = useState<string | null>(null);
  const [questions,   setQuestions]   = useState<Question[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState("");
  const [creditError, setCreditError] = useState("");

  // Per-question state
  const [qIdx,          setQIdx]          = useState(0);
  const [transcript,    setTranscript]    = useState("");
  const [interimText,   setInterimText]   = useState("");
  const [recording,     setRecording]     = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [evaluation,    setEvaluation]    = useState<Evaluation | null>(null);
  const [showEval,      setShowEval]      = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);

  // Final report
  const [generatingReport, setGeneratingReport] = useState(false);
  const [finalReport,      setFinalReport]      = useState<FinalReport | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const currentQuestion = questions[qIdx] ?? null;

  // ─── Load questions + deduct credits ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError("");

      // Deduct credits first
      try {
        const credRes = await fetch("/api/voice-session", { method: "POST" });
        const credData = await credRes.json() as { ok?: boolean; remainingCredits?: number; error?: string };
        if (credData.error) { setCreditError(credData.error); setLoading(false); return; }
        if (typeof credData.remainingCredits === "number") {
          void updateSession({ credits: credData.remainingCredits });
        }
      } catch {
        // non-blocking
      }

      try {
        const res  = await fetch("/api/voice-generate", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ interviewType, difficulty, experience }),
        });
        const data = await res.json() as { sessionId?: string; questions?: Question[]; error?: string };
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setSessionId(data.sessionId ?? null);
        setQuestions(data.questions ?? []);
      } catch (err: unknown) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load questions.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Web Speech API ──────────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition is not supported in this browser. Please use Chrome."); return; }

    const rec = new SR();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = "en-US";

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let finalPart  = "";
      let interimPart = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalPart  += t;
        else                          interimPart += t;
      }
      if (finalPart)  setTranscript((prev) => (prev ? prev + " " + finalPart : finalPart).trim());
      setInterimText(interimPart);
    };

    rec.onerror = () => { setRecording(false); setInterimText(""); };
    rec.onend   = () => { setRecording(false); setInterimText(""); };

    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setRecording(false);
    setInterimText("");
  }, []);

  const toggleRecording = () => {
    if (recording) stopRecording();
    else startRecording();
  };

  // ─── Submit answer ───────────────────────────────────────────────────────────
  const submitAnswer = async () => {
    if (!sessionId || !currentQuestion || submitting) return;
    if (recording) stopRecording();

    const answer = transcript.trim();
    setSubmitting(true);

    try {
      const res  = await fetch("/api/voice-answer", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ sessionId, questionId: currentQuestion.id, answer }),
      });
      const data = await res.json() as { ok?: boolean; evaluation?: Evaluation; error?: string };
      if (data.error) throw new Error(data.error);

      setEvaluation(data.evaluation ?? null);
      setShowEval(true);
      setAnsweredCount((p) => p + 1);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to submit answer.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Next question ───────────────────────────────────────────────────────────
  const nextQuestion = async () => {
    const isLast = qIdx === questions.length - 1;

    if (isLast) {
      // Generate final report
      setGeneratingReport(true);
      try {
        const res  = await fetch("/api/voice-report", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ sessionId }),
        });
        const data = await res.json() as { ok?: boolean; report?: FinalReport; error?: string };
        if (data.error) throw new Error(data.error);
        setFinalReport(data.report ?? null);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Failed to generate report.");
      } finally {
        setGeneratingReport(false);
      }
    } else {
      setQIdx((p) => p + 1);
      setTranscript("");
      setInterimText("");
      setEvaluation(null);
      setShowEval(false);
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (creditError) {
    return (
      <>
        <div className={styles.secHead}>
          <div className={styles.secLeft}>
            <span className={styles.secNum}>02 /</span>
            <h2 className={styles.secTitle}>Voice Interview</h2>
          </div>
        </div>
        <div className={styles.loadingState}>
          <p className={styles.errorText}>⚠ {creditError}</p>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <div className={styles.secHead}>
          <div className={styles.secLeft}>
            <span className={styles.secNum}>02 /</span>
            <h2 className={styles.secTitle}>Voice Interview</h2>
            <span className={styles.secBadge}>Generating…</span>
          </div>
        </div>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingText}>Generating your interview questions with AI…</p>
        </div>
      </>
    );
  }

  if (loadError || questions.length === 0) {
    return (
      <>
        <div className={styles.secHead}>
          <div className={styles.secLeft}>
            <span className={styles.secNum}>02 /</span>
            <h2 className={styles.secTitle}>Voice Interview</h2>
          </div>
        </div>
        <div className={styles.loadingState}>
          <p className={styles.errorText}>⚠ {loadError || "No questions loaded."}</p>
          <button className={styles.btnRun} onClick={() => window.location.reload()}>Retry</button>
        </div>
      </>
    );
  }

  // ─── Generating report ───────────────────────────────────────────────────────
  if (generatingReport) {
    return (
      <>
        <div className={styles.secHead}>
          <div className={styles.secLeft}>
            <span className={styles.secNum}>02 /</span>
            <h2 className={styles.secTitle}>Voice Interview</h2>
            <span className={styles.secBadge}>Analysing…</span>
          </div>
        </div>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingText}>Generating your interview report…</p>
        </div>
      </>
    );
  }

  // ─── Final Report ────────────────────────────────────────────────────────────
  if (finalReport) {
    const recColor =
      finalReport.recommendation === "Strong Hire"         ? "rgba(100,220,130,.85)" :
      finalReport.recommendation === "Likely to clear this round" ? "rgba(255,190,60,.85)" :
      finalReport.recommendation === "Borderline"          ? "rgba(255,140,60,.85)" :
      "rgba(255,90,90,.8)";

    return (
      <>
        <div className={styles.secHead}>
          <div className={styles.secLeft}>
            <span className={styles.secNum}>02 /</span>
            <h2 className={styles.secTitle}>Interview Report</h2>
            <span className={styles.secBadge} style={{ color: recColor, borderColor: recColor }}>{finalReport.recommendation}</span>
          </div>
        </div>
        <div className={styles.mcqResultsBody}>
          {/* Overall score */}
          <motion.div className={styles.mcqScoreCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className={styles.mcqScoreBig}>{finalReport.overallScore}</div>
            <div className={styles.mcqScoreGrade}>Overall Score / 100</div>
            <div className={styles.mcqScoreRow}>
              {[
                { label: "Communication", val: finalReport.communication },
                { label: "Confidence",    val: finalReport.confidence },
                { label: "Tech Comm",     val: finalReport.technicalComm },
              ].map(({ label, val }, i) => (
                <>
                  {i > 0 && <div key={`div-${label}`} className={styles.mcqScoreStatDivider} />}
                  <div key={label} className={styles.mcqScoreStat}>
                    <span className={styles.mcqScoreStatVal}>{val}</span>
                    <span className={styles.mcqScoreStatLbl}>{label}</span>
                  </div>
                </>
              ))}
            </div>
          </motion.div>

          {/* Strengths + Improvements */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              style={{ background: "rgba(100,220,130,.04)", border: "0.5px solid rgba(100,220,130,.2)", borderRadius: 14, padding: "18px 20px" }}
            >
              <div style={{ fontSize: 11, color: "rgba(100,220,130,.7)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>Top Strengths</div>
              {finalReport.strengths.map((s, i) => (
                <div key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6, display: "flex", gap: 8 }}>
                  <span style={{ color: "rgba(100,220,130,.7)" }}>✓</span> {s}
                </div>
              ))}
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
              style={{ background: "rgba(255,190,60,.04)", border: "0.5px solid rgba(255,190,60,.2)", borderRadius: 14, padding: "18px 20px" }}
            >
              <div style={{ fontSize: 11, color: "rgba(255,190,60,.7)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>Areas to Improve</div>
              {finalReport.improvements.map((s, i) => (
                <div key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6, display: "flex", gap: 8 }}>
                  <span style={{ color: "rgba(255,190,60,.7)" }}>→</span> {s}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Recommendation banner */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            style={{ padding: "16px 20px", borderRadius: 12, border: `0.5px solid ${recColor}`, background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 12 }}
          >
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", letterSpacing: ".08em", textTransform: "uppercase" }}>Hiring Recommendation</div>
            <div style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 16, fontWeight: 800, color: recColor }}>{finalReport.recommendation}</div>
          </motion.div>
        </div>
      </>
    );
  }

  // ─── Main interview view ─────────────────────────────────────────────────────
  const displayText = transcript + (interimText ? (transcript ? " " : "") + interimText : "");

  return (
    <>
      <div className={styles.secHead}>
        <div className={styles.secLeft}>
          <span className={styles.secNum}>02 /</span>
          <h2 className={styles.secTitle}>Voice Interview</h2>
          <span className={styles.secBadge}>Question {qIdx + 1} of {questions.length}</span>
        </div>
      </div>

      <div className={styles.voiceBody}>
        {/* ── Left panel — AI avatar + evaluation ── */}
        <div className={styles.voiceLeft}>
          <div className={styles.avatarZone}>
            <div className={styles.avatarFrame}>
              <div className={styles.avatarInner}>
                <div className={styles.aiFace}>
                  <div className={styles.aiFaceRing} />
                  <div className={styles.aiFaceRing2} />
                  <div className={`${styles.aiSpeakingRing} ${recording ? "" : ""}`} />
                  <div className={styles.aiFaceCore}>
                    <img src="/api/ai-person-image" alt="AI interviewer" className={styles.aiPersonImage} />
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.avatarStatus}>
              <span className={styles.statusIndicator} style={{ background: recording ? "rgba(100,220,130,.8)" : "rgba(255,255,255,.5)" }} />
              <span>{recording ? "Listening…" : "AI Interviewer"}</span>
            </div>
            <div className={styles.soundWave}>
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className={styles.waveBar} style={{ animationPlayState: recording ? "running" : "paused" }} />
              ))}
            </div>
            <div className={styles.avatarSpeech}>
              &quot;{currentQuestion?.question}&quot;
            </div>
          </div>

          {/* Evaluation panel */}
          <div className={styles.resultZone}>
            <div className={styles.resultTitleRow}>
              <span className={styles.resultTitle}>Evaluation</span>
              {showEval && evaluation && (
                <span className={styles.resultLiveBadge}>
                  <span className={styles.resultLiveDot} />
                  Score: {evaluation.overall}/10
                </span>
              )}
            </div>

            <AnimatePresence mode="wait">
              {showEval && evaluation ? (
                <motion.div key="eval" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                  <div style={{ marginBottom: 12 }}>
                    <ScoreBar label="Clarity"       value={evaluation.clarity} />
                    <ScoreBar label="Structure"     value={evaluation.structure} />
                    <ScoreBar label="Confidence"    value={evaluation.confidence} />
                    <ScoreBar label="Relevance"     value={evaluation.relevance} />
                    <ScoreBar label="Communication" value={evaluation.communication} />
                  </div>
                  <div className={styles.feedbackBox}>
                    <div className={styles.feedbackHead}>AI Feedback</div>
                    <div className={styles.feedbackText}>{evaluation.feedback}</div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className={styles.feedbackBox}>
                    <div className={styles.feedbackHead}>AI Feedback</div>
                    <div className={styles.feedbackText}>Submit your answer to receive AI evaluation on clarity, structure, confidence, relevance, and communication.</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Right panel — question + answer ── */}
        <div className={styles.voiceRight}>
          <div className={styles.voiceRightHead}>
            Question {qIdx + 1} of {questions.length} · {interviewType} · {difficulty}
          </div>
          <div className={styles.vrQuestionWrap}>
            <div className={styles.vrQuestionLabel}>Current Question</div>
            <AnimatePresence mode="wait">
              <motion.div
                key={qIdx}
                className={styles.vrQuestion}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
              >
                {currentQuestion?.question}
              </motion.div>
            </AnimatePresence>

            <div className={styles.vrAnswerArea}>
              <textarea
                className={styles.vrTextarea}
                value={displayText}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={recording ? "Listening… speak your answer" : "Press the mic to record, or type your answer here…"}
                readOnly={submitting}
              />
            </div>
          </div>

          <div className={styles.vrBottom}>
            {/* Mic button */}
            <button
              className={`${styles.micBtn} ${recording ? styles.micBtnRecording : ""}`}
              onClick={toggleRecording}
              disabled={showEval || submitting}
              aria-label={recording ? "Stop recording" : "Start recording"}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <rect x="6" y="1.5" width="6" height="9" rx="3" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" />
                <path d="M3 9a6 6 0 0012 0" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" strokeLinecap="round" />
                <line x1="9" y1="15" x2="9" y2="17" stroke="rgba(255,255,255,0.5)" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </button>

            <div className={styles.micLabel}>
              {recording ? "Recording… speak your answer" : showEval ? "Answer submitted" : "Press mic or type your answer"}
            </div>

            {/* Progress dots */}
            <div style={{ display: "flex", gap: 5, marginLeft: "auto", marginRight: 12 }}>
              {questions.map((_, i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i < answeredCount ? "rgba(100,220,130,.7)" : i === qIdx ? "#fff" : "rgba(255,255,255,.2)", transition: "background 0.3s" }} />
              ))}
            </div>

            {/* Action buttons */}
            {!showEval ? (
              <button
                className={styles.btnPrimary}
                onClick={submitAnswer}
                disabled={submitting || (!transcript.trim() && !interimText.trim())}
                style={{ opacity: submitting || (!transcript.trim() && !interimText.trim()) ? 0.5 : 1 }}
              >
                {submitting ? "Evaluating…" : "Submit Answer"}
              </button>
            ) : (
              <button className={styles.btnPrimary} onClick={nextQuestion}>
                {qIdx === questions.length - 1 ? "Generate Report →" : "Next Question →"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
