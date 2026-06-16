import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ToastContainer } from "@/components/common/ToastContainer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "English with Ms.Jan - Học Tiếng Anh Cho Người Đi Làm & Sinh Viên",
  description: "Trang web học tiếng anh trực tuyến chuyên nghiệp dành cho sinh viên và người đi làm. Các khóa học giao tiếp, ngữ pháp, từ vựng được thiết kế tinh gọn, thực chiến bởi giáo viên Ms.Jan.",
  keywords: ["Học tiếng Anh", "English with Ms.Jan", "Phát âm tiếng Anh", "Học tiếng Anh giao tiếp", "Tiếng Anh người đi làm", "Học IPA"],
  authors: [{ name: "Teacher Ms.Jan" }],
  openGraph: {
    title: "English with Ms.Jan - Học Tiếng Anh Cho Người Đi Làm & Sinh Viên",
    description: "Trang web học tiếng anh trực tuyến chuyên nghiệp dành cho sinh viên và người đi làm. Các khóa học giao tiếp, ngữ pháp, từ vựng được thiết kế tinh gọn, thực chiến bởi giáo viên Ms.Jan.",
    url: "https://english-with-jan.web.app",
    siteName: "English with Ms.Jan",
    locale: "vi_VN",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        <Providers>
          <Navbar />
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}
