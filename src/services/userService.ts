import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export interface UserSummary {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
}

export async function getUserSummariesByIds(userIds: string[]): Promise<Record<string, UserSummary>> {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueUserIds.length === 0) return {};

  const entries = await Promise.all(
    uniqueUserIds.map(async (uid) => {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (!userDoc.exists()) return null;

      const data = userDoc.data();
      return [
        uid,
        {
          uid,
          displayName: data.displayName || "Học viên chưa đặt tên",
          email: data.email || "Chưa có email",
          photoURL: data.photoURL || "",
        },
      ] as const;
    })
  );

  return Object.fromEntries(entries.filter((entry): entry is NonNullable<typeof entry> => entry !== null));
}
