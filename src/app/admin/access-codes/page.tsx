"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { createAccessCode, getAccessCodes, AccessCode, deleteAccessCode, updateAccessCodeStatus } from "@/services/accessCodeService";
import { toast } from "@/hooks/useToastStore";

const AVAILABLE_COURSES = [
  { id: "all", title: "Tất cả các khóa học (Trọn gói VIP)" },
  { id: "ipa", title: "Phát âm (IPA) chuẩn Quốc tế" },
  { id: "office-communication", title: "Tiếng Anh Giao Tiếp Văn Phòng Thực Chiến" },
  { id: "practical-grammar", title: "Ngữ Pháp Thực Hành Cho Người Đi Làm" },
  { id: "academic-vocabulary", title: "Từ Vựng & Phát Âm Căn Bản Cho Sinh Viên" },
];

export default function AdminAccessCodesPage() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "used">("all");

  // Form State
  const [customCode, setCustomCode] = useState("");
  const [codeType, setCodeType] = useState<"single" | "multi">("single");
  const [selectedCourses, setSelectedCourses] = useState<string[]>(["ipa"]);
  const [description, setDescription] = useState("");
  const [maxUses, setMaxUses] = useState(30);
  const [durationDays, setDurationDays] = useState<string>("unlimited"); // "unlimited", "7", "30", "90", "custom"
  const [customDuration, setCustomDuration] = useState<string>("30");
  const [submitting, setSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchCodes = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const data = await getAccessCodes();
      setCodes(data);
    } catch (error) {
      console.error("Lỗi tải danh sách mã kích hoạt:", error);
      toast.error("Không thể tải danh sách mã kích hoạt.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      const data = await getAccessCodes();
      if (active) {
        setCodes(data);
        setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  // Tạo mã ngẫu nhiên
  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "JAN-";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCustomCode(result);
  };

  const handleCourseToggle = (courseId: string) => {
    if (courseId === "all") {
      setSelectedCourses(["all"]);
      return;
    }

    setSelectedCourses((prev) => {
      const filtered = prev.filter((id) => id !== "all");
      if (filtered.includes(courseId)) {
        const next = filtered.filter((id) => id !== courseId);
        return next.length === 0 ? ["ipa"] : next;
      } else {
        return [...filtered, courseId];
      }
    });
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!customCode.trim()) {
      toast.error("Vui lòng nhập hoặc sinh mã kích hoạt.");
      return;
    }
    if (selectedCourses.length === 0) {
      toast.error("Vui lòng chọn ít nhất một khóa học.");
      return;
    }

    setSubmitting(true);
    try {
      
      let durationVal: number | null = null;
      if (durationDays !== "unlimited") {
        durationVal = durationDays === "custom" ? Number(customDuration) : Number(durationDays);
        if (isNaN(durationVal) || durationVal <= 0) {
          toast.error("Thời hạn học tập phải là một số nguyên dương.");
          setSubmitting(false);
          return;
        }
      }

      await createAccessCode({
        code: customCode.toUpperCase(),
        type: codeType,
        allowedCourses: selectedCourses,
        description: description.trim(),
        maxUses: codeType === "multi" ? Number(maxUses) : 1,
        createdBy: user.uid,
        durationDays: durationVal,
      });

      toast.success("Tạo mã kích hoạt thành công!");
      setCustomCode("");
      setDescription("");
      setDurationDays("unlimited");
      setCustomDuration("30");
      setShowCreateForm(false);
      await fetchCodes(true);
    } catch (error: unknown) {
      console.error("Lỗi tạo mã:", error);
      const err = error as Error;
      toast.error(err.message || "Tạo mã kích hoạt thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCode = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    toast.success(`Đã sao chép mã: ${codeText}`);
  };

  const handleDeleteCode = async (codeText: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mã "${codeText}" không?`)) return;
    try {
      await deleteAccessCode(codeText);
      toast.success("Xóa mã kích hoạt thành công!");
      await fetchCodes(true);
    } catch (error) {
      console.error("Lỗi xóa mã:", error);
      toast.error("Không thể xóa mã kích hoạt.");
    }
  };

  const handleToggleStatus = async (codeItem: AccessCode) => {
    const nextStatus = codeItem.status === "active" ? "expired" : "active";
    try {
      await updateAccessCodeStatus(codeItem.code, nextStatus);
      toast.success(nextStatus === "active" ? "Kích hoạt lại mã thành công!" : "Tạm dừng mã thành công!");
      await fetchCodes(true);
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái mã:", error);
      toast.error("Không thể cập nhật trạng thái mã.");
    }
  };

  // Lọc danh sách mã
  const filteredCodes = codes.filter((code) => {
    if (filterStatus === "all") return true;
    return code.status === filterStatus;
  });

  // Tính toán chỉ số thống kê
  const statTotal = codes.length;
  const statActive = codes.filter((c) => c.status === "active").length;
  const statTotalRedeems = codes.reduce((acc, curr) => acc + (curr.currentUses || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* Nút Tạo mã góc trên */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "rgb(var(--foreground-rgb))" }}>
          Danh sách mã học viên
        </h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-primary"
          style={{ padding: "8px 16px", fontSize: "0.9rem" }}
        >
          {showCreateForm ? "Đóng bảng tạo mã" : "➕ Tạo mã kích hoạt mới"}
        </button>
      </div>

      {/* Form tạo mã nhanh */}
      {showCreateForm && (
        <div className="card" style={{ padding: "24px", border: "1px solid rgba(var(--primary-rgb), 0.15)" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 750, marginBottom: "16px" }}>
            Tạo Mã Kích Hoạt Mới
          </h3>

          <form onSubmit={handleCreateCode} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
              
              {/* Nhập mã */}
              <div style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Mã kích hoạt</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder="MÃ-KÍCH-HOẠT-VIP"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgb(var(--card-border-rgb))",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="btn btn-outline"
                    style={{ padding: "8px 12px", fontSize: "0.85rem" }}
                  >
                    Ngẫu nhiên 🎲
                  </button>
                </div>
              </div>

              {/* Loại mã */}
              <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Loại sử dụng</label>
                <select
                  value={codeType}
                  onChange={(e) => setCodeType(e.target.value as "single" | "multi")}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgb(var(--card-border-rgb))",
                    fontSize: "0.9rem",
                    backgroundColor: "white",
                    outline: "none",
                  }}
                >
                  <option value="single">Cá nhân (Chỉ dùng 1 lần)</option>
                  <option value="multi">Lớp học / Nhóm (Dùng nhiều lần)</option>
                </select>
              </div>

              {/* Giới hạn dùng nếu là Multi */}
              {codeType === "multi" && (
                <div style={{ flex: "1 1 120px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Giới hạn lượt dùng</label>
                  <input
                    type="number"
                    min="2"
                    max="10000"
                    value={maxUses}
                    onChange={(e) => setMaxUses(Number(e.target.value))}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgb(var(--card-border-rgb))",
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>
              )}

              {/* Thời hạn học tập */}
              <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Thời hạn học tập</label>
                <select
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgb(var(--card-border-rgb))",
                    fontSize: "0.9rem",
                    backgroundColor: "white",
                    outline: "none",
                  }}
                >
                  <option value="unlimited">Không giới hạn (Vĩnh viễn)</option>
                  <option value="7">7 ngày học</option>
                  <option value="30">30 ngày học</option>
                  <option value="90">90 ngày học</option>
                  <option value="custom">Tùy chỉnh số ngày</option>
                </select>
              </div>

              {/* Nhập số ngày học nếu chọn Tùy chỉnh */}
              {durationDays === "custom" && (
                <div style={{ flex: "1 1 120px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Số ngày học</label>
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgb(var(--card-border-rgb))",
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                </div>
              )}



            </div>

            {/* Khóa học áp dụng */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Quyền mở khóa khóa học</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {AVAILABLE_COURSES.map((course) => {
                  const isSelected = selectedCourses.includes(course.id);
                  return (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => handleCourseToggle(course.id)}
                      className="btn"
                      style={{
                        padding: "6px 12px",
                        fontSize: "0.8rem",
                        backgroundColor: isSelected ? "rgb(var(--primary-light-rgb))" : "transparent",
                        color: isSelected ? "rgb(var(--primary-rgb))" : "rgb(var(--secondary-rgb))",
                        border: `1px solid ${isSelected ? "rgb(var(--primary-rgb))" : "rgb(var(--card-border-rgb))"}`,
                      }}
                    >
                      {isSelected ? "✓ " : ""}{course.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mô tả */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Mô tả ngắn (Lưu ý cho giáo viên)</label>
              <input
                type="text"
                placeholder="Ví dụ: Mã tặng cho bạn Nguyễn Văn A học IPA, hoặc Mã lớp VIP giao tiếp tối thứ 3..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgb(var(--card-border-rgb))",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
            </div>

            {/* Submit */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{ padding: "10px 24px", fontSize: "0.9rem" }}
              >
                {submitting ? "Đang tạo mã..." : "Tạo và Lưu mã"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Thẻ Thống kê nhanh */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        
        {/* Tổng số mã */}
        <div className="card" style={{ flex: "1 1 200px", padding: "16px 20px" }}>
          <span style={{ fontSize: "0.8rem", color: "rgb(var(--secondary-rgb))", fontWeight: 600 }}>
            TỔNG SỐ MÃ ĐÃ PHÁT
          </span>
          <h3 style={{ fontSize: "2rem", fontWeight: 900, color: "rgb(var(--foreground-rgb))", marginTop: "4px" }}>
            {statTotal}
          </h3>
        </div>

        {/* Mã đang chạy */}
        <div className="card" style={{ flex: "1 1 200px", padding: "16px 20px" }}>
          <span style={{ fontSize: "0.8rem", color: "rgb(var(--secondary-rgb))", fontWeight: 600 }}>
            MÃ ĐANG HOẠT ĐỘNG
          </span>
          <h3 style={{ fontSize: "2rem", fontWeight: 900, color: "rgb(var(--accent-rgb))", marginTop: "4px" }}>
            {statActive}
          </h3>
        </div>

        {/* Lượt kích hoạt */}
        <div className="card" style={{ flex: "1 1 200px", padding: "16px 20px" }}>
          <span style={{ fontSize: "0.8rem", color: "rgb(var(--secondary-rgb))", fontWeight: 600 }}>
            TỔNG SỐ LƯỢT KÍCH HOẠT
          </span>
          <h3 style={{ fontSize: "2rem", fontWeight: 900, color: "rgb(var(--primary-rgb))", marginTop: "4px" }}>
            {statTotalRedeems}
          </h3>
        </div>

      </div>

      {/* Bộ lọc trạng thái */}
      <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid rgb(var(--card-border-rgb))", paddingBottom: "12px" }}>
        <button
          onClick={() => setFilterStatus("all")}
          style={{
            background: "none",
            border: "none",
            fontSize: "0.9rem",
            fontWeight: filterStatus === "all" ? "700" : "500",
            color: filterStatus === "all" ? "rgb(var(--primary-rgb))" : "rgb(var(--secondary-rgb))",
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          Tất cả
        </button>
        <button
          onClick={() => setFilterStatus("active")}
          style={{
            background: "none",
            border: "none",
            fontSize: "0.9rem",
            fontWeight: filterStatus === "active" ? "700" : "500",
            color: filterStatus === "active" ? "rgb(var(--primary-rgb))" : "rgb(var(--secondary-rgb))",
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          Đang hoạt động (Còn lượt)
        </button>
        <button
          onClick={() => setFilterStatus("used")}
          style={{
            background: "none",
            border: "none",
            fontSize: "0.9rem",
            fontWeight: filterStatus === "used" ? "700" : "500",
            color: filterStatus === "used" ? "rgb(var(--primary-rgb))" : "rgb(var(--secondary-rgb))",
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          Đã dùng hết / Khóa
        </button>
      </div>

      {/* Danh sách bảng mã */}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <div className="skeleton" style={{ width: "100%", height: "200px" }} />
        </div>
      ) : filteredCodes.length === 0 ? (
        <div className="card" style={{ padding: "40px", textAlign: "center", color: "rgb(var(--secondary-rgb))" }}>
          Không tìm thấy mã kích hoạt nào tương ứng với bộ lọc.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredCodes.map((item) => {
            const isInactive = item.status === "used";
            return (
              <div
                key={item.code}
                className="card"
                style={{
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  backgroundColor: isInactive ? "rgba(var(--foreground-rgb), 0.01)" : "rgb(var(--card-bg-rgb))",
                  borderColor: item.status === "active"
                    ? "rgba(var(--accent-rgb), 0.2)"
                    : "rgb(var(--card-border-rgb))",
                  opacity: isInactive ? 0.8 : 1,
                }}
              >
              {/* Tiêu đề card */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                
                {/* Code & Coppy */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: "1.25rem",
                      fontWeight: "800",
                      backgroundColor: "rgba(var(--foreground-rgb), 0.05)",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      color: "rgb(var(--foreground-rgb))",
                    }}
                  >
                    {item.code}
                  </span>
                  <button
                    onClick={() => handleCopyCode(item.code)}
                    className="btn btn-outline"
                    style={{ padding: "4px 8px", fontSize: "0.75rem", borderRadius: "6px" }}
                    title="Sao chép mã vào clipboard"
                  >
                    📋 Copy
                  </button>
                </div>

                {/* Trạng thái & loại */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      padding: "4px 8px",
                      borderRadius: "100px",
                      backgroundColor: item.type === "single" ? "rgba(var(--primary-rgb), 0.08)" : "rgba(var(--accent-rgb), 0.08)",
                      color: item.type === "single" ? "rgb(var(--primary-rgb))" : "rgb(var(--accent-rgb))",
                    }}
                  >
                    {item.type === "single" ? "Cá nhân (1 lần)" : `Nhóm (Max ${item.maxUses} lượt)`}
                  </span>
                  
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      padding: "4px 8px",
                      borderRadius: "100px",
                      backgroundColor: item.status === "active" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                      color: item.status === "active" ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)",
                    }}
                  >
                    {item.status === "active" ? "Hoạt động" : "Hết lượt"}
                  </span>
                </div>

              </div>

              {/* Chi tiết nội dung mã */}
              <div style={{ fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: "8px" }}>
                {item.description && (
                  <p style={{ color: "rgb(var(--foreground-rgb))", fontWeight: "500" }}>
                    📝 <strong>Mô tả:</strong> {item.description}
                  </p>
                )}

                <div>
                  <strong>🔑 Mở khóa: </strong>
                  {item.allowedCourses.map((cId) => {
                    const match = AVAILABLE_COURSES.find((ac) => ac.id === cId);
                    return (
                      <span
                        key={cId}
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          backgroundColor: "rgba(var(--primary-rgb), 0.05)",
                          color: "rgb(var(--primary-rgb))",
                          fontWeight: "600",
                          marginRight: "6px",
                          border: "1px solid rgba(var(--primary-rgb), 0.1)",
                        }}
                      >
                        {match ? match.title : cId}
                      </span>
                    );
                  })}
                </div>

                <div style={{ color: "rgb(var(--secondary-rgb))", fontSize: "0.8rem", marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
                  <span>📅 Ngày phát: {item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleString("vi-VN") : "Đang tạo..."}</span>
                  <span>📖 Hạn học: <strong>{item.durationDays ? `${item.durationDays} ngày` : "Vĩnh viễn (Trọn đời)"}</strong></span>
                  {item.type === "multi" && (
                    <span>
                      👥 Đã kích hoạt: <strong>{item.currentUses} / {item.maxUses}</strong> lượt dùng.
                    </span>
                  )}
                </div>
              </div>

              {/* Lịch sử kích hoạt của học viên */}
              {item.usedBy && item.usedBy.length > 0 && (
                <div
                  style={{
                    borderTop: "1px solid rgb(var(--card-border-rgb))",
                    paddingTop: "12px",
                    marginTop: "4px",
                  }}
                >
                  <p style={{ fontSize: "0.8rem", fontWeight: "700", color: "rgb(var(--secondary-rgb))", marginBottom: "8px" }}>
                    🎓 Danh sách học sinh đã dùng ({item.usedBy.length}):
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {item.usedBy.map((uid) => (
                      <span
                        key={uid}
                        style={{
                          fontSize: "0.75rem",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          backgroundColor: "rgba(var(--foreground-rgb), 0.03)",
                          border: "1px solid rgb(var(--card-border-rgb))",
                          color: "rgb(var(--secondary-rgb))",
                          fontFamily: "monospace",
                        }}
                        title={`ID người dùng: ${uid}`}
                      >
                        UID: {uid.substring(0, 8)}...
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Nhóm nút hành động quản lý mã */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  borderTop: "1px solid rgb(var(--card-border-rgb))",
                  paddingTop: "12px",
                  marginTop: "8px",
                }}
              >
                <button
                  onClick={() => handleToggleStatus(item)}
                  style={{
                    padding: "6px 12px",
                    fontSize: "0.75rem",
                    borderRadius: "6px",
                    border: "1px solid rgb(var(--card-border-rgb))",
                    backgroundColor: "transparent",
                    color: item.status === "active" ? "rgb(239, 68, 68)" : "rgb(16, 185, 129)",
                    cursor: "pointer",
                    fontWeight: "600",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = item.status === "active" ? "rgba(239, 68, 68, 0.05)" : "rgba(16, 185, 129, 0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {item.status === "active" ? "⏸ Tạm dừng" : "▶ Tiếp tục"}
                </button>
                <button
                  onClick={() => handleDeleteCode(item.code)}
                  style={{
                    padding: "6px 12px",
                    fontSize: "0.75rem",
                    borderRadius: "6px",
                    border: "1px solid rgb(var(--card-border-rgb))",
                    backgroundColor: "transparent",
                    color: "rgb(239, 68, 68)",
                    cursor: "pointer",
                    fontWeight: "600",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  🗑 Xóa mã
                </button>
              </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
