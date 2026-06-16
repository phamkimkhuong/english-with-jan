import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <p className="footer-copy">
          © {new Date().getFullYear()} English with Ms. Jan. Tất cả quyền được bảo lưu.
        </p>
        <p className="footer-copy" style={{ fontSize: "0.85rem", opacity: 0.8 }}>
          Được thiết kế chuyên nghiệp cho người đi làm và sinh viên.
        </p>
      </div>
    </footer>
  );
};
