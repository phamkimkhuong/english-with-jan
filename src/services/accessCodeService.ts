import { type User } from "firebase/auth";
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";

export interface AccessCodeRedemptionSnapshot {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  redeemedAt: Timestamp | null;
}

export interface AccessCode {
  id?: string;
  code: string;
  type: "single" | "multi";
  allowedCourses: string[];
  description: string;
  createdBy: string;
  createdAt: Timestamp | null;
  status: "active" | "used" | "expired";
  maxUses?: number;
  currentUses: number;
  usedBy: string[];
  usedAt?: Timestamp | null;
  durationDays?: number | null;
  targetPath?: string | null;
  redemptionsByUid?: Record<string, AccessCodeRedemptionSnapshot>;
}

type RedemptionSnapshotWrite = Omit<AccessCodeRedemptionSnapshot, "redeemedAt"> & {
  redeemedAt: ReturnType<typeof serverTimestamp>;
};

function getStringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function createRedemptionSnapshot(uid: string, currentUser: User, userData: DocumentData): RedemptionSnapshotWrite {
  return {
    uid,
    displayName: getStringValue(userData.displayName, getStringValue(currentUser.displayName, "Học viên chưa đặt tên")),
    email: getStringValue(currentUser.email, getStringValue(userData.email, "")),
    photoURL: getStringValue(userData.photoURL, getStringValue(currentUser.photoURL, "")),
    redeemedAt: serverTimestamp(),
  };
}

/**
 * Tạo mới một mã kích hoạt.
 * Chỉ giáo viên hoặc quản trị viên được phép gọi hàm này.
 */
export async function createAccessCode(data: {
  code: string;
  type: "single" | "multi";
  allowedCourses: string[];
  description?: string;
  maxUses?: number;
  createdBy: string;
  durationDays?: number | null;
  targetPath?: string | null;
}): Promise<void> {
  const codeFormatted = data.code.trim().toUpperCase();
  if (!codeFormatted) {
    throw new Error("Mã kích hoạt không được để trống.");
  }
  if (data.allowedCourses.length === 0) {
    throw new Error("Phải chọn ít nhất một khóa học được mở khóa.");
  }

  const docRef = doc(db, "access_codes", codeFormatted);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    throw new Error("Mã kích hoạt này đã tồn tại.");
  }

  await setDoc(docRef, {
    code: codeFormatted,
    type: data.type,
    allowedCourses: data.allowedCourses,
    description: data.description || "",
    createdBy: data.createdBy,
    createdAt: serverTimestamp(),
    status: "active",
    maxUses: data.type === "multi" ? data.maxUses || 9999 : 1,
    currentUses: 0,
    usedBy: [],
    redemptionsByUid: {},
    durationDays: data.durationDays || null,
    targetPath: data.targetPath || null,
  });
}

/**
 * Lấy danh sách toàn bộ các mã kích hoạt.
 * Chỉ dành cho giáo viên/admin để giám sát.
 */
export async function getAccessCodes(): Promise<AccessCode[]> {
  const colRef = collection(db, "access_codes");
  const q = query(colRef, orderBy("createdAt", "desc"));
  const querySnap = await getDocs(q);

  const codes: AccessCode[] = [];
  querySnap.forEach((docSnap) => {
    codes.push({ id: docSnap.id, ...docSnap.data() } as AccessCode);
  });
  return codes;
}

/**
 * Thực hiện kích hoạt mã cho học sinh.
 * Sử dụng Transaction của Firestore để đảm bảo an toàn dữ liệu khi nhiều học sinh nhập mã cùng lúc.
 */
