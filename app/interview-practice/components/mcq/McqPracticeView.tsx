"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "../../practice.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────
type MCQQuestion = {
  id: number;
  text: string;
  tag: string;
  options: string[];
};

type ResultQuestion = MCQQuestion & {
  correctAnswer: number;
  selectedAnswer: number | null;
  status: "correct" | "wrong" | "skipped";
};

type SubmitResponse = {
  correct: number;
  wrong: number;
  skipped: number;
  total: number;
  percentage: number;
  grade: string;
  results: ResultQuestion[];
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function McqPracticeView() {
  const searchParams   = useSearchParams();
  const interviewType  = searchParams.get("type")       ?? "technical";
  const difficulty     = searchParams.get("difficulty") ?? "intermediate";
  const experience     = searchParams.get("experience") ?? "1 year";

  const { update: updateSession } = useSession();

  // Session state
  const [sessionId,  setSessionId]  = useState<string | null>(null);
  const [questions,  setQuestions]  = useState<MCQQuestion[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState("");

  // Attempt state
  const [idx,        setIdx]        = useState(0);
  const [answers,    setAnswers]    = useState<Record<number, number>>({}); // questionId → selected option
  const [time,       setTime]       = useState(18 * 60);
  const [submitted,  setSubmitted]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result,     setResult]     = useState<SubmitResponse | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Load questions ────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setLoadError("");

    fetch("/api/mcq-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interviewType, difficulty, experience }),
    })
      .then((r) => r.json())
      .then((data: { sessionId?: string; questions?: MCQQuestion[]; error?: string; remainingCredits?: number }) => {
        if (data.error) throw new Error(data.error);
        if (!data.sessionId || !data.questions?.length) throw new Error("Invalid response from server.");
        setSessionId(data.sessionId);
        setQuestions(data.questions);
        // Refresh JWT so the credits pill in the navbar updates
        if (data.remainingCredits !== undefined && data.remainingCredits !== null) {
          void updateSession({ credits: data.remainingCredits });
        }
      })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : "Failed to load questions."))
      .finally(() => setLoading(false));
  }, [interviewType, difficulty, experience]);

  // ─── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || submitted) return;
    timerRef.current = setInterval(() => {
      setTime((p) => {
        if (p <= 1) { handleFinalSubmit(); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, submitted]);

  const tstr = useMemo(
    () => `${String(Math.floor(time / 60)).padStart(2, "0")}:${String(time % 60).padStart(2, "0")}`,
    [time]
  );

  const current = questions[idx] ?? null;

  // ─── Answer / Skip / Navigate ─────────────────────────────────────────────
  const selectOption = (oi: number) => {
    if (!current || submitted) return;
    setAnswers((prev) => ({ ...prev, [current.id]: oi }));
  };

  const handleNext = () => {
    if (idx < questions.length - 1) setIdx((p) => p + 1);
  };

  const handlePrev = () => {
    if (idx > 0) setIdx((p) => p - 1);
  };

  const answeredCount = Object.keys(answers).length;

  // ─── Final submit ─────────────────────────────────────────────────────────
  const handleFinalSubmit = async () => {
    if (!sessionId || submitting || submitted) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);

    try {
      const res = await fetch("/api/mcq-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answers }),
      });
      const data: SubmitResponse & { error?: string } = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setSubmitted(true);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <div className={styles.secHead}>
          <div className={styles.secLeft}>
            <span className={styles.secNum}>01 /</span>
            <h2 className={styles.secTitle}>MCQ Practice</h2>
            <span className={styles.secBadge}>Generating…</span>
          </div>
        </div>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingText}>Generating 15 questions with AI…</p>
        </div>
      </>
    );
  }

  // ─── Error state ───────────────────────────────────────────────────────────
  if (loadError || questions.length === 0) {
    return (
      <>
        <div className={styles.secHead}>
          <div className={styles.secLeft}>
            <span className={styles.secNum}>01 /</span>
            <h2 className={styles.secTitle}>MCQ Practice</h2>
          </div>
        </div>
        <div className={styles.loadingState}>
          <p className={styles.errorText}>⚠ {loadError || "No questions loaded."}</p>
          <button className={styles.btnRun} onClick={() => window.location.reload()}>Retry</button>
        </div>
      </>
    );
  }

  // ─── Results screen ────────────────────────────────────────────────────────
  if (submitted && result) {
    return (
      <>
        <div className={styles.secHead}>
          <div className={styles.secLeft}>
            <span className={styles.secNum}>01 /</span>
            <h2 className={styles.secTitle}>MCQ Results</h2>
            <span className={styles.secBadge}>{result.grade}</span>
          </div>
        </div>

        <div className={styles.mcqResultsBody}>
          {/* Score card */}
          <motion.div
            className={styles.mcqScoreCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className={styles.mcqScoreBig}>{result.percentage}%</div>
            <div className={styles.mcqScoreGrade}>{result.grade}</div>
            <div className={styles.mcqScoreRow}>
              <div className={styles.mcqScoreStat}>
                <span className={styles.mcqScoreStatVal} style={{ color: "rgba(100,220,130,.85)" }}>{result.correct}</span>
                <span className={styles.mcqScoreStatLbl}>Correct</span>
              </div>
              <div className={styles.mcqScoreStatDivider} />
              <div className={styles.mcqScoreStat}>
                <span className={styles.mcqScoreStatVal} style={{ color: "rgba(255,90,90,.8)" }}>{result.wrong}</span>
                <span className={styles.mcqScoreStatLbl}>Wrong</span>
              </div>
              <div className={styles.mcqScoreStatDivider} />
              <div className={styles.mcqScoreStat}>
                <span className={styles.mcqScoreStatVal} style={{ color: "rgba(255,255,255,.22)" }}>{result.skipped}</span>
                <span className={styles.mcqScoreStatLbl}>Skipped</span>
              </div>
              <div className={styles.mcqScoreStatDivider} />
              <div className={styles.mcqScoreStat}>
                <span className={styles.mcqScoreStatVal}>{result.total}</span>
                <span className={styles.mcqScoreStatLbl}>Total</span>
              </div>
            </div>
          </motion.div>

          {/* Per-question breakdown */}
          <div className={styles.mcqReviewList}>
            {result.results.map((q, i) => (
              <motion.div
                key={q.id}
                className={`${styles.mcqReviewItem} ${
                  q.status === "correct" ? styles.mcqReviewCorrect :
                  q.status === "wrong"   ? styles.mcqReviewWrong   :
                  styles.mcqReviewSkipped
                }`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
              >
                <div className={styles.mcqReviewHeader}>
                  <span className={styles.mcqReviewNum}>Q{q.id}</span>
                  <span className={styles.mcqReviewTag}>{q.tag}</span>
                  <span className={
                    q.status === "correct" ? styles.mcqReviewBadgeCorrect :
                    q.status === "wrong"   ? styles.mcqReviewBadgeWrong   :
                    styles.mcqReviewBadgeSkipped
                  }>
                    {q.status === "correct" ? "✓ Correct" : q.status === "wrong" ? "✗ Wrong" : "— Skipped"}
                  </span>
                </div>
                <div className={styles.mcqReviewText}>{q.text}</div>
                <div className={styles.mcqReviewOptions}>
                  {q.options.map((opt, oi) => (
                    <div
                      key={oi}
                      className={`${styles.mcqReviewOpt} ${
                        oi === q.correctAnswer  ? styles.mcqReviewOptCorrect :
                        oi === q.selectedAnswer && q.status === "wrong" ? styles.mcqReviewOptWrong :
                        ""
                      }`}
                    >
                      <span className={styles.optLetter}>{String.fromCharCode(65 + oi)}</span>
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </>
    );
  }

  // ─── Main quiz view ────────────────────────────────────────────────────────
  const selectedOption = current ? (answers[current.id] ?? null) : null;
  const timeWarning = time < 120; // last 2 minutes

  return (
    <>
      <div className={styles.secHead}>
        <div className={styles.secLeft}>
          <span className={styles.secNum}>01 /</span>
          <h2 className={styles.secTitle}>MCQ Practice</h2>
          <span className={styles.secBadge}>{questions.length} Questions</span>
        </div>
      </div>

      <div className={styles.mcqBody}>
        {/* ── Sidebar ── */}
        <aside className={styles.mcqSidebar}>
          <div className={styles.mapTitle}>Question Map</div>
          <div className={styles.mcqGrid}>
            {questions.map((q, i) => (
              <button
                key={q.id}
                className={`${styles.qnum} ${i === idx ? styles.qnumCurrent : ""} ${
                  answers[q.id] !== undefined ? styles.qnumAnswered : ""
                }`}
                onClick={() => setIdx(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <div className={styles.timerCard}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.22)", textTransform: "uppercase", letterSpacing: ".08em" }}>
              Time Remaining
            </div>
            <div className={styles.timerVal} style={timeWarning ? { color: "rgba(255,90,90,.85)" } : {}}>
              {tstr}
            </div>
            <div className={styles.timerSub}>minutes left</div>
          </div>

          <div className={styles.timerCard}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.22)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>
              Progress
            </div>
            <div className={styles.liveScoreRow}>
              <div>
                <div className={styles.liveScoreVal}>{answeredCount}</div>
                <div className={styles.liveScoreLbl}>Answered</div>
              </div>
              <div>
                <div className={styles.liveScoreValMuted}>{questions.length - answeredCount}</div>
                <div className={styles.liveScoreLbl}>Remaining</div>
              </div>
            </div>
          </div>

          <button
            className={styles.btnSubmitMcq}
            onClick={handleFinalSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting…" : `Submit All (${answeredCount}/${questions.length})`}
          </button>
        </aside>

        {/* ── Question panel ── */}
        <div className={styles.mcqMain}>
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              className={styles.mcqCard}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.mcqQuestionMeta}>
                <span>Question {idx + 1} of {questions.length}</span>
                {current && <span className={styles.mcqTag}>{current.tag}</span>}
              </div>
              {current && (
                <>
                  <div className={styles.mcqQuestion}>{current.text}</div>
                  <div className={styles.mcqOptions}>
                    {current.options.map((opt, oi) => (
                      <button
                        key={oi}
                        className={`${styles.mcqOpt} ${selectedOption === oi ? styles.mcqOptSel : ""}`}
                        onClick={() => selectOption(oi)}
                      >
                        <span className={styles.optLetter}>{String.fromCharCode(65 + oi)}</span>
                        <span>{opt}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <div className={styles.mcqActions}>
            <button className={styles.btnGhost} onClick={handlePrev} disabled={idx === 0}>
              ← Previous
            </button>
            <button className={styles.btnGhost} onClick={handleNext} disabled={idx === questions.length - 1}>
              Next →
            </button>
            <button
              className={styles.btnPrimary}
              onClick={handleFinalSubmit}
              disabled={submitting}
            >
              {submitting ? "Submitting…" : "Finish & Submit"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
