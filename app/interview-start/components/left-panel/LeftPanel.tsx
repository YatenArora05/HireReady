"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import styles from "../../interview-start.module.css";

const features = [
  { id: "role", name: "Choose Role & Experience", sub: "Tailored to your level" },
  { id: "practice-type", name: "Select Practice Type", sub: "MCQ, Voice, or Coding mode" },
  { id: "voice", name: "Smart Voice Interview", sub: "Speak your answers naturally" },
  { id: "analytics", name: "Performance Analytics", sub: "Track clarity, structure & tone" },
];

export default function LeftPanel() {
  const [active, setActive] = useState("role");

  return (
    <div className={styles.leftPanel}>
      <div className={styles.lpTop}>
        <motion.div className={styles.lpEyebrow} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}>
          <span className={styles.liveDot} />
          AI-Powered
        </motion.div>
        <motion.h1 className={styles.lpTitle} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.4 }}>
          Start Your
          <br />
          <em>AI Interview.</em>
        </motion.h1>
        <motion.p className={styles.lpDesc} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.52 }}>
          Practice real interview scenarios powered by AI. Improve communication, technical skills, and confidence.
        </motion.p>

        <div className={styles.features}>
          {features.map((feature, index) => (
            <motion.button
              key={feature.id}
              type="button"
              className={`${styles.feat} ${active === feature.id ? styles.featActive : ""}`}
              onClick={() => setActive(feature.id)}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 + index * 0.12 }}
            >
              <span className={styles.featIcon}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <circle cx="9" cy="6" r="3.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.3" />
                  <path d="M2.5 15.5c0-3.314 2.91-6 6.5-6s6.5 2.686 6.5 6" stroke="rgba(255,255,255,0.6)" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </span>
              <span className={styles.featText}>
                <span className={styles.featName}>{feature.name}</span>
                <span className={styles.featSub}>{feature.sub}</span>
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      <motion.div className={styles.lpStats} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 1.05 }}>
        <div className={styles.lpStat}>
          <span className={styles.lpStatVal}>50k+</span>
          <span className={styles.lpStatLbl}>Interviews done</span>
        </div>
        <div className={styles.lpStatDivider} />
        <div className={styles.lpStat}>
          <span className={styles.lpStatVal}>94%</span>
          <span className={styles.lpStatLbl}>Offer rate</span>
        </div>
        <div className={styles.lpStatDivider} />
        <div className={styles.lpStat}>
          <span className={styles.lpStatVal}>4.9★</span>
          <span className={styles.lpStatLbl}>User rating</span>
        </div>
      </motion.div>
    </div>
  );
}

