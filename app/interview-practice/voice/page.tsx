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
        <VoicePracticeView />
      </section>
    </div>
  );
}

