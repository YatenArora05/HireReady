"use client";

import { motion } from "framer-motion";
import LeftPanel from "../left-panel/LeftPanel";
import SetupForm from "../setup-form/SetupForm";
import styles from "../../interview-start.module.css";

export default function StartInterviewCard() {
  return (
    <motion.section
      className={styles.mainCard}
      initial={{ opacity: 0, y: 32, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
    >
      <LeftPanel />
      <SetupForm />
    </motion.section>
  );
}

