"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { redeemAccessCode } from "@/services/accessCodeService";
import { toast } from "@/hooks/useToastStore";
import styles from "./RedeemCodeHomeInput.module.css";

export const RedeemCodeHomeInput: React.FC = () => {
  const { user, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  // Tự động kích hoạt mã nếu có mã đang chờ sau khi đăng nhập thành công
  useEffect(() => {
    const pendingCode = localStorage.getItem("pending_redeem_code");
    if (user && pendingCode) {
      localStorage.removeItem("pending_redeem_code");

      const autoRedeem = async () => {
        setLoading(true);
        try {
          toast.info("Đang tự động kích hoạt mã của bạn...");
          const result = await redeemAccessCode(user.uid, pendingCode);
          toast.success("Kích hoạt thành công! Đang chuyển hướng bạn đến bài học...");

          if (result.targetPath) {
            router.push(result.targetPath);
          } else {
            router.push("/courses");
          }
        } catch (error: unknown) {
          console.error("Lỗi tự động kích hoạt mã:", error);
          const err = error as Error;
          toast.error(err.message || "Tự động kích hoạt mã thất bại. Vui lòng thử lại.");
        } finally {
          setLoading(false);
        }
      };

      autoRedeem();
    }
  }, [user, router]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const codeTrimmed = code.trim();
    if (!codeTrimmed) {
      toast.error("Vui lòng nhập mã kích hoạt.");
      return;
    }

    setLoading(true);
    try {
      const result = await redeemAccessCode(user.uid, codeTrimmed);
      toast.success("Kích hoạt mã thành công! Chúc bạn học tập vui vẻ.");
      setCode("");

      if (result.targetPath) {
        router.push(result.targetPath);
      } else {
        router.push("/courses");
      }
    } catch (error: unknown) {
      console.error("Lỗi kích hoạt mã:", error);
      const err = error as Error;
      toast.error(err.message || "Kích hoạt mã thất bại. Vui lòng kiểm tra lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginAndRedeem = async () => {
    const codeTrimmed = code.trim();
    if (!codeTrimmed) {
      toast.error("Vui lòng nhập mã kích hoạt trước khi đăng nhập.");
      return;
    }

    try {
      localStorage.setItem("pending_redeem_code", codeTrimmed);
      await loginWithGoogle();
    } catch (error: unknown) {
      console.error("Lỗi đăng nhập Google:", error);
      toast.error("Đăng nhập thất bại. Vui lòng thử lại.");
      localStorage.removeItem("pending_redeem_code");
    }
  };

  return (
    <div className={styles.container}>
      {user ? (
        <form onSubmit={handleRedeem} className={styles.form}>
          <input
            type="text"
            placeholder="Nhập mã kích hoạt (Ví dụ: JAN-ABCD123)..."
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={loading}
            className={styles.input}
          />
          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? <div className={styles.spinner} /> : "Vào học 🚀"}
          </button>
        </form>
      ) : (
        <div className={styles.form}>
          <input
            type="text"
            placeholder="Nhập mã kích hoạt của bạn..."
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className={styles.input}
          />
          <button onClick={handleLoginAndRedeem} className={styles.button}>
            🔑 Đăng nhập & Kích hoạt
          </button>
        </div>
      )}
    </div>
  );
};
