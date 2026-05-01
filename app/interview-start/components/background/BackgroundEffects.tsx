import styles from "../../interview-start.module.css";

export default function BackgroundEffects() {
  return (
    <>
      <div className={styles.gridBg} />
      <div className={styles.glowTl} />
      <div className={styles.glowBr} />
      <div className={styles.glowMid} />
    </>
  );
}

