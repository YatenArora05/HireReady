"use client";

import { useMemo, useState } from "react";
import styles from "../../practice.module.css";

const templates: Record<string, string> = {
  js: "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar twoSum = function(nums, target) {\n    // Your solution here\n    \n};\n",
  py: "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        # Your solution here\n        pass\n",
  java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your solution here\n        return new int[]{};\n    }\n}",
  cpp: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Your solution here\n    }\n};",
};

export default function CodingPracticeView() {
  const [lang, setLang] = useState("js");
  const [code, setCode] = useState(templates.js);
  const [activeTab, setActiveTab] = useState<"console" | "tests">("console");
  const [consoleOut, setConsoleOut] = useState<string[]>(["› Ready. Press Run to execute your code."]);
  const [testOutput, setTestOutput] = useState<string[]>(["Run your code to see test results."]);
  const [submitLabel, setSubmitLabel] = useState("Submit");
  const lineCount = useMemo(() => Math.max(20, code.split("\n").length), [code]);
  const fileName = useMemo(() => `solution.${lang}`, [lang]);

  const run = () => {
    setActiveTab("console");
    setConsoleOut(["› Running..."]);
    setTestOutput(["Run your code to see test results."]);
    setTimeout(() => {
      setConsoleOut(["› Running...", "› Executing test cases..."]);
    }, 300);
    setTimeout(() => {
      const passed = code.includes("Map") || code.includes("dict") || code.includes("unordered_map") || code.includes("HashMap");
      if (passed) {
        setConsoleOut([
          "› Executing test cases...",
          "› ✓ All 3 test cases passed",
          "› Runtime: 72ms · Memory: 42.1 MB",
        ]);
        setTestOutput([
          "✓ Test 1: [2,7,11,15], target=9 → [0,1]",
          "✓ Test 2: [3,2,4], target=6 → [1,2]",
          "✓ Test 3: [3,3], target=6 → [0,1]",
        ]);
      } else {
        setConsoleOut([
          "› Executing test cases...",
          "› ✗ Test 1 failed: expected [0,1], got undefined",
        ]);
        setTestOutput([
          "✗ Test 1: [2,7,11,15], target=9 → Expected [0,1]",
        ]);
      }
    }, 950);
  };

  const resetCode = () => {
    setCode(templates[lang]);
    setActiveTab("console");
    setConsoleOut(["› Code reset to template."]);
    setTestOutput(["Run your code to see test results."]);
    setSubmitLabel("Submit");
  };

  const submitCode = () => {
    setSubmitLabel("Submitting...");
    setActiveTab("console");
    setTimeout(() => {
      setSubmitLabel("✓ Accepted");
      setConsoleOut((prev) => [...prev, "› ✓ Accepted — Beats 94% of submissions"]);
    }, 1200);
  };

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
        <aside className={styles.probPanel}>
          <div className={styles.probHead}>
            <div className={styles.probTitle}>Two Sum</div>
            <div className={styles.probMeta}>
              <span className={`${styles.diffBadge} ${styles.diffEasy}`}>Easy</span>
              <span className={styles.catBadge}>Arrays · Hash Map</span>
            </div>
          </div>
          <div className={styles.probBody}>
            <div className={styles.probSection}>
              <div className={styles.probSecTitle}>Problem</div>
              <p className={styles.probDesc}>
                Given an array of integers <code>nums</code> and an integer <code>target</code>, return <em>indices of the two numbers</em>{" "}
                such that they add up to <code>target</code>.
                <br />
                <br />
                You may assume that each input would have <strong>exactly one solution</strong>, and you may not use the same element twice.
              </p>
            </div>
            <div className={styles.exampleBox}>
              <div className={styles.exampleLabel}>Example 1</div>
              <pre>Input: nums = [2, 7, 11, 15], target = 9{"\n"}Output: [0, 1]{"\n"}Reason: nums[0] + nums[1] = 2 + 7 = 9</pre>
            </div>
            <div className={styles.exampleBox}>
              <div className={styles.exampleLabel}>Example 2</div>
              <pre>Input: nums = [3, 2, 4], target = 6{"\n"}Output: [1, 2]{"\n"}Reason: nums[1] + nums[2] = 2 + 4 = 6</pre>
            </div>
            <div className={styles.probSection}>
              <div className={styles.probSecTitle}>Constraints</div>
              <ul className={styles.constraintList}>
                <li>2 ≤ nums.length ≤ 10⁴</li>
                <li>-10⁹ ≤ nums[i] ≤ 10⁹</li>
                <li>-10⁹ ≤ target ≤ 10⁹</li>
                <li>Only one valid answer exists</li>
              </ul>
            </div>
            <div className={styles.probSection}>
              <div className={styles.probSecTitle}>Expected Complexity</div>
              <div className={styles.complexityRow}>
                <div className={styles.exampleBox}>
                  <div className={styles.exampleLabel}>Time</div>
                  <div className={styles.monoValue}>O(n)</div>
                </div>
                <div className={styles.exampleBox}>
                  <div className={styles.exampleLabel}>Space</div>
                  <div className={styles.monoValue}>O(n)</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
        <div className={styles.editorPanel}>
          <div className={styles.editorTop}>
            <select
              className={styles.langSelect}
              value={lang}
              onChange={(e) => {
                const l = e.target.value;
                setLang(l);
                setCode(templates[l]);
              }}
            >
              <option value="js">JavaScript</option>
              <option value="py">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
            </select>
            <div className={styles.fileName}>{fileName}</div>
            <div className={styles.editorActions}>
              <button className={styles.btnReset} onClick={resetCode}>Reset</button>
              <button className={styles.btnRun} onClick={run}>Run</button>
              <button className={styles.btnSubmitCode} onClick={submitCode}>{submitLabel}</button>
            </div>
          </div>
          <div className={styles.codeWrap}>
            <div className={styles.codeLines}>
              {Array.from({ length: lineCount }).map((_, i) => (
                <div className={styles.lineNum} key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea className={styles.codeTextarea} value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} />
          </div>
          <div className={styles.consoleTabs}>
            <button className={`${styles.ctab} ${activeTab === "console" ? styles.ctabActive : ""}`} onClick={() => setActiveTab("console")}>Console</button>
            <button className={`${styles.ctab} ${activeTab === "tests" ? styles.ctabActive : ""}`} onClick={() => setActiveTab("tests")}>Test Cases</button>
          </div>
          <div className={styles.console}>
            {(activeTab === "console" ? consoleOut : testOutput).map((line, i) => (
              <div
                className={`${styles.consoleLine} ${
                  line.includes("✓") ? styles.consoleSuccess : line.includes("✗") ? styles.consoleError : ""
                }`}
                key={`${activeTab}-${i}`}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