export async function redeemAccessCode(
  uid: string,
  codeText: string
): Promise<{ allowedCourses: string[]; targetPath: string | null }> {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== uid) {
    throw new Error("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại trước khi kích hoạt mã.");
  }

  const codeFormatted = codeText.trim().toUpperCase();
  if (!codeFormatted) {
    throw new Error("Vui lòng nhập mã kích hoạt.");
  }

  const codeRef = doc(db, "access_codes", codeFormatted);
  const userRef = doc(db, "users", uid);

  let targetPath: string | null = null;
  let allowedCourses: string[] = [];

  await runTransaction(db, async (transaction) => {
    // 1. Lấy thông tin mã và hồ sơ học viên trước khi ghi bất kỳ dữ liệu nào.
    const codeSnap = await transaction.get(codeRef);
    if (!codeSnap.exists()) {
      throw new Error("Mã kích hoạt không đúng hoặc không tồn tại.");
    }

    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      throw new Error("Không tìm thấy hồ sơ học viên. Vui lòng đăng xuất và đăng nhập lại.");
    }

    const codeData = codeSnap.data() as AccessCode;
    const redemptionSnapshot = createRedemptionSnapshot(uid, currentUser, userSnap.data());
    targetPath = codeData.targetPath || null;
    allowedCourses = codeData.allowedCourses || [];

    // 2. Kiểm tra trạng thái mã
    if (codeData.status !== "active") {
      throw new Error("Mã này đã được sử dụng hoặc đã hết hiệu lực.");
    }

    // 3. Kiểm tra xem học sinh này đã dùng mã này chưa
    if (codeData.usedBy && codeData.usedBy.includes(uid)) {
      throw new Error("Bạn đã kích hoạt mã này trước đó rồi.");
    }

    const redemptionPath = `redemptionsByUid.${uid}`;

    // 4. Cập nhật mã tùy thuộc vào loại mã (Single / Multi)
    if (codeData.type === "single") {
      transaction.update(codeRef, {
        status: "used",
        usedBy: [uid],
        currentUses: 1,
        usedAt: serverTimestamp(),
        [redemptionPath]: redemptionSnapshot,
      });
    } else {
      const nextUses = (codeData.currentUses || 0) + 1;
      const max = codeData.maxUses || 9999;

      if (nextUses > max) {
        throw new Error("Mã kích hoạt này đã đạt tới giới hạn số lần sử dụng.");
      }

      const updates: Record<string, unknown> = {
        usedBy: arrayUnion(uid),
        currentUses: increment(1),
        [redemptionPath]: redemptionSnapshot,
      };

      // Nếu đạt giới hạn sử dụng thì đổi trạng thái sang đã dùng hết
      if (nextUses === max) {
        updates.status = "used";
      }

      transaction.update(codeRef, updates);
    }

    // 5. Cập nhật quyền học tập của học viên và tính toán hạn học
    const userUpdates: Record<string, unknown> = {
      unlockedCourses: arrayUnion(...codeData.allowedCourses),
      activatedCodes: arrayUnion(codeFormatted),
    };

    // Tính toán ngày hết hạn học cho từng khóa
    const now = new Date();
    codeData.allowedCourses.forEach((cId) => {
      if (codeData.durationDays && codeData.durationDays > 0) {
        const newExpiryDate = new Date(now.getTime() + codeData.durationDays * 24 * 60 * 60 * 1000);
        userUpdates[`unlockedCoursesExpiry.${cId}`] = newExpiryDate;
      } else {
        // Vĩnh viễn
        userUpdates[`unlockedCoursesExpiry.${cId}`] = null;
      }
    });

    transaction.update(userRef, userUpdates);
  });

  return { allowedCourses, targetPath };
}

/**
 * Xóa một mã kích hoạt.
 */
export async function deleteAccessCode(codeId: string): Promise<void> {
  const docRef = doc(db, "access_codes", codeId);
  await deleteDoc(docRef);
}

/**
 * Cập nhật trạng thái của mã kích hoạt (ví dụ: chuyển từ active sang expired để tạm dừng, hoặc ngược lại).
 */
export async function updateAccessCodeStatus(codeId: string, status: "active" | "expired" | "used"): Promise<void> {
  const docRef = doc(db, "access_codes", codeId);
  await updateDoc(docRef, { status });
}