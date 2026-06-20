import { Suspense } from "react";
import CodingPracticeView from "../components/coding/CodingPracticeView";
import PracticeBackdrop from "../components/shared/PracticeBackdrop";
import PracticeNav from "../components/shared/PracticeNav";
import styles from "../practice.module.css";

export default function CodingPage() {
  return (
    <div className={styles.root}>
      <PracticeBackdrop />
      <PracticeNav mode="coding" />
      <section className={styles.section}>
        <Suspense
          fallback={
            <div className={styles.loadingState}>
              <div className={styles.loadingSpinner} />
              <p className={styles.loadingText}>Preparing your session…</p>
            </div>
          }
        >
          <CodingPracticeView />
        </Suspense>
      </section>
    </div>
  );
}
