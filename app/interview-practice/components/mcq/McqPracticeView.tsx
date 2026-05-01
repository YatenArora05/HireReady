"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import styles from "../../practice.module.css";

const questionSet = [
  {
    text: "What is the time complexity of searching in a balanced BST?",
    tag: "Data Structures",
    difficulty: "Medium",
    options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
    answer: 1,
  },
  {
    text: "Which sorting algorithm has the best average-case time complexity?",
    tag: "Algorithms",
    difficulty: "Medium",
    options: ["Bubble Sort", "Insertion Sort", "Merge Sort", "Quick Sort"],
    answer: 3,
  },
  {
    text: "In React, what hook is used to run side effects after render?",
    tag: "React",
    difficulty: "Easy",
    options: ["useState", "useCallback", "useEffect", "useMemo"],
    answer: 2,
  },
  {
    text: "What does REST stand for?",
    tag: "Web APIs",
    difficulty: "Easy",
    options: ["Rapid Endpoint State Transfer", "Representational State Transfer", "Remote Execution Service Technology", "Relational Endpoint Storage Transfer"],
    answer: 1,
  },
  {
    text: "Which HTTP status code represents 'Not Found'?",
    tag: "HTTP",
    difficulty: "Easy",
    options: ["200", "301", "400", "404"],
    answer: 3,
  },
];

export default function McqPracticeView() {
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [time, setTime] = useState(18 * 60);
  const [correct, setCorrect] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [answeredMap, setAnsweredMap] = useState<(null | "correct" | "wrong" | "skipped")[]>(Array(15).fill(null));

  useEffect(() => {
    const t = setInterval(() => setTime((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const tstr = useMemo(() => `${String(Math.floor(time / 60)).padStart(2, "0")}:${String(time % 60).padStart(2, "0")}`, [time]);
  const current = questionSet[idx % questionSet.length];

  const handleSubmit = () => {
    if (sel === null) return;
    const isCorrect = sel === current.answer;
    setAnsweredMap((prev) => {
      const copy = [...prev];
      copy[idx] = isCorrect ? "correct" : "wrong";
      return copy;
    });
    if (isCorrect) setCorrect((p) => p + 1);
    setSel(null);
    setIdx((p) => Math.min(14, p + 1));
  };

  const handleSkip = () => {
    setSkipped((p) => p + 1);
    setAnsweredMap((prev) => {
      const copy = [...prev];
      copy[idx] = "skipped";
      return copy;
    });
    setSel(null);
    setIdx((p) => Math.min(14, p + 1));
  };

  return (
    <>
      <div className={styles.secHead}>
        <div className={styles.secLeft}>
          <span className={styles.secNum}>01 /</span>
          <h2 className={styles.secTitle}>MCQ Practice</h2>
          <span className={styles.secBadge}>15 Questions</span>
        </div>
      </div>
      <div className={styles.mcqBody}>
        <aside className={styles.mcqSidebar}>
          <div className={styles.mapTitle}>Question Map</div>
          <div className={styles.mcqGrid}>
            {Array.from({ length: 15 }).map((_, i) => (
              <button
                key={i}
                className={`${styles.qnum} ${i === idx ? styles.qnumCurrent : ""} ${
                  answeredMap[i] === "correct" ? styles.qnumCorrect : answeredMap[i] === "wrong" ? styles.qnumWrong : ""
                }`}
                onClick={() => setIdx(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className={styles.timerCard}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.22)", textTransform: "uppercase", letterSpacing: ".08em" }}>Time Remaining</div>
            <div className={styles.timerVal}>{tstr}</div>
            <div className={styles.timerSub}>minutes left</div>
          </div>
          <div className={styles.timerCard}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.22)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Live Score</div>
            <div className={styles.liveScoreRow}>
              <div>
                <div className={styles.liveScoreVal}>{correct}</div>
                <div className={styles.liveScoreLbl}>Correct</div>
              </div>
              <div>
                <div className={styles.liveScoreValMuted}>{skipped}</div>
                <div className={styles.liveScoreLbl}>Skipped</div>
              </div>
            </div>
          </div>
        </aside>
        <div className={styles.mcqMain}>
          <motion.div className={styles.mcqCard} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className={styles.mcqQuestionMeta}>
              <span>Question {idx + 1}</span>
              <span className={styles.mcqTag}>{current.tag}</span>
              <span className={styles.mcqTag}>{current.difficulty}</span>
            </div>
            <div className={styles.mcqQuestion}>{current.text}</div>
            <div className={styles.mcqOptions}>
              {current.options.map((opt, oi) => (
                <button key={opt} className={`${styles.mcqOpt} ${sel === oi ? styles.mcqOptSel : ""}`} onClick={() => setSel(oi)}>
                  <span className={styles.optLetter}>{String.fromCharCode(65 + oi)}</span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          </motion.div>
          <div className={styles.mcqActions}>
            <button className={styles.btnGhost} onClick={() => setIdx((p) => Math.max(0, p - 1))}>← Previous</button>
            <button className={styles.btnGhost} onClick={handleSkip}>Skip →</button>
            <button className={styles.btnPrimary} onClick={handleSubmit}>Submit Answer</button>
          </div>
        </div>
      </div>
    </>
  );
}

