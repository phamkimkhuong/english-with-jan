"use client";

import React, { useState, useEffect } from "react";
import { collection, doc, getDocs, getDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { fetchIPASyllabus } from "@/services/pronunciationService";
import { IPASound } from "@/types/pronunciation";
import { toast } from "@/hooks/useToastStore";

interface StudentUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
}

interface RecordingProgress {
  spokenText: string;
  isCorrect: boolean;
  confidence: number;
  audioUrl: string;
  timestamp: number;
}

export default function AdminStudentPronunciationPage() {
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentUser | null>(null);
  const [sounds, setSounds] = useState<IPASound[]>([]);
  const [studentProgress, setStudentProgress] = useState<Record<string, RecordingProgress>>({});
  const [selectedSound, setSelectedSound] = useState<IPASound | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [playingAudioKey, setPlayingAudioKey] = useState<string | null>(null);

  // 1. Tải danh sách học sinh & cấu trúc IPA Syllabus
  useEffect(() => {
    const initPage = async () => {
      try {
        setLoadingStudents(true);
        // Tải danh sách 44 âm IPA mẫu
        const ipaSounds = await fetchIPASyllabus();
        setSounds(ipaSounds);
        if (ipaSounds.length > 0) {
          setSelectedSound(ipaSounds[0]);
        }

        // Tải danh sách user có role là 'student'
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("role", "==", "student"));
        const snapshot = await getDocs(q);
        const studentsList: StudentUser[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          studentsList.push({
            uid: docSnap.id,
            displayName: data.displayName || "Học viên ẩn danh",
            email: data.email || "",
            photoURL: data.photoURL || "",
          });
        });
        setStudents(studentsList);
        if (studentsList.length > 0) {
          setSelectedStudent(studentsList[0]);
        }
      } catch (err) {
        console.error("Lỗi khởi tạo danh sách học viên:", err);
        toast.error("Không thể tải danh sách học viên.");
      } finally {
        setLoadingStudents(false);
      }
    };

    initPage();
  }, []);

  // 2. Tải tiến trình thu âm của học sinh được chọn
  useEffect(() => {
    const loadStudentProgress = async () => {
      if (!selectedStudent) {
        setStudentProgress({});
        return;
      }

      try {
        setLoadingProgress(true);
        const progressDocRef = doc(db, "ipa_progress", selectedStudent.uid);
        const progressDoc = await getDoc(progressDocRef);
        if (progressDoc.exists()) {
          const data = progressDoc.data();
          setStudentProgress(data.recordings || {});
        } else {
          setStudentProgress({});
        }
      } catch (err) {
        console.error("Lỗi tải tiến trình của học viên:", err);
        toast.error("Lỗi khi tải kết quả luyện phát âm.");
      } finally {
        setLoadingProgress(false);
      }
    };

    loadStudentProgress();
  }, [selectedStudent]);

  // 3. Phát audio của học sinh ghi âm
  const playStudentAudio = (key: string, url: string) => {
    if (!url) return;
    setPlayingAudioKey(key);
    const audio = new Audio(url);
    audio.onended = () => setPlayingAudioKey(null);
    audio.onerror = () => {
      setPlayingAudioKey(null);
      toast.error("Không thể phát tệp âm thanh của học sinh.");
    };
    audio.play().catch(() => setPlayingAudioKey(null));
  };

  if (loadingStudents) {
    return <div style={{ padding: "40px 0" }}>Đang tải danh sách học viên...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.5px" }}>
          Theo Dõi Luyện Phát Âm Của Học Sinh
        </h2>
        <p style={{ color: "rgb(var(--secondary-rgb))", fontSize: "0.85rem" }}>
          Xem lịch sử luyện tập, độ chính xác và nghe lại trực tiếp tệp ghi âm giọng đọc của học sinh.
        </p>
      </div>

      <div className="admin-split-layout" style={{ gap: "24px" }}>
        {/* Cột trái: Chọn học sinh */}
        <div className="admin-col-left" style={{ borderRight: "1px solid rgb(var(--card-border-rgb))", paddingRight: "20px" }}>
          <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "rgb(var(--secondary-rgb))", marginBottom: "12px" }}>
            Học sinh ({students.length}):
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "65vh", overflowY: "auto" }}>
            {students.length > 0 ? (
              students.map((student) => (
                <button
                  key={student.uid}
                  type="button"
                  onClick={() => setSelectedStudent(student)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: selectedStudent?.uid === student.uid ? "2px solid rgb(var(--primary-rgb))" : "1px solid rgb(var(--card-border-rgb))",
                    background: selectedStudent?.uid === student.uid ? "rgb(var(--primary-light-rgb))" : "transparent",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: "rgb(var(--foreground-rgb) / 0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden"
                  }}>
                    {student.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={student.photoURL} alt={student.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontWeight: "bold", fontSize: "0.9rem", color: "rgb(var(--secondary-rgb))" }}>
                        {student.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                      {student.displayName}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "rgb(var(--secondary-rgb))", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                      {student.email}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div style={{ fontSize: "0.85rem", color: "rgb(var(--secondary-rgb))", padding: "10px", textAlign: "center" }}>
                Chưa có học sinh nào đăng ký.
              </div>
            )}
          </div>
        </div>

        {/* Cột phải: Xem bài luyện âm */}
        <div className="admin-col-right" style={{ flex: 2 }}>
          {selectedStudent ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Header thông tin học sinh */}
              <div className="card" style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h4 style={{ fontWeight: 800, fontSize: "1.05rem" }}>
                    Bài làm của: {selectedStudent.displayName}
                  </h4>
                  <p style={{ fontSize: "0.8rem", color: "rgb(var(--secondary-rgb))" }}>
                    ID: {selectedStudent.uid}
                  </p>
                </div>
                {loadingProgress && <span style={{ fontSize: "0.8rem", color: "rgb(var(--primary-rgb))" }}>Đang tải kết quả...</span>}
              </div>

              {/* Layout chọn âm & hiển thị kết quả */}
              <div style={{ display: "flex", gap: "20px", flexDirection: "column" }}>
                {/* 1. Chọn âm IPA */}
                <div>
                  <h5 style={{ fontSize: "0.85rem", fontWeight: 700, color: "rgb(var(--secondary-rgb))", marginBottom: "8px" }}>
                    Chọn âm IPA để xem chi tiết:
                  </h5>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(65px, 1fr))", gap: "6px" }}>
                    {sounds.map((sound) => {
                      // Đếm xem trong âm này học sinh đã luyện bao nhiêu từ
                      const practicedCount = sound.examples.filter(ex => {
                        const safeKey = `${sound.ipa}_${ex.type || "word"}_${ex.word}`.replace(/[./\\*?:"<>|]/g, "_");
                        return !!studentProgress[safeKey];
                      }).length;

                      return (
                        <button
                          key={sound.ipa}
                          type="button"
                          onClick={() => setSelectedSound(sound)}
                          style={{
                            height: "45px",
                            borderRadius: "8px",
                            border: selectedSound?.ipa === sound.ipa ? "2px solid rgb(var(--primary-rgb))" : "1px solid rgb(var(--card-border-rgb))",
                            background: selectedSound?.ipa === sound.ipa ? "rgb(var(--primary-light-rgb))" : "transparent",
                            cursor: "pointer",
                            fontWeight: "bold",
                            position: "relative",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span style={{ fontSize: "0.85rem" }}>/{sound.ipa}/</span>
                          {practicedCount > 0 && (
                            <span style={{
                              position: "absolute",
                              top: "-4px",
                              right: "-4px",
                              fontSize: "0.65rem",
                              backgroundColor: "rgb(16 185 129)",
                              color: "white",
                              borderRadius: "50%",
                              width: "16px",
                              height: "16px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: "bold"
                            }}>
                              {practicedCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Chi tiết các ví dụ của âm đã chọn */}
                {selectedSound && (
                  <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    <h4 style={{ fontSize: "1.1rem", fontWeight: 800 }}>
                      Chi tiết luyện tập âm: <span style={{ color: "rgb(var(--primary-rgb))" }}>/{selectedSound.ipa}/</span>
                    </h4>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {selectedSound.examples.map((ex, idx) => {
                        const safeKey = `${selectedSound.ipa}_${ex.type || "word"}_${ex.word}`.replace(/[./\\*?:"<>|]/g, "_");
                        const progress = studentProgress[safeKey];
                        const typeText = ex.type === "sentence" ? "Câu" : ex.type === "phrase" ? "Cụm từ" : "Từ vựng";

                        return (
                          <div
                            key={idx}
                            style={{
                              border: "1px solid rgb(var(--card-border-rgb))",
                              borderRadius: "10px",
                              padding: "14px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              backgroundColor: progress ? "rgba(16, 185, 129, 0.02)" : "transparent"
                            }}
                          >
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "0.75rem", padding: "2px 6px", borderRadius: "4px", backgroundColor: "rgb(var(--foreground-rgb) / 0.05)", color: "rgb(var(--secondary-rgb))", fontWeight: 600 }}>
                                  {typeText}
                                </span>
                                <strong style={{ fontSize: "1rem" }}>{ex.word}</strong>
                                <span style={{ fontSize: "0.9rem", color: "rgb(var(--secondary-rgb))" }}>{ex.ipa}</span>
                              </div>
                              <span style={{ fontSize: "0.8rem", color: "rgb(var(--secondary-rgb))" }}>Nghĩa: {ex.meaning}</span>

                              {progress ? (
                                <div style={{ marginTop: "8px", fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "2px" }}>
                                  <div>
                                    Học sinh phát âm: <strong style={{ color: progress.isCorrect ? "rgb(16 185 129)" : "rgb(239 68 68)" }}>&quot;{progress.spokenText}&quot;</strong>
                                  </div>
                                  <div style={{ display: "flex", gap: "12px", color: "rgb(var(--secondary-rgb))" }}>
                                    <span>Độ tương đồng: {progress.confidence}%</span>
                                    <span>Thời gian: {new Date(progress.timestamp).toLocaleDateString("vi-VN")} {new Date(progress.timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                                  </div>
                                </div>
                              ) : (
                                <span style={{ marginTop: "6px", fontSize: "0.8rem", color: "rgb(var(--secondary-rgb))", fontStyle: "italic" }}>
                                  Chưa thực hành âm này
                                </span>
                              )}
                            </div>

                            {/* Nút phát âm thanh của học sinh */}
                            {progress?.audioUrl && (
                              <button
                                type="button"
                                onClick={() => playStudentAudio(safeKey, progress.audioUrl)}
                                className={`btn ${playingAudioKey === safeKey ? "btn-primary" : "btn-outline"}`}
                                style={{
                                  padding: "8px 12px",
                                  fontSize: "0.8rem",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  height: "36px"
                                }}
                              >
                                {playingAudioKey === safeKey ? (
                                  <>
                                    <div className="skeleton skeleton-circle" style={{ width: "12px", height: "12px", background: "white" }} />
                                    Đang phát...
                                  </>
                                ) : (
                                  <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                    </svg>
                                    Nghe ghi âm
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: "60px 20px", textAlign: "center", color: "rgb(var(--secondary-rgb))" }}>
              Hãy chọn một học sinh bên trái để theo dõi chi tiết kết quả phát âm.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
