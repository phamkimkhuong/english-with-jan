"use client";

import React, { useState, useEffect } from "react";
import { ref, getDownloadURL, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase/config";

interface IPAExample {
  word: string;
  ipa: string;
  meaning: string;
  audioUrl: string;
}

interface IPASound {
  ipa: string;
  name: string;
  type: "monophthong_long" | "monophthong_short" | "diphthong" | "consonant_voiceless" | "consonant_voiced";
  description: string;
  mouthShapeImage: string;
  instructionVideo?: string;
  audioUrl: string;
  examples: IPAExample[];
  commonMistakes: string[];
}

export default function AdminPronunciationPage() {
  const [sounds, setSounds] = useState<IPASound[]>([]);
  const [selectedSound, setSelectedSound] = useState<IPASound | null>(null);
  const [editSound, setEditSound] = useState<IPASound | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [message, setMessage] = useState({ text: "", type: "" });

  const loadIPASyllabus = async () => {
    try {
      setLoading(true);
      const fileRef = ref(storage, "syllabuses/pronunciation_ipa.json");
      const downloadUrl = await getDownloadURL(fileRef);
      const res = await fetch(downloadUrl);
      const data = await res.json();
      if (data && data.sounds) {
        setSounds(data.sounds);
        if (data.sounds.length > 0) {
          setSelectedSound(data.sounds[0]);
          setEditSound(JSON.parse(JSON.stringify(data.sounds[0])));
        }
        return;
      }
    } catch (err) {
      console.warn("Chưa có syllabus trên Storage, đang nạp bản mặc định ban đầu...", err);
    }

    try {
      const res = await fetch("/data/default_ipa.json");
      const data = await res.json();
      if (data && data.sounds) {
        setSounds(data.sounds);
        if (data.sounds.length > 0) {
          setSelectedSound(data.sounds[0]);
          setEditSound(JSON.parse(JSON.stringify(data.sounds[0])));
        }
      }
    } catch (e) {
      console.error("Không thể tải cấu trúc IPA mặc định:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadIPASyllabus();
  }, []);

  const selectSoundToEdit = (sound: IPASound) => {
    setSelectedSound(sound);
    setEditSound(JSON.parse(JSON.stringify(sound)));
    setMessage({ text: "", type: "" });
  };

  // Upload file lên Firebase Storage
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, folder: string, targetField: string, exampleIndex?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const key = exampleIndex !== undefined ? `${targetField}_${exampleIndex}` : targetField;
    setUploadingField(key);

    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const fileRef = ref(storage, `pronunciation/${folder}/${fileName}`);
      
      const snapshot = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snapshot.ref);

      setEditSound(prev => {
        if (!prev) return null;
        if (targetField === "mouthShapeImage") {
          return { ...prev, mouthShapeImage: url };
        } else if (targetField === "audioUrl") {
          return { ...prev, audioUrl: url };
        } else if (targetField === "exampleAudio" && exampleIndex !== undefined) {
          const updatedExamples = [...prev.examples];
          updatedExamples[exampleIndex] = { ...updatedExamples[exampleIndex], audioUrl: url };
          return { ...prev, examples: updatedExamples };
        }
        return prev;
      });
      setMessage({ text: "Tải lên tệp thành công!", type: "success" });
    } catch (err: unknown) {
      console.error("Lỗi tải lên tệp:", err);
      setMessage({ text: "Không thể tải tệp lên: " + (err instanceof Error ? err.message : ""), type: "error" });
    } finally {
      setUploadingField(null);
    }
  };

  // Lưu các chỉnh sửa tạm thời vào danh sách âm
  const handleSaveToMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSound) return;

    setSounds(prev => prev.map(s => s.ipa === editSound.ipa ? editSound : s));
    setSelectedSound(editSound);
    setMessage({ text: `Đã lưu tạm thay đổi âm /${editSound.ipa}/ vào bộ nhớ. Bấm "Xuất bản lên Cloud" để lưu vĩnh viễn.`, type: "success" });
  };

  // Đóng gói JSON và ghi đè lên Storage
  const handlePublishToCloud = async () => {
    setPublishing(true);
    setMessage({ text: "", type: "" });
    try {
      const syllabus = {
        lastUpdated: new Date().toISOString(),
        version: Date.now(),
        sounds: sounds
      };

      const jsonString = JSON.stringify(syllabus, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const fileRef = ref(storage, "syllabuses/pronunciation_ipa.json");
      
      await uploadBytes(fileRef, blob);
      setMessage({ text: "Đã xuất bản thành công syllabus phát âm lên Cloud Storage!", type: "success" });
    } catch (err: unknown) {
      console.error("Lỗi xuất bản:", err);
      setMessage({ text: "Lỗi lưu file lên Cloud: " + (err instanceof Error ? err.message : ""), type: "error" });
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "40px 0" }}>Đang tải cấu trúc dữ liệu phát âm...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgb(var(--card-border-rgb))", paddingBottom: "16px" }}>
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.5px" }}>
            Quản lý 44 Âm Phát Âm Quốc Tế
          </h2>
          <p style={{ color: "rgb(var(--secondary-rgb))", fontSize: "0.85rem" }}>
            Chỉnh sửa chi tiết cách phát âm, từ vựng ví dụ và tệp âm thanh hướng dẫn.
          </p>
        </div>
        <button
          onClick={handlePublishToCloud}
          disabled={publishing}
          className="btn btn-primary"
          style={{ padding: "10px 24px" }}
        >
          {publishing ? "Đang đẩy lên..." : "🚀 Xuất bản lên Cloud"}
        </button>
      </div>

      {message.text && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            fontSize: "0.9rem",
            backgroundColor: message.type === "success" ? "rgb(var(--accent-light-rgb))" : "rgba(239, 68, 68, 0.1)",
            color: message.type === "success" ? "rgb(var(--accent-rgb))" : "rgb(239, 68, 68)",
          }}
        >
          {message.text}
        </div>
      )}

      {/* Split interface */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
        
        {/* Left column: 44 Sounds list */}
        <div style={{ flex: "1 1 250px", borderRight: "1px solid rgb(var(--card-border-rgb))", paddingRight: "16px", display: "flex", flexDirection: "column", gap: "10px", maxHeight: "75vh", overflowY: "auto" }}>
          <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "rgb(var(--secondary-rgb))" }}>Danh sách 44 âm:</h4>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: "8px" }}>
            {sounds.map((sound) => (
              <button
                key={sound.ipa}
                onClick={() => selectSoundToEdit(sound)}
                style={{
                  height: "50px",
                  borderRadius: "8px",
                  border: selectedSound?.ipa === sound.ipa ? "2px solid rgb(var(--primary-rgb))" : "1px solid rgb(var(--card-border-rgb))",
                  background: selectedSound?.ipa === sound.ipa ? "rgb(var(--primary-light-rgb))" : "transparent",
                  cursor: "pointer",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                }}
              >
                /{sound.ipa}/
              </button>
            ))}
          </div>
        </div>

        {/* Right column: Edit form */}
        <div style={{ flex: "2 2 500px" }}>
          {editSound ? (
            <form onSubmit={handleSaveToMemory} className="card" style={{ padding: "24px", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>
                  Chỉnh Sửa Âm: <span style={{ color: "rgb(var(--primary-rgb))" }}>/{editSound.ipa}/</span> ({editSound.name})
                </h3>
                <span style={{ fontSize: "0.8rem", padding: "4px 8px", background: "rgba(var(--foreground-rgb), 0.05)", borderRadius: "4px", fontWeight: "bold" }}>
                  Mã loại: {editSound.type}
                </span>
              </div>

              {/* Hướng dẫn phát âm */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Cách đặt khẩu hình miệng & lưỡi</label>
                <textarea
                  value={editSound.description}
                  onChange={(e) => setEditSound({ ...editSound, description: e.target.value })}
                  rows={3}
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgb(var(--card-border-rgb))",
                    background: "transparent",
                    color: "inherit",
                    fontFamily: "inherit",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              {/* Tải lên ảnh và audio */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {/* Ảnh khẩu hình */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Ảnh khẩu hình miệng (URL)</label>
                  <input
                    type="text"
                    value={editSound.mouthShapeImage}
                    onChange={(e) => setEditSound({ ...editSound, mouthShapeImage: e.target.value })}
                    style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid rgb(var(--card-border-rgb))", fontSize: "0.9rem", background: "transparent", color: "inherit" }}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadFile(e, "images", "mouthShapeImage")}
                    style={{ fontSize: "0.75rem", marginTop: "4px" }}
                  />
                  {uploadingField === "mouthShapeImage" && <span style={{ fontSize: "0.75rem", color: "rgb(var(--primary-rgb))" }}>Đang tải ảnh lên...</span>}
                </div>

                {/* Audio âm mẫu */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Audio phát âm mẫu (URL)</label>
                  <input
                    type="text"
                    value={editSound.audioUrl}
                    onChange={(e) => setEditSound({ ...editSound, audioUrl: e.target.value })}
                    style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid rgb(var(--card-border-rgb))", fontSize: "0.9rem", background: "transparent", color: "inherit" }}
                  />
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleUploadFile(e, "audios", "audioUrl")}
                    style={{ fontSize: "0.75rem", marginTop: "4px" }}
                  />
                  {uploadingField === "audioUrl" && <span style={{ fontSize: "0.75rem", color: "rgb(var(--primary-rgb))" }}>Đang tải file nghe lên...</span>}
                </div>
              </div>

              {/* Lỗi thường gặp */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Lỗi thường gặp của người Việt</label>
                  <button
                    type="button"
                    onClick={() => setEditSound({ ...editSound, commonMistakes: [...editSound.commonMistakes, ""] })}
                    style={{ fontSize: "0.75rem", color: "rgb(var(--primary-rgb))", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}
                  >
                    + Thêm lỗi mới
                  </button>
                </div>
                {editSound.commonMistakes.map((mistake, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      value={mistake}
                      onChange={(e) => {
                        const updated = [...editSound.commonMistakes];
                        updated[idx] = e.target.value;
                        setEditSound({ ...editSound, commonMistakes: updated });
                      }}
                      style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid rgb(var(--card-border-rgb))", background: "transparent", color: "inherit", fontSize: "0.85rem" }}
                    />
                    <button
                      type="button"
                      onClick={() => setEditSound({ ...editSound, commonMistakes: editSound.commonMistakes.filter((_, i) => i !== idx) })}
                      style={{ padding: "8px 12px", border: "1px solid rgb(239, 68, 68)", background: "transparent", color: "rgb(239, 68, 68)", borderRadius: "8px", cursor: "pointer" }}
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>

              {/* Từ vựng ví dụ */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Danh sách từ vựng ví dụ thực hành</label>
                  <button
                    type="button"
                    onClick={() => setEditSound({ ...editSound, examples: [...editSound.examples, { word: "", ipa: "", meaning: "", audioUrl: "" }] })}
                    style={{ fontSize: "0.75rem", color: "rgb(var(--primary-rgb))", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}
                  >
                    + Thêm từ ví dụ mới
                  </button>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {editSound.examples.map((ex, idx) => (
                    <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "8px", border: "1px solid rgb(var(--card-border-rgb))", padding: "12px", borderRadius: "8px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                        <input
                          type="text"
                          value={ex.word}
                          placeholder="Từ (Ví dụ: meet)"
                          onChange={(e) => {
                            const updated = [...editSound.examples];
                            updated[idx].word = e.target.value;
                            setEditSound({ ...editSound, examples: updated });
                          }}
                          style={{ padding: "8px", borderRadius: "8px", border: "1px solid rgb(var(--card-border-rgb))", fontSize: "0.85rem", background: "transparent", color: "inherit" }}
                        />
                        <input
                          type="text"
                          value={ex.ipa}
                          placeholder="IPA (Ví dụ: /miːt/)"
                          onChange={(e) => {
                            const updated = [...editSound.examples];
                            updated[idx].ipa = e.target.value;
                            setEditSound({ ...editSound, examples: updated });
                          }}
                          style={{ padding: "8px", borderRadius: "8px", border: "1px solid rgb(var(--card-border-rgb))", fontSize: "0.85rem", background: "transparent", color: "inherit" }}
                        />
                        <input
                          type="text"
                          value={ex.meaning}
                          placeholder="Nghĩa (Ví dụ: gặp gỡ)"
                          onChange={(e) => {
                            const updated = [...editSound.examples];
                            updated[idx].meaning = e.target.value;
                            setEditSound({ ...editSound, examples: updated });
                          }}
                          style={{ padding: "8px", borderRadius: "8px", border: "1px solid rgb(var(--card-border-rgb))", fontSize: "0.85rem", background: "transparent", color: "inherit" }}
                        />
                      </div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                        <div style={{ flex: 1 }}>
                          <input
                            type="text"
                            value={ex.audioUrl}
                            placeholder="Audio URL từ vựng"
                            onChange={(e) => {
                              const updated = [...editSound.examples];
                              updated[idx].audioUrl = e.target.value;
                              setEditSound({ ...editSound, examples: updated });
                            }}
                            style={{ width: "100%", padding: "6px 8px", borderRadius: "8px", border: "1px solid rgb(var(--card-border-rgb))", fontSize: "0.8rem", background: "transparent", color: "inherit" }}
                          />
                        </div>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => handleUploadFile(e, "examples", "exampleAudio", idx)}
                          style={{ fontSize: "0.75rem", width: "180px" }}
                        />
                        <button
                          type="button"
                          onClick={() => setEditSound({ ...editSound, examples: editSound.examples.filter((_, i) => i !== idx) })}
                          style={{ padding: "6px 12px", border: "1px solid rgb(239, 68, 68)", background: "transparent", color: "rgb(239, 68, 68)", borderRadius: "8px", cursor: "pointer", fontSize: "0.8rem" }}
                        >
                          Xóa từ
                        </button>
                      </div>
                      {uploadingField === `exampleAudio_${idx}` && <span style={{ fontSize: "0.75rem", color: "rgb(var(--primary-rgb))" }}>Đang tải audio từ vựng lên...</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className="btn btn-primary"
                style={{ alignSelf: "flex-end", padding: "10px 24px", marginTop: "10px" }}
              >
                Lưu thay đổi tạm thời
              </button>
            </form>
          ) : (
            <div className="card" style={{ padding: "40px 20px", textAlign: "center", color: "rgb(var(--secondary-rgb))" }}>
              Chọn một âm bên trái để bắt đầu chỉnh sửa.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
