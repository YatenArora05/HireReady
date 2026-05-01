import Link from "next/link";
import styles from "../../interview-start.module.css";

export default function StartInterviewNav() {
  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.navLogo}>
        prep<span>/</span>ai
      </Link>
      <div className={styles.navRight}>
        <Link href="/" className={styles.navBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to dashboard
        </Link>
        <span className={styles.navStep}>Step 1 of 3</span>
      </div>
    </nav>
  );
}

