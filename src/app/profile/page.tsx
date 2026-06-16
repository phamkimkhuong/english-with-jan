"use client";

import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db, auth } from "@/lib/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { redeemAccessCode } from "@/services/accessCodeService";
import { toast } from "@/hooks/useToastStore";
import styles from "./profile.module.css";

export default function ProfilePage() {
  const { user, loading, unlockedCourses = [], unlockedCoursesExpiry = {}, activatedCodes = [] } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [facebook, setFacebook] = useState("");
  const [job, setJob] = useState("");
  const [address, setAddress] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Tab và Kích hoạt trạng thái
  const [activeTab, setActiveTab] = useState<"info" | "activation">("info");
  const [code, setCode] = useState("");
  const [activating, setActivating] = useState(false);

  const handleActivateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!code.trim()) {
      toast.error("Vui lòng nhập mã kích hoạt.");
      return;
    }

    setActivating(true);
    try {
      await redeemAccessCode(user.uid, code.trim());
      toast.success("Kích hoạt khóa học thành công! Chúc bạn học tập vui vẻ.");
      setCode("");
    } catch (err: unknown) {
      console.error("Lỗi kích hoạt mã:", err);
      const error = err as Error;
      toast.error(error.message || "Kích hoạt mã thất bại. Vui lòng kiểm tra lại.");
    } finally {
      setActivating(false);
    }
  };

  // 1. Tải thông tin người dùng từ Firestore khi đã đăng nhập
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        setLoadingData(true);
        // Đặt mặc định display name từ Auth trước
        setDisplayName(user.displayName || "");

        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.displayName) setDisplayName(data.displayName);
          if (data.phone) setPhone(data.phone);
          if (data.facebook) setFacebook(data.facebook);
          if (data.job) setJob(data.job);
          if (data.address) setAddress(data.address);
        }
      } catch (err) {
        console.error("Lỗi tải thông tin cá nhân từ Firestore:", err);
        toast.error("Không thể tải thông tin cá nhân của bạn.");
      } finally {
        setLoadingData(false);
      }
    };

    fetchUserData();
  }, [user]);

  // 2. Xử lý cập nhật thông tin cá nhân
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!displayName.trim()) {
      toast.error("Họ và tên không được để trống.");
      return;
    }

    setUpdating(true);
    try {
      // a. Cập nhật hồ sơ trong Firebase Auth để đồng bộ hiển thị Navbar ngay lập tức
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: displayName.trim(),
        });
      }

      // b. Cập nhật thông tin chi tiết vào tài liệu Firestore
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(
        userDocRef,
        {
          displayName: displayName.trim(),
          phone: phone.trim(),
          facebook: facebook.trim(),
          job: job.trim(),
          address: address.trim(),
        },
        { merge: true }
      );

      toast.success("Cập nhật thông tin cá nhân thành công!");
    } catch (err) {
      console.error("Lỗi cập nhật thông tin cá nhân:", err);
      toast.error("Cập nhật thông tin thất bại. Vui lòng thử lại sau.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className={`${styles.profileContainer} container`}>
        <div className={styles.loadingOverlay}>
          <div className="skeleton skeleton-circle" style={{ width: "80px", height: "80px", marginBottom: "20px" }} />
          <div className="skeleton" style={{ width: "200px", height: "24px", marginBottom: "12px" }} />
          <div className="skeleton" style={{ width: "300px", height: "16px" }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`${styles.profileContainer} container`}>
        <div className="card" style={{ padding: "40px", textAlign: "center", maxWidth: "500px", margin: "40px auto" }}>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "12px" }}>
            Yêu cầu Đăng Nhập
          </h3>
          <p style={{ color: "rgb(var(--secondary-rgb))", fontSize: "0.9rem", marginBottom: "24px" }}>
            Vui lòng đăng nhập tài khoản của bạn để xem và điều chỉnh thông tin hồ sơ cá nhân.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.profileContainer} container`}>
      <div className={styles.profileLayout}>
        
        {/* Cột trái: Thẻ Sidebar tóm tắt */}
        <aside className={styles.sidebarCard}>
          <div className={styles.avatarCircle}>
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt={displayName} className={styles.avatarImg} />
            ) : (
              <span>{displayName.charAt(0).toUpperCase() || "U"}</span>
            )}
          </div>
          <h3 className={styles.userName}>{displayName || "Người dùng"}</h3>
          <p className={styles.userEmail}>{user.email}</p>

          <div className={styles.sidebarNav}>
            <button
              type="button"
              className={activeTab === "info" ? styles.navBtnActive : styles.navBtn}
              onClick={() => setActiveTab("info")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              Thông tin tài khoản
            </button>
            
            <button
              type="button"
              className={activeTab === "activation" ? styles.navBtnActive : styles.navBtn}
              onClick={() => setActiveTab("activation")}
              style={{ cursor: activeTab === "activation" ? "default" : "pointer" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Kích hoạt học tập
            </button>
          </div>
        </aside>

        {/* Cột phải: Form chi tiết hoặc Bảng kích hoạt khóa học */}
        <main className={styles.formCard}>
          {activeTab === "info" ? (
            <>
              <h3 className={styles.formTitle}>
                <span className={styles.titleIcon}>ℹ️</span> Thông tin cá nhân
              </h3>

              <form onSubmit={handleSubmit} className={styles.formGrid}>
                {/* Họ và Tên */}
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Họ và Tên</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={styles.inputText}
                    placeholder="Nhập họ và tên của bạn"
                    maxLength={50}
                  />
                </div>

                {/* Email (Readonly) */}
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Email</label>
                  <input
                    type="email"
                    value={user.email || ""}
                    disabled
                    className={`${styles.inputText} ${styles.inputTextDisabled}`}
                    title="Email đăng nhập không thể chỉnh sửa"
                  />
                </div>

                {/* Số điện thoại */}
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Số điện thoại</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={styles.inputText}
                    placeholder="Số điện thoại"
                    maxLength={15}
                  />
                </div>

                {/* Link Facebook */}
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Link Facebook</label>
                  <input
                    type="text"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    className={styles.inputText}
                    placeholder="Link Facebook của bạn"
                  />
                </div>

                {/* Nghề nghiệp */}
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Nghề nghiệp</label>
                  <input
                    type="text"
                    value={job}
                    onChange={(e) => setJob(e.target.value)}
                    className={styles.inputText}
                    placeholder="Nghề nghiệp của bạn"
                    maxLength={50}
                  />
                </div>

                {/* Địa chỉ */}
                <div className={`${styles.inputGroup} ${styles.inputGroupFull}`}>
                  <label className={styles.inputLabel}>Địa chỉ</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={`${styles.inputText} ${styles.textarea}`}
                    placeholder="Địa chỉ"
                    rows={3}
                  />
                </div>

                {/* Nút Submit cập nhật */}
                <div className={`${styles.formFooter} ${styles.inputGroupFull}`}>
                  <button
                    type="submit"
                    disabled={updating}
                    className={styles.submitBtn}
                  >
                    {updating ? "Đang cập nhật..." : "Cập nhật"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <h3 className={styles.formTitle}>
                <span className={styles.titleIcon}>🔑</span> Kích hoạt học tập
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                
                {/* Form kích hoạt */}
                <form onSubmit={handleActivateCode} style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "400px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700 }}>Mã kích hoạt khóa học</label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input
                      type="text"
                      placeholder="Nhập mã kích hoạt của bạn..."
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      disabled={activating}
                      className={styles.inputText}
                      style={{ flex: 1, textTransform: "uppercase", fontWeight: "600" }}
                    />
                    <button
                      type="submit"
                      disabled={activating}
                      className={styles.submitBtn}
                      style={{ padding: "0 20px" }}
                    >
                      {activating ? "Đang xử lý..." : "Kích hoạt"}
                    </button>
                  </div>
                </form>

                {/* Danh sách các khóa học đã kích hoạt */}
                <div style={{ borderTop: "1px solid rgb(var(--card-border-rgb))", paddingTop: "20px" }}>
                  <h4 style={{ fontSize: "1rem", fontWeight: 750, marginBottom: "12px" }}>
                    Khóa học đã mở khóa
                  </h4>

                  {unlockedCourses.length === 0 ? (
                    <p style={{ color: "rgb(var(--secondary-rgb))", fontSize: "0.9rem" }}>
                      Tài khoản của bạn chưa kích hoạt khóa học nào. Hãy nhập mã kích hoạt do giáo viên cung cấp để bắt đầu.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {unlockedCourses.includes("all") ? (
                        (() => {
                          const expiry = unlockedCoursesExpiry?.["all"];
                          const expiryDate = expiry ? new Date(expiry.seconds * 1000) : null;
                          const isAllExpired = expiryDate ? (new Date() > expiryDate) : false;
                          return (
                            <div
                              className="card"
                              style={{
                                padding: "16px",
                                border: isAllExpired ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid rgba(var(--accent-rgb), 0.2)",
                                backgroundColor: isAllExpired ? "rgba(239, 68, 68, 0.01)" : "rgba(var(--accent-rgb), 0.02)",
                                opacity: isAllExpired ? 0.7 : 1,
                              }}
                            >
                              <h5 style={{ fontWeight: 800, color: isAllExpired ? "rgb(239, 68, 68)" : "rgb(var(--accent-rgb))" }}>
                                {isAllExpired ? "❌ Quyền Truy Cập VIP (Hết Hạn)" : "🌟 Quyền Truy Cập VIP (Trọn Gói)"}
                              </h5>
                              <p style={{ fontSize: "0.85rem", color: "rgb(var(--secondary-rgb))", marginTop: "4px" }}>
                                {isAllExpired 
                                  ? `Quyền truy cập VIP của bạn đã hết hạn học vào ngày ${expiryDate?.toLocaleString("vi-VN")}.`
                                  : expiryDate
                                  ? `Bạn có quyền truy cập toàn bộ các khóa học đến ngày ${expiryDate.toLocaleString("vi-VN")}.`
                                  : "Tài khoản của bạn đã được mở khóa truy cập toàn bộ các khóa học vĩnh viễn."}
                              </p>
                            </div>
                          );
                        })()
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
                          {unlockedCourses.map((cId) => {
                            const courseName =
                              cId === "ipa"
                                ? "Luyện phát âm IPA chuẩn Quốc tế"
                                : cId === "office-communication"
                                ? "Tiếng Anh Giao Tiếp Văn Phòng"
                                : cId === "practical-grammar"
                                ? "Ngữ Pháp Tiếng Anh Thực Hành"
                                : cId === "academic-vocabulary"
                                ? "Từ Vựng Cho Sinh Viên"
                                : cId;

                            const expiry = unlockedCoursesExpiry?.[cId];
                            const expiryDate = expiry ? new Date(expiry.seconds * 1000) : null;
                            const isCourseExpired = expiryDate ? (new Date() > expiryDate) : false;

                            return (
                              <div
                                key={cId}
                                style={{
                                  padding: "12px 16px",
                                  border: isCourseExpired ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid rgb(var(--card-border-rgb))",
                                  backgroundColor: "rgba(var(--foreground-rgb), 0.01)",
                                  borderRadius: "8px",
                                  opacity: isCourseExpired ? 0.7 : 1,
                                }}
                              >
                                <h5 style={{ fontWeight: 750, color: isCourseExpired ? "rgb(239, 68, 68)" : "rgb(var(--foreground-rgb))", fontSize: "0.85rem", marginBottom: "4px" }}>
                                  {isCourseExpired ? "✗ " : "✓ "}{courseName}
                                </h5>
                                <span style={{ fontSize: "0.75rem", color: isCourseExpired ? "rgb(239, 68, 68)" : "rgb(var(--secondary-rgb))" }}>
                                  {isCourseExpired 
                                    ? "Đã hết hạn học" 
                                    : expiryDate 
                                    ? `Hạn học: ${expiryDate.toLocaleDateString("vi-VN")}` 
                                    : "Học trọn đời"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {activatedCodes.length > 0 && (
                        <div style={{ marginTop: "12px", fontSize: "0.8rem", color: "rgb(var(--secondary-rgb))" }}>
                          <strong>Lịch sử mã đã nhập:</strong> {activatedCodes.join(", ")}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </>
          )}
        </main>

      </div>
    </div>
  );
}
