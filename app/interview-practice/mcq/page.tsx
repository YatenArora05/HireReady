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
        <McqPracticeView />
      </section>
    </div>
  );
}

