"use client";

import React from "react";
import { AccessCodeFilterStatus } from "@/hooks/useAdminAccessCodes";
import styles from "./accessCodes.module.css";

interface AccessCodeFiltersProps {
  activeFilter: AccessCodeFilterStatus;
  onChangeFilter: (filter: AccessCodeFilterStatus) => void;
}

const FILTERS: { value: AccessCodeFilterStatus; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang hoạt động (Còn lượt)" },
  { value: "used", label: "Đã dùng hết / Khóa" },
];

export function AccessCodeFilters({ activeFilter, onChangeFilter }: AccessCodeFiltersProps) {
  return (
    <div className={styles.filterRow}>
      {FILTERS.map((filter) => (
        <button
          key={filter.value}
          type="button"
          onClick={() => onChangeFilter(filter.value)}
          className={`${styles.filterButton} ${activeFilter === filter.value ? styles.filterButtonActive : ""}`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
