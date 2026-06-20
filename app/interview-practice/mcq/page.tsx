import { Suspense } from "react";
import PracticeBackdrop from "../components/shared/PracticeBackdrop";
import McqPracticeView from "../components/mcq/McqPracticeView";
import PracticeNav from "../components/shared/PracticeNav";
import styles from "../practice.module.css";

export default function McqPage() {
  return (
    <div className={styles.root}>
      <PracticeBackdrop />
      <PracticeNav mode="mcq" />
      <section className={styles.section}>
        <Suspense
          fallback={
            <div className={styles.loadingState}>
              <div className={styles.loadingSpinner} />
              <p className={styles.loadingText}>Preparing your session…</p>
            </div>
          }
        >
          <McqPracticeView />
        </Suspense>
      </section>
    </div>
  );
}
