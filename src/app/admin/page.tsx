"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { toast } from "@/hooks/useToastStore";
import { createLogger } from "@/utils/logger";

const logger = createLogger("AdminDashboard");

interface StudentProgress {
  id: string;
  name: string;
  email: string;
  course: string;
  progress: number;
  lastActive: string;
}

const mapCourseIdToName = (courseId: string) => {
  const mapping: { [key: string]: string } = {
    "office-communication": "Tiếng Anh Giao Tiếp Văn Phòng Thực Chiến",
    "practical-grammar": "Ngữ Pháp Tiếng Anh Thực Hành Cho Người Đi Làm",
    "academic-vocabulary": "Từ Vựng & Phát Âm Căn Bản Cho Sinh Viên",
  };
  return mapping[courseId] || courseId;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatLastActive = (timestamp: any) => {
  if (!timestamp) return "Chưa hoạt động";
  
  let date: Date;
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else {
    date = new Date(timestamp);
  }
  
  if (isNaN(date.getTime())) return "Chưa rõ";

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Vừa mới hoạt động";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays === 1) return "Hôm qua";
  return `${diffDays} ngày trước`;
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [newTeacherName, setNewTeacherName] = useState("");
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<{ id: string; email: string; displayName: string; role: string }[]>([]);
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // Lấy danh sách học sinh thực tế từ Firestore
  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      const q = query(collection(db, "users"), where("role", "==", "student"));
      const querySnapshot = await getDocs(q);
      const list: StudentProgress[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const progressData = data.progress || {};
        const courseIds = Object.keys(progressData);
        
        if (courseIds.length === 0) {
          list.push({
            id: docSnap.id,
            name: data.displayName || "Học viên ẩn danh",
            email: data.email || "",
            course: "Chưa tham gia khóa học nào",
            progress: 0,
            lastActive: formatLastActive(data.lastActive || data.createdAt),
          });
        } else {
          courseIds.forEach((courseId) => {
            list.push({
              id: `${docSnap.id}_${courseId}`,
              name: data.displayName || "Học viên ẩn danh",
              email: data.email || "",
              course: mapCourseIdToName(courseId),
              progress: progressData[courseId] || 0,
              lastActive: formatLastActive(data.lastActive || data.createdAt),
            });
          });
        }
      });
      setStudents(list);
    } catch (error) {
      logger.error("Lỗi lấy danh sách học sinh:", error);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Lấy danh sách giáo viên từ Firestore để hiển thị
  const fetchTeachers = async () => {
    try {
      const q = query(collection(db, "users"));
      const querySnapshot = await getDocs(q);
      const list: { id: string; email: string; displayName: string; role: string }[] = [];
      querySnapshot.forEach((snapshotDoc) => {
        const data = snapshotDoc.data();
        if (data.role === "teacher" || data.role === "admin") {
          list.push({ 
            id: snapshotDoc.id, 
            email: data.email || "",
            displayName: data.displayName || "",
            role: data.role || ""
          });
        }
      });
      setTeachers(list);
    } catch (error) {
      logger.error("Lỗi lấy danh sách giáo viên:", error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTeachers();
    fetchStudents();
  }, []);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherEmail || !newTeacherName) {
      toast.warning("Vui lòng nhập đầy đủ thông tin tên và email!");
      return;
    }

    setLoading(true);

    try {
      // Vì không thể tạo tài khoản hộ bằng email trong client SDK, ta sẽ gán quyền trước vào DB.
      // Khi giáo viên đó đăng nhập lần đầu bằng Google có email trùng khớp, AuthContext sẽ tự nhận diện và cấp quyền.
      // Chúng ta tạo UID tạm thời hoặc dùng chính email đã mã hóa, hoặc gán doc theo một ID tự sinh.
      // Giải pháp tốt nhất: Lưu thông tin vào một document có ID ngẫu nhiên hoặc gán trực tiếp email.
      // Tuy nhiên, do AuthContext tìm document theo UID, ta có thể lưu cấu trúc cấp quyền này vào một bộ sưu tập riêng tên là `pending_roles`.
      // Hoặc đơn giản là tạo trước document trong collection `users` bằng cách sử dụng email làm ID tạm thời,
      // nhưng tốt nhất ta lưu vào collection `users` có ID ngẫu nhiên và AuthContext sẽ quét theo email.
      // Hãy lưu một doc vào bảng `users` với ID tự sinh, AuthContext khi khởi tạo sẽ quét nếu có email trùng thì gán UID đó.
      // Để đơn giản và tối ưu: Ta ghi đè document trong collection `users` sử dụng email đã chuẩn hóa làm ID (hoặc lưu UID nếu họ đã từng đăng nhập).
      // Để chắc chắn: Ta tạo một document trong collection `users` với document ID là Email. Khi giáo viên đăng nhập, ta sẽ chuyển email thành ID.
      // Hãy tạo document với ID là Email của giáo viên đó.
      const normalizedEmail = newTeacherEmail.trim().toLowerCase();
      const userDocRef = doc(db, "users", normalizedEmail);
      
      await setDoc(userDocRef, {
        email: normalizedEmail,
        displayName: newTeacherName.trim(),
        role: "teacher",
        createdAt: serverTimestamp(),
      });

      toast.success(`Đã cấp quyền Giáo viên thành công cho email: ${normalizedEmail}`);
      setNewTeacherEmail("");
      setNewTeacherName("");
      fetchTeachers();
    } catch (error: unknown) {
      logger.error("Lỗi cấp quyền giáo viên:", error);
      toast.error("Lỗi phân quyền giáo viên. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  // Kiểm tra xem user hiện tại có phải Super Admin không
  const isSuperAdmin = user?.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
      {/* Metric Cards */}
      <div className="grid">
        {/* Metric 1 */}
        <div className="card" style={{ padding: "20px" }}>
          <span style={{ fontSize: "0.85rem", color: "rgb(var(--secondary-rgb))", fontWeight: 600, textTransform: "uppercase" }}>
            Khóa học đang dạy
          </span>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, marginTop: "8px" }}>3</h2>
        </div>
        {/* Metric 2 */}
        <div className="card" style={{ padding: "20px" }}>
          <span style={{ fontSize: "0.85rem", color: "rgb(var(--secondary-rgb))", fontWeight: 600, textTransform: "uppercase" }}>
            Tổng số Học sinh
          </span>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, marginTop: "8px" }}>15</h2>
        </div>
        {/* Metric 3 */}
        <div className="card" style={{ padding: "20px" }}>
          <span style={{ fontSize: "0.85rem", color: "rgb(var(--secondary-rgb))", fontWeight: 600, textTransform: "uppercase" }}>
            Số Giáo viên hỗ trợ
          </span>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, marginTop: "8px" }}>{teachers.length}</h2>
        </div>
      </div>

      {/* Phân quyền Giáo viên (Chỉ Super Admin mới thấy) */}
      {isSuperAdmin && (
        <div className="card" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "16px" }}>
            Cấp quyền Giáo viên mới (Quản trị tối cao)
          </h3>
          <form onSubmit={handleAddTeacher} style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "flex-end", marginBottom: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: "200px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Họ và tên giáo viên</label>
              <input
                type="text"
                value={newTeacherName}
                onChange={(e) => setNewTeacherName(e.target.value)}
                placeholder="Ví dụ: Cô Lan Anh"
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid rgb(var(--card-border-rgb))",
                  fontSize: "0.95rem",
                  background: "transparent",
                  color: "inherit",
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: "200px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Email đăng nhập Google</label>
              <input
                type="email"
                value={newTeacherEmail}
                onChange={(e) => setNewTeacherEmail(e.target.value)}
                placeholder="teacher@gmail.com"
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid rgb(var(--card-border-rgb))",
                  fontSize: "0.95rem",
                  background: "transparent",
                  color: "inherit",
                }}
              />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: "11px 24px" }}>
              {loading ? "Đang xử lý..." : "Cấp quyền Giáo viên"}
            </button>
          </form>

          {/* Danh sách giáo viên hiện tại */}
          <div>
            <h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "10px", color: "rgb(var(--secondary-rgb))" }}>
              Danh sách tài khoản quản trị hiện tại:
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              {teachers.map((t) => (
                <div
                  key={t.id}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "20px",
                    background: "rgba(var(--foreground-rgb), 0.03)",
                    border: "1px solid rgb(var(--card-border-rgb))",
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{t.displayName}</span>
                  <span style={{ opacity: 0.6 }}>({t.email})</span>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      background: t.role === "admin" ? "rgb(var(--primary-light-rgb))" : "rgb(var(--accent-light-rgb))",
                      color: t.role === "admin" ? "rgb(var(--primary-rgb))" : "rgb(var(--accent-rgb))",
                    }}
                  >
                    {t.role === "admin" ? "Quản trị viên" : "Giáo viên"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Học sinh & Tiến độ học tập */}
      <div className="card" style={{ padding: "24px" }}>
        <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "16px" }}>
          Theo dõi Tiến độ Học sinh
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.95rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid rgb(var(--card-border-rgb))", color: "rgb(var(--secondary-rgb))" }}>
                <th style={{ padding: "12px 16px" }}>Họ tên Học sinh</th>
                <th style={{ padding: "12px 16px" }}>Khóa học</th>
                <th style={{ padding: "12px 16px" }}>Tiến độ hoàn thành</th>
                <th style={{ padding: "12px 16px" }}>Hoạt động cuối</th>
              </tr>
            </thead>
            <tbody>
              {loadingStudents ? (
                <tr>
                  <td colSpan={4} style={{ padding: "30px", textAlign: "center", color: "rgb(var(--secondary-rgb))" }}>
                    <div className="skeleton" style={{ width: "120px", height: "16px", margin: "0 auto 10px" }} />
                    Đang tải danh sách học sinh...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: "30px", textAlign: "center", color: "rgb(var(--secondary-rgb))" }}>
                    Chưa có học sinh nào đăng ký tham gia lớp học.
                  </td>
                </tr>
              ) : (
                students.map((std) => (
                  <tr key={std.id} style={{ borderBottom: "1px solid rgb(var(--card-border-rgb))" }}>
                    <td style={{ padding: "16px" }}>
                      <div style={{ fontWeight: 600 }}>{std.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "rgb(var(--secondary-rgb))" }}>{std.email}</div>
                    </td>
                    <td style={{ padding: "16px", color: "rgb(var(--secondary-rgb))" }}>{std.course}</td>
                    <td style={{ padding: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            flex: 1,
                            height: "6px",
                            borderRadius: "3px",
                            background: "rgba(var(--foreground-rgb), 0.05)",
                            maxWidth: "120px",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              borderRadius: "3px",
                              background: "rgb(var(--primary-rgb))",
                              width: `${std.progress}%`,
                            }}
                          />
                        </div>
                        <span style={{ fontWeight: 700 }}>{std.progress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "16px", color: "rgb(var(--secondary-rgb))" }}>{std.lastActive}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
