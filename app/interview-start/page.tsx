import BackgroundEffects from "./components/background/BackgroundEffects";
import StartInterviewCard from "./components/card/StartInterviewCard";
import StartInterviewNav from "./components/nav/StartInterviewNav";
import styles from "./interview-start.module.css";

export default function InterviewStartPage() {
  return (
    <div className={styles.pageRoot}>
      <BackgroundEffects />
      <StartInterviewNav />
      <main className={styles.page}>
        <StartInterviewCard />
      </main>
    </div>
  );
}

