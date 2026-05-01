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
        <CodingPracticeView />
      </section>
    </div>
  );
}

