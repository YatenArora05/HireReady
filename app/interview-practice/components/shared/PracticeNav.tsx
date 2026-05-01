import Link from "next/link";
import styles from "../../practice.module.css";

type Mode = "mcq" | "voice" | "coding";

export default function PracticeNav({ mode }: { mode: Mode }) {
  return (
    <nav className={styles.nav}>
      <div className={styles.navLogo}>
        prep<span>/</span>ai
      </div>
      {/* <div className={styles.navTabs}>
        <Link className={`${styles.navTab} ${mode === "mcq" ? styles.navTabActive : ""}`} href="/interview-practice/mcq">
          MCQ Practice
        </Link>
        <Link className={`${styles.navTab} ${mode === "voice" ? styles.navTabActive : ""}`} href="/interview-practice/voice">
          Voice Interview
        </Link>
        <Link className={`${styles.navTab} ${mode === "coding" ? styles.navTabActive : ""}`} href="/interview-practice/coding">
          Coding Challenge
        </Link>
      </div> */}
      <div className={styles.navMeta}>
        <div className={styles.metaPill}>Software Engineer · Mid</div>
      </div>
    </nav>
  );
}

