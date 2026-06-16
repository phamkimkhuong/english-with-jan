"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";

export type UserRole = "admin" | "teacher" | "student";

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  unlockedCourses: string[];
  unlockedCoursesExpiry: Record<string, Timestamp | null>;
  activatedCodes: string[];
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [unlockedCourses, setUnlockedCourses] = useState<string[]>([]);
  const [unlockedCoursesExpiry, setUnlockedCoursesExpiry] = useState<Record<string, Timestamp | null>>({});
  const [activatedCodes, setActivatedCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    // Đăng ký lắng nghe sự thay đổi trạng thái đăng nhập từ Firebase Auth
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Hủy lắng nghe tài liệu user cũ nếu có
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        // Thiết lập lắng nghe thời gian thực tài liệu user trong Firestore
        unsubscribeDoc = onSnapshot(userDocRef, async (docSnap) => {
          setLoading(true);
          try {
            let userRole: UserRole = "student";
            let courses: string[] = [];
            let coursesExpiry: Record<string, Timestamp | null> = {};
            let codes: string[] = [];
            let preGrantedName = "";

            if (firebaseUser.email === SUPER_ADMIN_EMAIL) {
              userRole = "admin";
            }

            if (docSnap.exists()) {
              const data = docSnap.data();
              userRole = (data.role as UserRole) || userRole;
              courses = data.unlockedCourses || [];
              coursesExpiry = data.unlockedCoursesExpiry || {};
              codes = data.activatedCodes || [];
            } else {
              // Nếu UID chưa có trong DB, quét xem có email được cấp quyền trước không
              if (firebaseUser.email) {
                const emailDocRef = doc(db, "users", firebaseUser.email.trim().toLowerCase());
                const emailDoc = await getDoc(emailDocRef);
                if (emailDoc.exists()) {
                  userRole = emailDoc.data().role as UserRole;
                  preGrantedName = emailDoc.data().displayName || "";
                }
              }

              // Khởi tạo tài liệu mới trong DB
              await setDoc(userDocRef, {
                email: firebaseUser.email,
                displayName: preGrantedName || firebaseUser.displayName || "Người dùng",
                photoURL: firebaseUser.photoURL || "",
                role: userRole,
                createdAt: serverTimestamp(),
                unlockedCourses: [],
                activatedCodes: [],
              });
            }

            // Đồng bộ quyền admin cho tài khoản Super Admin nếu DB chưa khớp
            if (firebaseUser.email === SUPER_ADMIN_EMAIL && (!docSnap.exists() || docSnap.data()?.role !== "admin")) {
              await setDoc(userDocRef, { role: "admin" }, { merge: true });
            }

            setRole(userRole);
            setUnlockedCourses(courses);
            setUnlockedCoursesExpiry(coursesExpiry);
            setActivatedCodes(codes);
          } catch (error) {
            console.error("Lỗi đồng bộ dữ liệu thời gian thực từ Firestore:", error);
            setRole(firebaseUser.email === SUPER_ADMIN_EMAIL ? "admin" : "student");
            setUnlockedCourses([]);
            setUnlockedCoursesExpiry({});
            setActivatedCodes([]);
          } finally {
            setLoading(false);
          }
        }, (error) => {
          console.error("Lỗi listener Firestore user document:", error);
          setLoading(false);
        });

      } else {
        setUser(null);
        setRole(null);
        setUnlockedCourses([]);
        setUnlockedCoursesExpiry({});
        setActivatedCodes([]);
        setLoading(false);
      }
    });

    // Hủy tất cả listener khi component unmount
    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
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
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        unlockedCourses,
        unlockedCoursesExpiry,
        activatedCodes,
        loginWithGoogle,
        logout,
      }}
    >
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
