"use client";

import { type AccessCode, type AccessCodeRedemptionSnapshot } from "@/services/accessCodeService";
import { type UserSummary } from "@/services/userService";
import { AVAILABLE_COURSES, getFriendlyTargetLabel } from "./accessCodeOptions";
import styles from "./accessCodes.module.css";

interface AccessCodeCardProps {
  item: AccessCode;
  loadingUserSummaries: boolean;
  userSummaries: Record<string, UserSummary>;
  onCopyCode: (code: string) => void;
  onDeleteCode: (code: string) => void;
  onToggleStatus: (code: AccessCode) => void;
}

function formatTimestamp(seconds: number | undefined) {
  return seconds ? new Date(seconds * 1000).toLocaleString("vi-VN") : "Đang tạo...";
}

function formatCreatedAt(item: AccessCode) {
  return formatTimestamp(item.createdAt?.seconds);
}

function formatRedeemedAt(snapshot: AccessCodeRedemptionSnapshot | undefined) {
  return snapshot?.redeemedAt?.seconds ? ` - Dùng lúc: ${formatTimestamp(snapshot.redeemedAt.seconds)}` : "";
}

function getStatusLabel(status: AccessCode["status"]) {
  if (status === "active") return "Hoạt động";
  if (status === "expired") return "Tạm dừng";
  return "Hết lượt";
}

function getCourseTitle(courseId: string) {
  return AVAILABLE_COURSES.find((course) => course.id === courseId)?.title || courseId;
}

function getStudentName(
  snapshot: AccessCodeRedemptionSnapshot | undefined,
  summary: UserSummary | undefined,
  loadingUserSummaries: boolean
) {
  if (snapshot?.displayName) return snapshot.displayName;
  if (summary?.displayName) return summary.displayName;
  return loadingUserSummaries ? "Đang tải hồ sơ..." : "Không tìm thấy hồ sơ";
}

function getStudentMeta(
  uid: string,
  snapshot: AccessCodeRedemptionSnapshot | undefined,
  summary: UserSummary | undefined,
  loadingUserSummaries: boolean
) {
  if (snapshot?.email) return snapshot.email;
  if (summary?.email) return summary.email;
  if (loadingUserSummaries) return "Đang đối chiếu email...";
  return `UID: ${uid.substring(0, 8)}...`;
}

function getStudentTitle(
  uid: string,
  snapshot: AccessCodeRedemptionSnapshot | undefined,
  summary: UserSummary | undefined,
  loadingUserSummaries: boolean
) {
  const name = getStudentName(snapshot, summary, loadingUserSummaries);
  const meta = getStudentMeta(uid, snapshot, summary, loadingUserSummaries);
  return `${name} - ${meta} - UID: ${uid}${formatRedeemedAt(snapshot)}`;
}

export function AccessCodeCard({
  item,
  loadingUserSummaries,
  userSummaries,
  onCopyCode,
  onDeleteCode,
  onToggleStatus,
}: AccessCodeCardProps) {
  const isActive = item.status === "active";
  const isMulti = item.type === "multi";

  return (
    <div className={`card ${styles.codeCard} ${isActive ? styles.codeCardActive : styles.codeCardInactive}`}>
      <div className={styles.codeHeader}>
        <div className={styles.codeTitleRow}>
          <span className={styles.codeText}>{item.code}</span>
          <button
            type="button"
            onClick={() => onCopyCode(item.code)}
            className="btn btn-outline"
            title="Sao chép mã vào clipboard"
          >
            Copy
          </button>
        </div>

        <div className={styles.badgeGroup}>
          <span className={`${styles.badge} ${isMulti ? styles.typeBadgeMulti : styles.typeBadgeSingle}`}>
            {isMulti ? `Nhóm (Max ${item.maxUses} lượt)` : "Cá nhân (1 lần)"}
          </span>
          <span className={`${styles.badge} ${isActive ? styles.statusBadgeActive : styles.statusBadgeInactive}`}>
            {getStatusLabel(item.status)}
          </span>
        </div>
      </div>

      <div className={styles.codeDetails}>
        {item.description && (
          <p className={styles.description}>
            <strong>Mô tả:</strong> {item.description}
          </p>
        )}

        <div>
          <strong>Mở khóa: </strong>
          {item.allowedCourses.map((courseId) => (
            <span key={courseId} className={styles.courseBadge}>
              {getCourseTitle(courseId)}
            </span>
          ))}
        </div>

        <div className={styles.metaRow}>
          <span>Ngày phát: {formatCreatedAt(item)}</span>
          <span>
            Hạn học: <strong>{item.durationDays ? `${item.durationDays} ngày` : "Vĩnh viễn (Trọn đời)"}</strong>
          </span>
          {item.targetPath && (
            <span>
              Chuyển hướng: <strong>{getFriendlyTargetLabel(item.targetPath)}</strong>
            </span>
          )}
          {isMulti && (
            <span>
              Đã kích hoạt: <strong>{item.currentUses} / {item.maxUses}</strong> lượt dùng.
            </span>
          )}
        </div>
      </div>

      {item.usedBy && item.usedBy.length > 0 && (
        <div className={styles.historyBlock}>
          <p className={styles.historyTitle}>Học viên đã dùng mã ({item.usedBy.length}):</p>
          <div className={styles.userBadgeGroup}>
            {item.usedBy.map((uid) => {
              const snapshot = item.redemptionsByUid?.[uid];
              const summary = userSummaries[uid];

              return (
                <span
                  key={uid}
                  className={styles.userBadge}
                  title={getStudentTitle(uid, snapshot, summary, loadingUserSummaries)}
                >
                  <strong className={styles.userName}>
                    {getStudentName(snapshot, summary, loadingUserSummaries)}
                  </strong>
                  <span className={styles.userEmail}>{getStudentMeta(uid, snapshot, summary, loadingUserSummaries)}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.actionsRow}>
        <button
          type="button"
          onClick={() => onToggleStatus(item)}
          className={isActive ? styles.pauseButton : styles.resumeButton}
        >
          {isActive ? "Tạm dừng" : "Tiếp tục"}
        </button>
        <button type="button" onClick={() => onDeleteCode(item.code)} className={styles.dangerButton}>
          Xóa mã
        </button>
      </div>
    </div>
  );
}