import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bảng Phiên Âm Quốc Tế IPA (44 Âm Chuẩn) | English with Ms.Jan",
  description: "Học cách phát âm chuẩn 44 âm IPA trong tiếng Anh giao tiếp. Hướng dẫn khẩu hình miệng chi tiết, tệp âm thanh giọng mẫu và từ vựng ví dụ thực hành.",
  keywords: ["Bảng IPA", "44 âm IPA", "Phát âm tiếng Anh", "Học phát âm chuẩn", "English with Ms. Jan IPA"],
};

export default function PronunciationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
