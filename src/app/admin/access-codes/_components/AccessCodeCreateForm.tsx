"use client";

import React from "react";
import { AccessCodeFormState, AccessCodeTargetPathType } from "@/hooks/useAdminAccessCodes";
import { AVAILABLE_COURSES, IPA_SOUNDS_LIST } from "./accessCodeOptions";
import styles from "./accessCodes.module.css";

interface AccessCodeCreateFormProps {
  form: AccessCodeFormState;
  submitting: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onGenerateRandomCode: () => void;
  onToggleCourse: (courseId: string) => void;
  onUpdateForm: <K extends keyof AccessCodeFormState>(field: K, value: AccessCodeFormState[K]) => void;
}

export function AccessCodeCreateForm({
  form,
  submitting,
  onSubmit,
  onGenerateRandomCode,
  onToggleCourse,
  onUpdateForm,
}: AccessCodeCreateFormProps) {
  return (
    <div className={`card ${styles.createCard}`}>
      <h3 className={styles.sectionTitle}>Tạo Mã Kích Hoạt Mới</h3>

      <form onSubmit={onSubmit} className={styles.formStack}>
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label className={styles.label}>Mã kích hoạt</label>
            <div className={styles.codeInputRow}>
              <input
                type="text"
                placeholder="MÃ-KÍCH-HOẠT-VIP"
                value={form.customCode}
                onChange={(event) => onUpdateForm("customCode", event.target.value.toUpperCase())}
                className={`${styles.input} ${styles.codeInput}`}
              />
              <button type="button" onClick={onGenerateRandomCode} className="btn btn-outline">
                Ngẫu nhiên
              </button>
            </div>
          </div>

          <div className={styles.formField}>
            <label className={styles.label}>Loại sử dụng</label>
            <select
              value={form.codeType}
              onChange={(event) => onUpdateForm("codeType", event.target.value as AccessCodeFormState["codeType"])}
              className={styles.select}
            >
              <option value="single">Cá nhân (Chỉ dùng 1 lần)</option>
              <option value="multi">Lớp học / Nhóm (Dùng nhiều lần)</option>
            </select>
          </div>

          {form.codeType === "multi" && (
            <div className={styles.formField}>
              <label className={styles.label}>Giới hạn lượt dùng</label>
              <input
                type="number"
                min="2"
                max="10000"
                value={form.maxUses}
                onChange={(event) => onUpdateForm("maxUses", Number(event.target.value))}
                className={styles.input}
              />
            </div>
          )}

          <div className={styles.formField}>
            <label className={styles.label}>Thời hạn học tập</label>
            <select
              value={form.durationDays}
              onChange={(event) => onUpdateForm("durationDays", event.target.value as AccessCodeFormState["durationDays"])}
              className={styles.select}
            >
              <option value="unlimited">Không giới hạn (Vĩnh viễn)</option>
              <option value="7">7 ngày học</option>
              <option value="30">30 ngày học</option>
              <option value="90">90 ngày học</option>
              <option value="custom">Tùy chỉnh số ngày</option>
            </select>
          </div>

          {form.durationDays === "custom" && (
            <div className={styles.formField}>
              <label className={styles.label}>Số ngày học</label>
              <input
                type="number"
                min="1"
                max="3650"
                value={form.customDuration}
                onChange={(event) => onUpdateForm("customDuration", event.target.value)}
                className={styles.input}
              />
            </div>
          )}

          <div className={styles.formField}>
            <label className={styles.label}>Đường dẫn chuyển hướng (Sau kích hoạt)</label>
            <select
              value={form.targetPathType}
              onChange={(event) => onUpdateForm("targetPathType", event.target.value as AccessCodeTargetPathType)}
              className={styles.select}
            >
              <option value="default">Mặc định (Trang khóa học `/courses`)</option>
              <option value="pronunciation">Bảng phát âm IPA (`/pronunciation`)</option>
              <option value="sound">Trực tiếp một âm IPA cụ thể</option>
              <option value="custom">Đường dẫn tùy chỉnh khác</option>
            </select>
          </div>

          {form.targetPathType === "sound" && (
            <div className={styles.formField}>
              <label className={styles.label}>Chọn âm IPA đích</label>
              <select
                value={form.selectedSoundSlug}
                onChange={(event) => onUpdateForm("selectedSoundSlug", event.target.value)}
                className={styles.select}
              >
                {IPA_SOUNDS_LIST.map((sound) => (
                  <option key={sound.slug} value={sound.slug}>
                    /{sound.ipa}/ - {sound.desc}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.targetPathType === "custom" && (
            <div className={styles.formField}>
              <label className={styles.label}>Nhập đường dẫn tùy chỉnh</label>
              <input
                type="text"
                placeholder="Ví dụ: /courses/office-communication"
                value={form.customTargetPath}
                onChange={(event) => onUpdateForm("customTargetPath", event.target.value)}
                className={styles.input}
              />
            </div>
          )}
        </div>

        <div className={`${styles.formField} ${styles.formFieldWide}`}>
          <label className={styles.label}>Quyền mở khóa khóa học</label>
          <div className={styles.courseToggleGroup}>
            {AVAILABLE_COURSES.map((course) => {
              const isSelected = form.selectedCourses.includes(course.id);
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => onToggleCourse(course.id)}
                  className={`btn ${styles.courseToggle} ${isSelected ? styles.courseToggleSelected : ""}`}
                >
                  {isSelected ? "✓ " : ""}
                  {course.title}
                </button>
              );
            })}
          </div>
        </div>

        <div className={`${styles.formField} ${styles.formFieldWide}`}>
          <label className={styles.label}>Mô tả ngắn (Lưu ý cho giáo viên)</label>
          <input
            type="text"
            placeholder="Ví dụ: Mã tặng cho bạn Nguyễn Văn A học IPA, hoặc Mã lớp VIP giao tiếp tối thứ 3..."
            value={form.description}
            onChange={(event) => onUpdateForm("description", event.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.formFooter}>
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? "Đang tạo mã..." : "Tạo và Lưu mã"}
          </button>
        </div>
      </form>
    </div>
  );
}
