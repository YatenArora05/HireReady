"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "../../interview-start.module.css";

const analyzeSteps = [
  "Reading document...",
  "Extracting skills...",
  "Scoring experience...",
  "Matching role fit...",
  "Finalising insights...",
];

type Analysis = { score: number; tags: string[] };
type ResumeExtract = { role: string; experience: string; projects: string[]; skills: string[] };

export default function SetupForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const userCredits = session?.user?.credits ?? 100;

  const [role] = useState("Software Engineer");
  const [experience, setExperience] = useState("");
  const [practiceType, setPracticeType] = useState("ai-voice");
  const [type, setType] = useState("technical");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [fileName, setFileName] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [analyzeVisible, setAnalyzeVisible] = useState(false);
  const [analysisStep, setAnalysisStep] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [startText, setStartText] = useState("Start Interview  →");
  const [expError, setExpError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCodingLocked = type !== "technical";

  const uploadSub = useMemo(
    () => (fileName ? "Uploaded successfully — AI will personalise your questions" : "PDF or DOCX — for deeper AI feedback"),
    [fileName]
  );

  const handleInterviewTypeChange = (val: string) => {
    setType(val);
    // Auto-reset practice type if coding is not allowed for the new interview type
    if (val !== "technical" && practiceType === "coding") {
      setPracticeType("ai-voice");
    }
  };

  const handlePracticeTypeChange = (val: string) => {
    if (val === "coding" && isCodingLocked) return;
    setPracticeType(val);
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setResumeFile(file);
    setAnalyzeVisible(true);
    setAnalysis(null);
    setAnalysisStep("");
    setAnalyzeError("");
  };

  const runAnalyze = async () => {
    if (!resumeFile || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalyzeError("");
    let idx = 0;
    setAnalysisStep(analyzeSteps[0]);
    const stepTimer = setInterval(() => {
      idx += 1;
      if (idx < analyzeSteps.length) {
        setAnalysisStep(analyzeSteps[idx]);
      }
    }, 620);

    try {
      const formData = new FormData();
      formData.append("resume", resumeFile);

      const response = await fetch("/api/resume-analyze", {
        method: "POST",
        body: formData,
      });

      const raw = await response.text();
      let data: unknown = null;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error("Resume analyzer returned invalid response. Please try again.");
      }

      const result = data as {
        error?: string;
        extract?: ResumeExtract;
        analysis?: Analysis;
      };

      if (!response.ok) {
        throw new Error(result.error || "Failed to analyze resume.");
      }

      const extract = result.extract as ResumeExtract;
      const nextAnalysis = result.analysis as Analysis;

      if (extract.experience && !experience.trim()) setExperience(extract.experience);
      setAnalysis(nextAnalysis);
      setAnalysisStep("Analysis complete");
    } catch (error) {
      setAnalyzeError(error instanceof Error ? error.message : "Failed to analyze resume.");
      setAnalysisStep("Analysis failed");
    } finally {
      clearInterval(stepTimer);
      setIsAnalyzing(false);
    }
  };

  const resetUpload = () => {
    setFileName("");
    setResumeFile(null);
    setAnalyzeVisible(false);
    setAnalysisStep("");
    setAnalysis(null);
    setAnalyzeError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleStart = () => {
    const missingExp = !experience.trim();
    setExpError(missingExp);
    if (missingExp) return;

    // Block if insufficient credits
    if (session?.user && userCredits < 10) {
      setIsStarting(false);
      setStartText("Start Interview  →");
      // Show insufficient credits message inline
      setExpError(false);
      alert("You don't have enough credits to start a practice session. Please upgrade your plan to continue.");
      return;
    }

    setIsStarting(true);
    setStartText("Setting up your interview...");
    setTimeout(() => setStartText("Generating questions..."), 1200);
    setTimeout(() => {
      setIsStarting(false);
      setStartText("Ready! Starting now  ✓");
      const targetPath =
        practiceType === "mcq"
          ? `/interview-practice/mcq?type=${encodeURIComponent(type)}&difficulty=${encodeURIComponent(difficulty)}&experience=${encodeURIComponent(experience)}`
          : practiceType === "coding"
          ? `/interview-practice/coding?experience=${encodeURIComponent(experience)}&difficulty=${encodeURIComponent(difficulty)}`
          : `/interview-practice/voice?type=${encodeURIComponent(type)}&difficulty=${encodeURIComponent(difficulty)}&experience=${encodeURIComponent(experience)}`;
      router.push(targetPath);
    }, 2500);
  };

  return (
    <div className={styles.rightPanel}>
      <motion.div className={styles.steps} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}>
        <div className={`${styles.stepItem} ${styles.stepActive}`}>
          <div className={styles.stepDot}>1</div>
          <span>Setup</span>
        </div>
        <div className={styles.stepLine} />
        <div className={styles.stepItem}>
          <div className={styles.stepDot}>2</div>
          <span>Practice</span>
        </div>
        <div className={styles.stepLine} />
        <div className={styles.stepItem}>
          <div className={styles.stepDot}>3</div>
          <span>Results</span>
        </div>
      </motion.div>

      <motion.div className={styles.rpHeader} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.38 }}>
        <h2>Interview Setup</h2>
        <p>Configure your session and we&apos;ll tailor everything for you.</p>
      </motion.div>

      <motion.div className={styles.formRow2} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5 }}>
        <div className={styles.fieldWrap}>
          <label className={styles.fieldLabel}>Job Role</label>
          <input
            className={`${styles.fieldInput} ${styles.fieldInputReadonly}`}
            value={role}
            readOnly
            placeholder="Software Engineer"
          />
        </div>
        <div className={styles.fieldWrap}>
          <label className={styles.fieldLabel}>Experience</label>
          <input
            className={`${styles.fieldInput} ${expError ? styles.fieldInputError : ""}`}
            value={experience}
            onChange={(e) => {
              setExperience(e.target.value);
              if (expError) setExpError(false);
            }}
            placeholder="e.g. 2 years"
          />
        </div>
      </motion.div>

      <motion.div className={styles.formGroup} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.62 }}>
        <label className={styles.fieldLabel}>Interview Type</label>
        <select
          className={styles.selectInput}
          value={type}
          onChange={(e) => handleInterviewTypeChange(e.target.value)}
        >
          <option value="technical">Technical Interview</option>
          <option value="behavioral">Behavioral Interview</option>
          <option value="hr">HR / Screening Round</option>
          {/* <option value="case">Case Study Interview</option>
          <option value="system">System Design Interview</option>
          <option value="mixed">Mixed (Technical + Behavioral)</option> */}
        </select>
      </motion.div>

      <motion.div className={styles.formGroup} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.74 }}>
        <label className={styles.fieldLabel}>Difficulty Level</label>
        <select className={styles.selectInput} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="beginner">Beginner — Entry level</option>
          <option value="intermediate">Intermediate — Mid level</option>
          <option value="advanced">Advanced — Senior level</option>
          <option value="expert">Expert — Staff / Principal</option>
        </select>
      </motion.div>

      <motion.div className={styles.formGroup} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.86 }}>
        <label className={styles.fieldLabel}>Practice Type</label>
        <select
          className={styles.selectInput}
          value={practiceType}
          onChange={(e) => handlePracticeTypeChange(e.target.value)}
        >
          <option value="mcq">MCQ Practice</option>
          <option value="ai-voice">AI Voice Interview</option>
          <option value="coding" disabled={isCodingLocked}>
            Coding Question Practice{isCodingLocked ? " — Technical only" : ""}
          </option>
        </select>
        {isCodingLocked && (
          <p className={styles.practiceTypeHint}>
            ⚠ Coding Question Practice is only available for Technical Interviews.
          </p>
        )}
      </motion.div>

      <motion.div className={styles.formGroup} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.94 }}>
        <label className={styles.fieldLabel}>
          Resume <span className={styles.optionalBadge}>Optional</span>
        </label>
        <label className={`${styles.uploadZone} ${fileName ? styles.uploadZoneDone : ""}`}>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className={styles.hiddenInput}
          />
          <span className={styles.uploadLabel}>{fileName || "Click to upload resume"}</span>
          <span className={styles.uploadSub}>{uploadSub}</span>
        </label>
      </motion.div>

      <motion.div className={`${styles.analyzeWrap} ${analyzeVisible ? styles.visible : ""}`} initial={false}>
        <button type="button" className={`${styles.btnAnalyze} ${isAnalyzing ? styles.analyzing : ""}`} onClick={runAnalyze}>
          {analysisStep || "Analyze Resume"}
        </button>
        {analyzeError ? <p className={styles.analyzeError}>{analyzeError}</p> : null}

        <div className={`${styles.analysisResult} ${analysis ? styles.visible : ""}`}>
          <div className={styles.arHeader}>
            <span className={styles.arTitle}>Resume Analysis</span>
            <div>
              <div className={styles.arScoreBig}>{analysis ? `${analysis.score}%` : "—"}</div>
              <div className={styles.arScoreLbl}>Match score</div>
            </div>
          </div>
          <div className={styles.arTags}>
            {(analysis?.tags ?? []).map((tag) => (
              <span className={styles.arTag} key={tag}>
                {tag}
              </span>
            ))}
          </div>
          <button type="button" className={styles.arReupload} onClick={resetUpload}>
            ↩ Upload different resume
          </button>
        </div>
      </motion.div>

      <motion.button
        type="button"
        className={`${styles.btnSubmit} ${isStarting ? styles.loading : ""}`}
        onClick={handleStart}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.98 }}
        disabled={isStarting || (session?.user !== undefined && userCredits < 10)}
      >
        {startText}
      </motion.button>

      {session?.user && userCredits < 10 && (
        <p style={{ fontSize: 12, color: "rgba(255,90,90,.85)", textAlign: "center", marginTop: 8 }}>
          ⚠ Insufficient credits ({userCredits} remaining). Upgrade your plan to continue.
        </p>
      )}
      {session?.user && userCredits >= 10 && (
        <p style={{ fontSize: 11, color: "rgba(255,255,255,.22)", textAlign: "center", marginTop: 8 }}>
          10 credits will be deducted · {userCredits} remaining
        </p>
      )}
    </div>
  );
}
