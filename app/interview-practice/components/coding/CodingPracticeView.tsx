"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "../../practice.module.css";

// ─── Language slug mapping ────────────────────────────────────────────────────
const LANG_SLUG: Record<string, string> = {
  js:   "javascript",
  py:   "python3",
  java: "java",
  cpp:  "cpp",
};

// ─── Fallback templates ───────────────────────────────────────────────────────
function buildFallbackTemplate(lang: string, title: string): string {
  const fn = title
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^./, (c) => c.toLowerCase());
  const t: Record<string, string> = {
    js:   `/**\n * @param {*} input\n * @return {*}\n */\nvar ${fn} = function(input) {\n    \n};\n`,
    py:   `class Solution:\n    def ${fn}(self, input):\n        pass\n`,
    java: `class Solution {\n    public Object ${fn}(Object input) {\n        return null;\n    }\n}`,
    cpp:  `class Solution {\npublic:\n    // Your solution here\n};\n`,
  };
  return t[lang] ?? t.js;
}

// ─── HTML stripper ────────────────────────────────────────────────────────────
function stripHtml(html: string): string {
  return html
    .replace(/<pre>([\s\S]*?)<\/pre>/gi, (_, inner) =>
      inner.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    )
    .replace(/<strong class="example">(.*?)<\/strong>/gi, "$1")
    .replace(/<\/?strong>/gi, "").replace(/<\/?em>/gi, "")
    .replace(/<\/?code>/gi, "`").replace(/<\/?p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/?ul>/gi, "")
    .replace(/<\/?li>/gi, "\n• ").replace(/<\/?span[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n").trim();
}

function parseExamples(text: string): { label: string; body: string }[] {
  const examples: { label: string; body: string }[] = [];
  const regex = /Example\s+(\d+)[:.]?\s*([\s\S]*?)(?=Example\s+\d+|Constraints|$)/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    examples.push({ label: `Example ${match[1]}`, body: match[2].trim() });
  }
  return examples;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type TestCase = { input: string[]; expected: string };

type Question = {
  questionId: string;
  title: string;
  titleSlug: string;
  difficulty: string;
  content: string;
  exampleTestcases: string;
  topicTags: string[];
  hints: string[];
  codeSnippets: { lang: string; langSlug: string; code: string }[];
  visibleTestCases: TestCase[];
};

type TestResult = {
  index: number;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
};

type RunResponse = {
  error?: string;
  details?: string;
  passed?: number;
  total?: number;
  runtime?: string;
  memory?: string;
  testResults?: TestResult[];
  stdout?: string;
};

type SubmitResponse = {
  error?: string;
  verdict?: string;
  passed?: number;
  total?: number;
  runtime?: string;
  memory?: string;
  testResults?: TestResult[];
  aiFeedback?: string;
};

function getSnippet(question: Question, lang: string): string {
  const slug = LANG_SLUG[lang];
  const match = question.codeSnippets?.find((s) => s.langSlug === slug);
  return match?.code ?? buildFallbackTemplate(lang, question.title);
}

const DIFF_STYLE: Record<string, string> = {
  Easy: styles.diffEasy,
  Medium: styles.diffMedium,
  Hard: styles.diffHard,
};

export default function CodingPracticeView() {
  const searchParams = useSearchParams();
  const experience = searchParams.get("experience") ?? "1 year";
  const difficulty = searchParams.get("difficulty") ?? "intermediate";

  const { update: updateSession } = useSession();

  const [question, setQuestion] = useState<Question | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const [lang, setLang] = useState("js");
  const [code, setCode] = useState("");

  const [activeTab, setActiveTab] = useState<"console" | "tests" | "submit">("console");
  const [consoleLines, setConsoleLines] = useState<{ text: string; type: "info" | "success" | "error" }[]>([
    { text: "› Ready. Press Run to execute your code.", type: "info" },
  ]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [runMeta, setRunMeta] = useState<{ runtime: string; memory: string } | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitLabel, setSubmitLabel] = useState("Submit");

  // ─── Fetch question ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError("");

      try {
        const res = await fetch(
          `/api/leetcode-question?experience=${encodeURIComponent(experience)}&difficulty=${encodeURIComponent(difficulty)}`
        );
        const data = await res.json() as Question & { error?: string; needsSync?: boolean; remainingCredits?: number };

        if (cancelled) return;

        // Problem cache is empty — trigger sync then retry once
        if (data.needsSync) {
          setConsoleLines([{ text: "› First run: syncing problem list from LeetCode (30–60s)…", type: "info" }]);
          const syncRes = await fetch("/api/leetcode-sync", { method: "POST" });
          if (!syncRes.ok) throw new Error("Failed to sync problem list from LeetCode.");
          if (cancelled) return;

          // Retry question fetch after sync
          const retryRes = await fetch(
            `/api/leetcode-question?experience=${encodeURIComponent(experience)}&difficulty=${encodeURIComponent(difficulty)}`
          );
          const retryData = await retryRes.json() as Question & { error?: string; remainingCredits?: number };
          if (retryData.error) throw new Error(retryData.error);
          setQuestion(retryData);
          setCode(getSnippet(retryData, "js"));
          if (typeof retryData.remainingCredits === "number") {
            void updateSession({ credits: retryData.remainingCredits });
          }
          return;
        }

        if (data.error) throw new Error(data.error);
        setQuestion(data);
        setCode(getSnippet(data, "js"));
        // Refresh JWT so the credits pill in the navbar updates
        if (typeof data.remainingCredits === "number") {
          void updateSession({ credits: data.remainingCredits });
        }
      } catch (err: unknown) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load question.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [experience, difficulty]);

  const handleLangChange = (newLang: string) => {
    setLang(newLang);
    if (question) setCode(getSnippet(question, newLang));
  };

  const lineCount = useMemo(() => Math.max(20, code.split("\n").length), [code]);
  const fileName = useMemo(() => `solution.${lang}`, [lang]);
  const cleanContent = useMemo(() => (question ? stripHtml(question.content) : ""), [question]);
  const examples = useMemo(() => parseExamples(cleanContent), [cleanContent]);
  const problemText = useMemo(() =>
    cleanContent.replace(/Example\s+\d+[\s\S]*?((?=Example\s+\d+)|(?=Constraints)|$)/gi, "").trim(),
    [cleanContent]
  );
  const constraints = useMemo(() => {
    const match = cleanContent.match(/Constraints[:\s]*([\s\S]*?)(?=Follow-up|$)/i);
    return match ? match[1].trim() : "";
  }, [cleanContent]);

  // ─── Run ────────────────────────────────────────────────────────────────────
  const run = async () => {
    if (!question || isRunning) return;
    setIsRunning(true);
    setActiveTab("console");
    setConsoleLines([{ text: "› Running your code against visible test cases…", type: "info" }]);
    setTestResults([]);
    setRunMeta(null);

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.questionId,
          language: LANG_SLUG[lang],
          code,
        }),
      });
      const data: RunResponse = await res.json();

      if (data.error) {
        setConsoleLines([
          { text: `› ${data.error}`, type: "error" },
          ...(data.details ? [{ text: data.details, type: "error" as const }] : []),
        ]);
        return;
      }

      const results = data.testResults ?? [];
      setTestResults(results);
      setRunMeta({ runtime: data.runtime ?? "N/A", memory: data.memory ?? "N/A" });

      const passed = data.passed ?? 0;
      const total = data.total ?? 0;

      setConsoleLines([
        { text: `› Executed ${total} test case${total !== 1 ? "s" : ""}`, type: "info" },
        {
          text: `› ${passed}/${total} passed · Runtime: ${data.runtime ?? "N/A"} · Memory: ${data.memory ?? "N/A"}`,
          type: passed === total ? "success" : "error",
        },
      ]);

      setActiveTab("tests");
    } catch (err) {
      setConsoleLines([{ text: `› Error: ${err instanceof Error ? err.message : "Unknown error"}`, type: "error" }]);
    } finally {
      setIsRunning(false);
    }
  };

  // ─── Submit ─────────────────────────────────────────────────────────────────
  const submit = async () => {
    if (!question || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitLabel("Submitting…");
    setActiveTab("submit");
    setSubmitResult(null);
    setConsoleLines([{ text: "› Running hidden test cases…", type: "info" }]);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.questionId,
          language: LANG_SLUG[lang],
          code,
        }),
      });
      const data: SubmitResponse = await res.json();
      setSubmitResult(data);

      if (data.verdict === "Accepted") {
        setSubmitLabel("✓ Accepted");
        setConsoleLines([{ text: `› ✓ Accepted — ${data.passed}/${data.total} test cases passed`, type: "success" }]);
      } else {
        setSubmitLabel("Submit");
        setConsoleLines([
          { text: `› ${data.verdict ?? "Wrong Answer"} — ${data.passed}/${data.total} passed`, type: "error" },
        ]);
      }
    } catch (err) {
      setConsoleLines([{ text: `› Submission error: ${err instanceof Error ? err.message : "Unknown"}`, type: "error" }]);
      setSubmitLabel("Submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCode = () => {
    if (question) setCode(getSnippet(question, lang));
    setActiveTab("console");
    setConsoleLines([{ text: "› Code reset to template.", type: "info" }]);
    setTestResults([]);
    setSubmitResult(null);
    setSubmitLabel("Submit");
    setRunMeta(null);
  };

  // ─── Loading / Error states ──────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <div className={styles.secHead}>
          <div className={styles.secLeft}>
            <span className={styles.secNum}>03 /</span>
            <h2 className={styles.secTitle}>Coding Challenge</h2>
            <span className={styles.secBadge}>Loading…</span>
          </div>
        </div>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingText}>
            {consoleLines.some(l => l.text.includes("syncing"))
              ? "Syncing problem list"
              : "Fetching your question "}
          </p>
        </div>
      </>
    );
  }

  if (loadError || !question) {
    return (
      <>
        <div className={styles.secHead}>
          <div className={styles.secLeft}>
            <span className={styles.secNum}>03 /</span>
            <h2 className={styles.secTitle}>Coding Challenge</h2>
          </div>
        </div>
        <div className={styles.loadingState}>
          <p className={styles.errorText}>⚠ {loadError || "Could not load question."}</p>
          <button className={styles.btnRun} onClick={() => window.location.reload()}>Retry</button>
        </div>
      </>
    );
  }

  const diffClass = DIFF_STYLE[question.difficulty] ?? styles.diffMedium;

  return (
    <>
      <div className={styles.secHead}>
        <div className={styles.secLeft}>
          <span className={styles.secNum}>03 /</span>
          <h2 className={styles.secTitle}>Coding Challenge</h2>
          <span className={styles.secBadge}>1 Problem</span>
        </div>
      </div>

      <div className={styles.codeBody}>
        {/* ── Problem Panel ── */}
        <aside className={styles.probPanel}>
          <div className={styles.probHead}>
            <div className={styles.probTitle}>{question.title}</div>
            <div className={styles.probMeta}>
              <span className={`${styles.diffBadge} ${diffClass}`}>{question.difficulty}</span>
              {question.topicTags.slice(0, 3).map((tag) => (
                <span key={tag} className={styles.catBadge}>{tag}</span>
              ))}
            </div>
          </div>
          <div className={styles.probBody}>
            <div className={styles.probSection}>
              <div className={styles.probSecTitle}>Problem</div>
              <p className={styles.probDesc} style={{ whiteSpace: "pre-wrap" }}>
                {problemText.split("`").map((part, i) =>
                  i % 2 === 1 ? <code key={i}>{part}</code> : part
                )}
              </p>
            </div>
            {examples.map((ex) => (
              <div className={styles.exampleBox} key={ex.label}>
                <div className={styles.exampleLabel}>{ex.label}</div>
                <pre>{ex.body}</pre>
              </div>
            ))}
            {constraints ? (
              <div className={styles.probSection}>
                <div className={styles.probSecTitle}>Constraints</div>
                <ul className={styles.constraintList}>
                  {constraints.split("\n").map((c) => c.replace(/^•\s*/, "").trim()).filter(Boolean).map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {question.hints.length > 0 && (
              <div className={styles.probSection}>
                <div className={styles.probSecTitle}>Hint</div>
                <p className={styles.probDesc}>{question.hints[0]}</p>
              </div>
            )}
            {/* <div className={styles.probSection}>
              <a href={`https://leetcode.com/problems/${question.titleSlug}/`} target="_blank" rel="noopener noreferrer" className={styles.lcLink}>
                View on LeetCode →
              </a>
            </div> */}
          </div>
        </aside>

        {/* ── Editor Panel ── */}
        <div className={styles.editorPanel}>
          {/* Toolbar */}
          <div className={styles.editorTop}>
            <select className={styles.langSelect} value={lang} onChange={(e) => handleLangChange(e.target.value)}>
              <option value="js">JavaScript</option>
              <option value="py">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
            </select>
            <div className={styles.fileName}>{fileName}</div>
            <div className={styles.editorActions}>
              <button className={styles.btnReset} onClick={resetCode}>Reset</button>
              <button
                className={styles.btnRun}
                onClick={run}
                disabled={isRunning}
                style={{ opacity: isRunning ? 0.6 : 1 }}
              >
                {isRunning ? "Running…" : "Run"}
              </button>
              <button
                className={styles.btnSubmitCode}
                onClick={submit}
                disabled={isSubmitting}
                style={{ opacity: isSubmitting ? 0.6 : 1 }}
              >
                {submitLabel}
              </button>
            </div>
          </div>

          {/* Code textarea */}
          <div className={styles.codeWrap}>
            <div className={styles.codeLines}>
              {Array.from({ length: lineCount }).map((_, i) => (
                <div className={styles.lineNum} key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              className={styles.codeTextarea}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
            />
          </div>

          {/* Console / Test / Submit tabs */}
          <div className={styles.consoleTabs}>
            <button className={`${styles.ctab} ${activeTab === "console" ? styles.ctabActive : ""}`} onClick={() => setActiveTab("console")}>
              Console
            </button>
            <button className={`${styles.ctab} ${activeTab === "tests" ? styles.ctabActive : ""}`} onClick={() => setActiveTab("tests")}>
              Test Cases {testResults.length > 0 && `(${testResults.filter((r) => r.passed).length}/${testResults.length})`}
            </button>
            <button className={`${styles.ctab} ${activeTab === "submit" ? styles.ctabActive : ""}`} onClick={() => setActiveTab("submit")}>
              Result
            </button>
          </div>

          {/* Console tab */}
          {activeTab === "console" && (
            <div className={styles.console}>
              {consoleLines.map((line, i) => (
                <div
                  key={i}
                  className={`${styles.consoleLine} ${line.type === "success" ? styles.consoleSuccess : line.type === "error" ? styles.consoleError : ""}`}
                >
                  {line.text}
                </div>
              ))}
            </div>
          )}

          {/* Test cases tab */}
          {activeTab === "tests" && (
            <div className={styles.testPanel}>
              {testResults.length === 0 ? (
                <p className={styles.testEmpty}>Run your code to see test results.</p>
              ) : (
                <>
                  {runMeta && (
                    <div className={styles.testMeta}>
                      Runtime: {runMeta.runtime} · Memory: {runMeta.memory}
                    </div>
                  )}
                  {testResults.map((tc) => (
                    <div key={tc.index} className={`${styles.testCase} ${tc.passed ? styles.testCasePassed : styles.testCaseFailed}`}>
                      <div className={styles.testCaseHeader}>
                        <span className={tc.passed ? styles.testIcon : styles.testIconFail}>
                          {tc.passed ? "✓" : "✗"}
                        </span>
                        <span className={styles.testCaseLabel}>Test {tc.index}</span>
                        <span className={tc.passed ? styles.testBadgePass : styles.testBadgeFail}>
                          {tc.passed ? "Passed" : "Failed"}
                        </span>
                      </div>
                      <div className={styles.testCaseBody}>
                        <div className={styles.testRow}>
                          <span className={styles.testKey}>Input</span>
                          <code className={styles.testVal}>{tc.input}</code>
                        </div>
                        {tc.expected && (
                          <div className={styles.testRow}>
                            <span className={styles.testKey}>Expected</span>
                            <code className={styles.testVal}>{tc.expected}</code>
                          </div>
                        )}
                        <div className={styles.testRow}>
                          <span className={styles.testKey}>Output</span>
                          <code className={`${styles.testVal} ${!tc.passed ? styles.testValWrong : ""}`}>{tc.actual || "—"}</code>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Submit result tab */}
          {activeTab === "submit" && (
            <div className={styles.testPanel}>
              {!submitResult ? (
                <p className={styles.testEmpty}>Click Submit to run against all test cases.</p>
              ) : submitResult.error ? (
                <p className={styles.errorText}>⚠ {submitResult.error}</p>
              ) : (
                <>
                  <div className={`${styles.verdictBanner} ${submitResult.verdict === "Accepted" ? styles.verdictAccepted : styles.verdictFailed}`}>
                    <span className={styles.verdictLabel}>{submitResult.verdict}</span>
                    <span className={styles.verdictScore}>{submitResult.passed}/{submitResult.total} tests passed</span>
                    <span className={styles.verdictMeta}>{submitResult.runtime} · {submitResult.memory}</span>
                  </div>
                  {submitResult.aiFeedback && (
                    <div className={styles.aiFeedbackBox}>
                      <div className={styles.aiFeedbackTitle}>AI Feedback</div>
                      <p className={styles.aiFeedbackText}>{submitResult.aiFeedback}</p>
                    </div>
                  )}
                  {(submitResult.testResults ?? []).map((tc) => (
                    <div key={tc.index} className={`${styles.testCase} ${tc.passed ? styles.testCasePassed : styles.testCaseFailed}`}>
                      <div className={styles.testCaseHeader}>
                        <span className={tc.passed ? styles.testIcon : styles.testIconFail}>{tc.passed ? "✓" : "✗"}</span>
                        <span className={styles.testCaseLabel}>Test {tc.index}</span>
                        <span className={tc.passed ? styles.testBadgePass : styles.testBadgeFail}>{tc.passed ? "Passed" : "Failed"}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
