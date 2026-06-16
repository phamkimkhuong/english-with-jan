export interface Course {
  id: string;
  title: string;
  description: string;
  level: string;
  lessonsCount: number;
  duration: string;
  color: string;
}

export const staticCourses: Course[] = [
  {
    id: "office-communication",
    title: "Tiếng Anh Giao Tiếp Văn Phòng Thực Chiến",
    description: "Học các mẫu câu, hội thoại thông dụng trong môi trường văn phòng, viết email, thuyết trình và tham gia các cuộc họp chuyên nghiệp.",
    level: "Trung cấp (Intermediate)",
    lessonsCount: 12,
    duration: "6 tuần",
    color: "var(--primary-rgb)",
  },
  {
    id: "practical-grammar",
    title: "Ngữ Pháp Tiếng Anh Thực Hành Cho Người Đi Làm",
    description: "Hệ thống hóa toàn bộ các cấu trúc ngữ pháp quan trọng nhất trong công việc mà không gây nhàm chán. Tập trung vào thực hành thực tế.",
    level: "Căn bản & Trung cấp",
    lessonsCount: 15,
    duration: "8 tuần",
    color: "var(--accent-rgb)",
  },
  {
    id: "academic-vocabulary",
    title: "Từ Vựng & Phát Âm Căn Bản Cho Sinh Viên",
    description: "Xây dựng nền tảng từ vựng học thuật và giao tiếp thiết yếu cho sinh viên đại học chuẩn bị đi làm hoặc chuẩn bị cho các kỳ thi chuẩn đầu ra.",
    level: "Cơ bản (Beginner)",
    lessonsCount: 10,
    duration: "5 tuần",
    color: "var(--primary-rgb)",
  },
];
