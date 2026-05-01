"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import styles from "../../interview-start.module.css";

const analyzeSteps = [
  "Reading document...",
  "Extracting skills...",
  "Scoring experience...",
  "Matching role fit...",
  "Finalising insights...",
];

type Analysis = { score: number; exp: number; skill: number; comp: number; ats: number; tags: string[] };

const finalAnalysis: Analysis = {
  score: 82,
  exp: 78,
  skill: 85,
  comp: 90,
  ats: 74,
  tags: ["React", "Node.js", "REST APIs", "Team Lead", "Agile", "SQL", "AWS"],
};

export default function SetupForm() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const [practiceType, setPracticeType] = useState("ai-voice");
  const [type, setType] = useState("technical");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [fileName, setFileName] = useState("");
  const [analyzeVisible, setAnalyzeVisible] = useState(false);
  const [analysisStep, setAnalysisStep] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startText, setStartText] = useState("Start Interview  →");
  const [roleError, setRoleError] = useState(false);
  const [expError, setExpError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadSub = useMemo(
    () => (fileName ? "Uploaded successfully — AI will personalise your questions" : "PDF or DOCX — for deeper AI feedback"),
    [fileName]
  );

  const handleFile = (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setAnalyzeVisible(true);
    setAnalysis(null);
    setAnalysisStep("");
  };

  const runAnalyze = () => {
    if (!fileName || isAnalyzing || analysis) return;
    setIsAnalyzing(true);
    let idx = 0;
    setAnalysisStep(analyzeSteps[0]);
    const timer = setInterval(() => {
      idx += 1;
      if (idx < analyzeSteps.length) {
        setAnalysisStep(analyzeSteps[idx]);
      } else {
        clearInterval(timer);
        setIsAnalyzing(false);
        setAnalysisStep("Analysis complete");
        setAnalysis(finalAnalysis);
      }
    }, 620);
  };

  const resetUpload = () => {
    setFileName("");
    setAnalyzeVisible(false);
    setAnalysisStep("");
    setAnalysis(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleStart = () => {
    const missingRole = !role.trim();
    const missingExp = !experience.trim();
    setRoleError(missingRole);
    setExpError(missingExp);
    if (missingRole || missingExp) return;

    setIsStarting(true);
    setStartText("Setting up your interview...");
    setTimeout(() => setStartText("Generating questions..."), 1200);
    setTimeout(() => {
      setIsStarting(false);
      setStartText("Ready! Starting now  ✓");
      const targetPath =
        practiceType === "mcq"
          ? "/interview-practice/mcq"
          : practiceType === "coding"
          ? "/interview-practice/coding"
          : "/interview-practice/voice";
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
            className={`${styles.fieldInput} ${roleError ? styles.fieldInputError : ""}`}
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              if (roleError) setRoleError(false);
            }}
            placeholder="e.g. Software Engineer"
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
        <select className={styles.selectInput} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="technical">Technical Interview</option>
          <option value="behavioral">Behavioral Interview</option>
          <option value="hr">HR / Screening Round</option>
          <option value="case">Case Study Interview</option>
          <option value="system">System Design Interview</option>
          <option value="mixed">Mixed (Technical + Behavioral)</option>
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
        <select className={styles.selectInput} value={practiceType} onChange={(e) => setPracticeType(e.target.value)}>
          <option value="mcq">MCQ Practice</option>
          <option value="ai-voice">AI Voice Interview</option>
          <option value="coding">Coding Question Practice</option>
        </select>
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

        <div className={`${styles.analysisResult} ${analysis ? styles.visible : ""}`}>
          <div className={styles.arHeader}>
            <span className={styles.arTitle}>Resume Analysis</span>
            <div>
              <div className={styles.arScoreBig}>{analysis ? `${analysis.score}%` : "—"}</div>
              <div className={styles.arScoreLbl}>Match score</div>
            </div>
          </div>
          <div className={styles.arBody}>
            {[
              ["Experience", analysis?.exp ?? 0],
              ["Skills match", analysis?.skill ?? 0],
              ["Completeness", analysis?.comp ?? 0],
              ["ATS score", analysis?.ats ?? 0],
            ].map(([label, value]) => (
              <div className={styles.arSkillRow} key={label}>
                <span className={styles.arSkillName}>{label}</span>
                <div className={styles.arBarTrack}>
                  <div className={styles.arBarFill} style={{ width: `${value}%` }} />
                </div>
                <span className={styles.arSkillVal}>{analysis ? `${value}%` : "—"}</span>
              </div>
            ))}
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
      >
        {startText}
      </motion.button>
    </div>
  );
}

