"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";

export type UserRole = "admin" | "teacher" | "student";

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Đăng ký lắng nghe sự thay đổi trạng thái đăng nhập từ Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        
        try {
          // Lấy thông tin role từ Firestore
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          let userRole: UserRole = "student";
          let preGrantedName = "";
          
          // Kiểm tra nếu là email Super Admin cấu hình cứng
          if (firebaseUser.email === SUPER_ADMIN_EMAIL) {
            userRole = "admin";
          } else if (userDoc.exists()) {
            userRole = userDoc.data().role as UserRole;
          } else if (firebaseUser.email) {
            // Nếu UID chưa có trong DB, quét xem có document cấp quyền trước bằng ID Email không
            const emailDocRef = doc(db, "users", firebaseUser.email.trim().toLowerCase());
            const emailDoc = await getDoc(emailDocRef);
            if (emailDoc.exists()) {
              userRole = emailDoc.data().role as UserRole;
              preGrantedName = emailDoc.data().displayName || "";
            }
          }

          // Nếu user chưa tồn tại trong Firestore (lần đầu đăng nhập), tạo mới profile
          if (!userDoc.exists()) {
            await setDoc(userDocRef, {
              email: firebaseUser.email,
              displayName: preGrantedName || firebaseUser.displayName || "Người dùng",
              photoURL: firebaseUser.photoURL || "",
              role: userRole,
              createdAt: serverTimestamp(),
            });
          } else if (firebaseUser.email === SUPER_ADMIN_EMAIL && userDoc.data().role !== "admin") {
            // Cập nhật lại db nếu super admin chưa có quyền admin trên DB
            await setDoc(userDocRef, { role: "admin" }, { merge: true });
          }

          setRole(userRole);
        } catch (error) {
          console.error("Lỗi đồng bộ hồ sơ người dùng với Firestore:", error);
          // Fallback mặc định cho email Super Admin
          if (firebaseUser.email === SUPER_ADMIN_EMAIL) {
            setRole("admin");
          } else {
            setRole("student");
          }
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    // Hủy đăng ký khi component unmount
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Lỗi đăng nhập Google:", error);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth phải được sử dụng bên trong AuthProvider");
  }
  return context;
};
