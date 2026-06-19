import styles from "./accessCodes.module.css";

interface AccessCodeStatsProps {
  stats: {
    total: number;
    active: number;
    totalRedeems: number;
  };
}

export function AccessCodeStats({ stats }: AccessCodeStatsProps) {
  return (
    <div className={styles.statsGrid}>
      <div className={`card ${styles.statCard}`}>
        <span className={styles.statLabel}>TỔNG SỐ MÃ ĐÃ PHÁT</span>
        <h3 className={styles.statValue}>{stats.total}</h3>
      </div>

      <div className={`card ${styles.statCard}`}>
        <span className={styles.statLabel}>MÃ ĐANG HOẠT ĐỘNG</span>
        <h3 className={`${styles.statValue} ${styles.statValueAccent}`}>{stats.active}</h3>
      </div>

      <div className={`card ${styles.statCard}`}>
        <span className={styles.statLabel}>TỔNG SỐ LƯỢT KÍCH HOẠT</span>
        <h3 className={`${styles.statValue} ${styles.statValuePrimary}`}>{stats.totalRedeems}</h3>
      </div>
    </div>
  );
}
