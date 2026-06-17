"use client";

import React from "react";
import Link from "next/link";
import { useIPASyllabus } from "@/hooks/useIPASyllabus";
import { IPADetailPanel } from "@/components/pronunciation/IPADetailPanel";
import { CourseGuard } from "@/components/common/CourseGuard";
import { getSlugFromIpa, getIpaFromSlug } from "@/utils/ipaSlug";
import styles from "../pronunciation.module.css";

interface IPADetailsClientPageProps {
  ipa: string;
}

export default function IPADetailsClientPage({ ipa }: IPADetailsClientPageProps) {
  const decodedIpa = getIpaFromSlug(ipa);

  const {
    sounds,
    loading,
    playingWord,
    playSoundAudio,
  } = useIPASyllabus();

  if (loading) {
    return (
      <div className={`${styles.loadingContainer} container`}>
        <div className={`spinner ${styles.centeredSpinner}`} />
        <p className={styles.pageSubtitle}>Đang tải bài học...</p>
      </div>
    );
  }

  const currentIndex = sounds.findIndex((s) => s.ipa === decodedIpa);
  const currentSound = currentIndex !== -1 ? sounds[currentIndex] : null;

  if (!currentSound) {
    return (
      <div className={`${styles.pageWrapper} container`}>
        <div className={styles.detailsContainer}>
          <div className={`card ${styles.notFoundCard}`}>
            <h2 className={`${styles.sectionHeader} ${styles.notFoundHeader}`}>
              ⚠️ Không tìm thấy âm này
            </h2>
            <p className={`${styles.pageSubtitle} ${styles.notFoundText}`}>
              Âm &quot;/{decodedIpa}/&quot; không tồn tại trong hệ thống học liệu IPA hiện tại.
            </p>
            <Link href="/pronunciation" className="btn btn-primary">
              Quay lại bảng IPA
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const prevSound = currentIndex > 0 ? sounds[currentIndex - 1] : null;
  const nextSound = currentIndex < sounds.length - 1 ? sounds[currentIndex + 1] : null;

  return (
    <CourseGuard courseId="ipa" courseTitle="Luyện phát âm chuẩn IPA">
      <div className={`${styles.pageWrapper} container`}>
        <div className={styles.detailsContainer}>
          {/* Header navigation bar */}
          <div className={styles.detailsHeader}>
            <Link href="/pronunciation" className={styles.backBtn}>
              <span>←</span> Quay lại bảng IPA
            </Link>

            <div className={styles.navBtnGroup}>
              {prevSound ? (
                <Link
                  href={`/pronunciation/${getSlugFromIpa(prevSound.ipa)}`}
                  className={`${styles.navLinkBtn} btn btn-outline`}
                >
                  ← /{prevSound.ipa}/
                </Link>
              ) : (
                <span className={`${styles.navLinkBtn} ${styles.navLinkBtnDisabled} btn btn-outline`}>
                  ← Đầu tiên
                </span>
              )}

              {nextSound ? (
                <Link
                  href={`/pronunciation/${getSlugFromIpa(nextSound.ipa)}`}
                  className={`${styles.navLinkBtn} btn btn-outline`}
                >
                  /{nextSound.ipa}/ →
                </Link>
              ) : (
                <span className={`${styles.navLinkBtn} ${styles.navLinkBtnDisabled} btn btn-outline`}>
                  Cuối cùng →
                </span>
              )}
            </div>
          </div>

          {/* Focused detail learning workspace */}
          <IPADetailPanel
            key={currentSound.ipa}
            selectedSound={currentSound}
            playSoundAudio={playSoundAudio}
            playingWord={playingWord}
          />
        </div>
      </div>
    </CourseGuard>
  );
}
