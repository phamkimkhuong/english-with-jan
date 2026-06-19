"use client";

import { useAdminAccessCodes } from "@/hooks/useAdminAccessCodes";
import { AccessCodeCreateForm } from "./AccessCodeCreateForm";
import { AccessCodeFilters } from "./AccessCodeFilters";
import { AccessCodeList } from "./AccessCodeList";
import { AccessCodeStats } from "./AccessCodeStats";
import styles from "./accessCodes.module.css";

export function AccessCodesClient() {
  const accessCodes = useAdminAccessCodes();

  return (
    <div className={styles.pageStack}>
      <div className={styles.headerRow}>
        <h2 className={styles.pageTitle}>Danh sách mã học viên</h2>
        <button type="button" onClick={accessCodes.toggleCreateForm} className="btn btn-primary">
          {accessCodes.showCreateForm ? "Đóng bảng tạo mã" : "Tạo mã kích hoạt mới"}
        </button>
      </div>

      {accessCodes.showCreateForm && (
        <AccessCodeCreateForm
          form={accessCodes.form}
          submitting={accessCodes.submitting}
          onSubmit={accessCodes.handleCreateCode}
          onGenerateRandomCode={accessCodes.generateRandomCode}
          onToggleCourse={accessCodes.toggleCourse}
          onUpdateForm={accessCodes.updateForm}
        />
      )}

      <AccessCodeStats stats={accessCodes.stats} />

      <AccessCodeFilters
        activeFilter={accessCodes.filterStatus}
        onChangeFilter={accessCodes.setFilterStatus}
      />

      <AccessCodeList
        codes={accessCodes.filteredCodes}
        loading={accessCodes.loading}
        loadingUserSummaries={accessCodes.loadingUserSummaries}
        userSummaries={accessCodes.userSummaries}
        onCopyCode={accessCodes.copyCode}
        onDeleteCode={accessCodes.removeCode}
        onToggleStatus={accessCodes.toggleStatus}
      />
    </div>
  );
}