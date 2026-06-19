"use client";

import { type AccessCode } from "@/services/accessCodeService";
import { type UserSummary } from "@/services/userService";
import { AccessCodeCard } from "./AccessCodeCard";
import styles from "./accessCodes.module.css";

interface AccessCodeListProps {
  codes: AccessCode[];
  loading: boolean;
  loadingUserSummaries: boolean;
  userSummaries: Record<string, UserSummary>;
  onCopyCode: (code: string) => void;
  onDeleteCode: (code: string) => void;
  onToggleStatus: (code: AccessCode) => void;
}

export function AccessCodeList({
  codes,
  loading,
  loadingUserSummaries,
  userSummaries,
  onCopyCode,
  onDeleteCode,
  onToggleStatus,
}: AccessCodeListProps) {
  if (loading) {
    return (
      <div className={styles.loadingBlock}>
        <div className={`skeleton ${styles.listSkeleton}`} />
      </div>
    );
  }

  if (codes.length === 0) {
    return (
      <div className={`card ${styles.emptyCard}`}>
        Không tìm thấy mã kích hoạt nào tương ứng với bộ lọc.
      </div>
    );
  }

  return (
    <div className={styles.codeList}>
      {codes.map((item) => (
        <AccessCodeCard
          key={item.code}
          item={item}
          loadingUserSummaries={loadingUserSummaries}
          userSummaries={userSummaries}
          onCopyCode={onCopyCode}
          onDeleteCode={onDeleteCode}
          onToggleStatus={onToggleStatus}
        />
      ))}
    </div>
  );
}