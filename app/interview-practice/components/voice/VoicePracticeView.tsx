"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "../../practice.module.css";

const qs = [
  "Tell me about a challenging project you worked on and how you overcame obstacles to deliver results successfully.",
  "Describe a time when you had to work with a difficult team member.",
  "Walk me through your approach to debugging a critical production issue.",
  "Tell me about a time you had to learn a new technology quickly for a project.",
  "Describe your approach to code reviews and what you look for.",
];

export default function VoicePracticeView() {
  const [q, setQ] = useState(0);
  const [recording, setRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180);
  const [feedback, setFeedback] = useState("Submit an answer to receive detailed AI coaching feedback on your response.");
  const [scores, setScores] = useState({ clarity: "—", structure: "—", confidence: "—" });

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setRecording(false);
          return 180;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [recording]);

  const timerText = useMemo(() => {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }, [timeLeft]);

  const submitVoice = () => {
    if (recording) setRecording(false);
    setTimeLeft(180);
    setScores({ clarity: "82", structure: "75", confidence: "88" });
    setFeedback(
      "Strong opening with clear context. Consider using the STAR method more explicitly. Your situation and task were clear, but the action steps can be more specific."
    );
    setQ((prev) => Math.min(4, prev + 1));
  };

  return (
    <>
      <div className={styles.secHead}>
        <div className={styles.secLeft}>
          <span className={styles.secNum}>02 /</span>
          <h2 className={styles.secTitle}>Voice Interview</h2>
          <span className={styles.secBadge}>AI Interviewer</span>
        </div>
      </div>
      <div className={styles.voiceBody}>
        <div className={styles.voiceLeft}>
          <div className={styles.avatarZone}>
            <div className={styles.avatarFrame}>
              <div className={styles.avatarInner}>
                <div className={styles.aiFace}>
                  <div className={styles.aiFaceRing} />
                  <div className={styles.aiFaceRing2} />
                  <div className={styles.aiSpeakingRing} />
                  <div className={styles.aiFaceCore}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <circle cx="10" cy="10" r="3" fill="rgba(255,255,255,0.5)" />
                      <path
                        d="M10 4v2M10 14v2M4 10H2M18 10h-2M5.64 5.64l1.42 1.42M12.94 12.94l1.42 1.42M5.64 14.36l1.42-1.42M12.94 7.06l1.42-1.42"
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.avatarStatus}>
              <span className={styles.statusIndicator} />
              <span>AI Speaking</span>
            </div>
            <div className={styles.soundWave}>
              <div className={styles.waveBar} />
              <div className={styles.waveBar} />
              <div className={styles.waveBar} />
              <div className={styles.waveBar} />
              <div className={styles.waveBar} />
              <div className={styles.waveBar} />
              <div className={styles.waveBar} />
            </div>
            <div className={styles.avatarSpeech}>"I'll ask you a few questions. Just answer naturally, and take your time."</div>
          </div>
          <div className={styles.resultZone}>
            <div className={styles.resultTitleRow}>
              <span className={styles.resultTitle}>Live Score</span>
              <span className={styles.resultLiveBadge}>
                <span className={styles.resultLiveDot} />
                Real-time
              </span>
            </div>
            <div className={styles.scoreRow}>
              <div className={styles.scoreChip}><div className={styles.chipVal}>{scores.clarity}</div><div className={styles.chipLbl}>Clarity</div></div>
              <div className={styles.scoreChip}><div className={styles.chipVal}>{scores.structure}</div><div className={styles.chipLbl}>Structure</div></div>
              <div className={styles.scoreChip}><div className={styles.chipVal}>{scores.confidence}</div><div className={styles.chipLbl}>Confidence</div></div>
            </div>
            <div className={styles.feedbackBox}>
              <div className={styles.feedbackHead}>AI Feedback</div>
              <div className={styles.feedbackText}>{feedback}</div>
            </div>
          </div>
        </div>
        <div className={styles.voiceRight}>
          <div className={styles.voiceRightHead}>Question {q + 1} of 5</div>
          <div className={styles.vrQuestionWrap}>
            <div className={styles.vrQuestionLabel}>Current Question</div>
            <div className={styles.vrQuestion}>{qs[q]}</div>
            <div className={styles.vrAnswerArea}>
              <textarea className={styles.vrTextarea} placeholder="Type your answer here, or press the mic button to record your voice response..." />
            </div>
          </div>
          <div className={styles.vrBottom}>
            <button className={`${styles.micBtn} ${recording ? styles.micBtnRecording : ""}`} onClick={() => setRecording((p) => !p)}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <rect x="6" y="1.5" width="6" height="9" rx="3" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" />
                <path d="M3 9a6 6 0 0012 0" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" strokeLinecap="round" />
                <line x1="9" y1="15" x2="9" y2="17" stroke="rgba(255,255,255,0.5)" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </button>
            <div className={styles.micLabel}>{recording ? "Recording... speak your answer" : "Press mic to record your answer"}</div>
            <div className={styles.voiceTimer}>{timerText}</div>
            <button className={styles.btnPrimary} onClick={submitVoice}>Submit Answer</button>
          </div>
        </div>
      </div>
    </>
  );
}

