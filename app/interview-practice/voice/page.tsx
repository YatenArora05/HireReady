import { Suspense } from "react";
import PracticeBackdrop from "../components/shared/PracticeBackdrop";
import PracticeNav from "../components/shared/PracticeNav";
import VoicePracticeView from "../components/voice/VoicePracticeView";
import styles from "../practice.module.css";

export default function VoicePage() {
  return (
    <div className={styles.root}>
      <PracticeBackdrop />
      <PracticeNav mode="voice" />
      <section className={styles.section}>
        <Suspense
          fallback={
            <div className={styles.loadingState}>
              <div className={styles.loadingSpinner} />
              <p className={styles.loadingText}>Preparing your session…</p>
            </div>
          }
        >
          <VoicePracticeView />
        </Suspense>
      </section>
    </div>
  );
}
