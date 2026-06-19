"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  AccessCode,
  createAccessCode,
  deleteAccessCode,
  getAccessCodes,
  updateAccessCodeStatus,
} from "@/services/accessCodeService";
import { getUserSummariesByIds } from "@/services/userService";
import { toast } from "@/hooks/useToastStore";

export type AccessCodeFilterStatus = "all" | "active" | "used";
export type AccessCodeTargetPathType = "default" | "pronunciation" | "sound" | "custom";

export interface AccessCodeFormState {
  customCode: string;
  codeType: "single" | "multi";
  selectedCourses: string[];
  description: string;
  maxUses: number;
  durationDays: "unlimited" | "7" | "30" | "90" | "custom";
  customDuration: string;
  targetPathType: AccessCodeTargetPathType;
  selectedSoundSlug: string;
  customTargetPath: string;
}

const QUERY_KEY = ["admin", "access-codes"] as const;
const USER_SUMMARIES_QUERY_KEY = ["admin", "access-code-user-summaries"] as const;

const INITIAL_FORM_STATE: AccessCodeFormState = {
  customCode: "",
  codeType: "single",
  selectedCourses: ["ipa"],
  description: "",
  maxUses: 30,
  durationDays: "unlimited",
  customDuration: "30",
  targetPathType: "default",
  selectedSoundSlug: "i-long",
  customTargetPath: "",
};

function getRandomAccessCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "JAN-";

  for (let index = 0; index < 8; index += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

function resolveDurationDays(form: AccessCodeFormState): number | null {
  if (form.durationDays === "unlimited") return null;

  const value = form.durationDays === "custom" ? Number(form.customDuration) : Number(form.durationDays);
  if (Number.isNaN(value) || value <= 0) {
    throw new Error("Thời hạn học tập phải là một số nguyên dương.");
  }

  return value;
}

function resolveTargetPath(form: AccessCodeFormState): string | null {
  if (form.targetPathType === "pronunciation") return "/pronunciation";
  if (form.targetPathType === "sound") return `/pronunciation/${form.selectedSoundSlug}`;

  if (form.targetPathType === "custom") {
    const path = form.customTargetPath.trim();
    if (!path) {
      throw new Error("Vui lòng nhập đường dẫn chuyển hướng tùy chỉnh.");
    }
    return path;
  }

  return null;
}

export function useAdminAccessCodes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<AccessCodeFilterStatus>("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState<AccessCodeFormState>(INITIAL_FORM_STATE);

  const { data: codes = [], isLoading: loading } = useQuery<AccessCode[]>({
    queryKey: QUERY_KEY,
    queryFn: getAccessCodes,
  });

  const missingSnapshotUserIds = useMemo(() => {
    const userIds = new Set<string>();

    codes.forEach((code) => {
      (code.usedBy || []).forEach((uid) => {
        if (!code.redemptionsByUid?.[uid]) {
          userIds.add(uid);
        }
      });
    });

    return Array.from(userIds).sort();
  }, [codes]);

  const { data: userSummaries = {}, isFetching: loadingUserSummaries } = useQuery({
    queryKey: [...USER_SUMMARIES_QUERY_KEY, missingSnapshotUserIds.join("|")],
    queryFn: () => getUserSummariesByIds(missingSnapshotUserIds),
    enabled: missingSnapshotUserIds.length > 0,
  });

  const refreshCodes = async () => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  };

  const createMutation = useMutation({
    mutationFn: createAccessCode,
    onSuccess: async () => {
      toast.success("Tạo mã kích hoạt thành công!");
      setForm(INITIAL_FORM_STATE);
      setShowCreateForm(false);
      await refreshCodes();
    },
    onError: (error: unknown) => {
      console.error("Lỗi tạo mã:", error);
      const message = error instanceof Error ? error.message : "Tạo mã kích hoạt thất bại.";
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAccessCode,
    onSuccess: async () => {
      toast.success("Xóa mã kích hoạt thành công!");
      await refreshCodes();
    },
    onError: (error) => {
      console.error("Lỗi xóa mã:", error);
      toast.error("Không thể xóa mã kích hoạt.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ codeId, status }: { codeId: string; status: "active" | "expired" | "used" }) =>
      updateAccessCodeStatus(codeId, status),
    onSuccess: async (_, variables) => {
      toast.success(variables.status === "active" ? "Kích hoạt lại mã thành công!" : "Tạm dừng mã thành công!");
      await refreshCodes();
    },
    onError: (error) => {
      console.error("Lỗi cập nhật trạng thái mã:", error);
      toast.error("Không thể cập nhật trạng thái mã.");
    },
  });

  const updateForm = <K extends keyof AccessCodeFormState>(field: K, value: AccessCodeFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleCreateForm = () => {
    setShowCreateForm((prev) => !prev);
  };

  const generateRandomCode = () => {
    updateForm("customCode", getRandomAccessCode());
  };

  const toggleCourse = (courseId: string) => {
    if (courseId === "all") {
      updateForm("selectedCourses", ["all"]);
      return;
    }

    setForm((prev) => {
      const filtered = prev.selectedCourses.filter((id) => id !== "all");
      const selectedCourses = filtered.includes(courseId)
        ? filtered.filter((id) => id !== courseId)
        : [...filtered, courseId];

      return {
        ...prev,
        selectedCourses: selectedCourses.length === 0 ? ["ipa"] : selectedCourses,
      };
    });
  };

  const handleCreateCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    if (!form.customCode.trim()) {
      toast.error("Vui lòng nhập hoặc sinh mã kích hoạt.");
      return;
    }

    if (form.selectedCourses.length === 0) {
      toast.error("Vui lòng chọn ít nhất một khóa học.");
      return;
    }

    let durationDays: number | null;
    let targetPath: string | null;

    try {
      durationDays = resolveDurationDays(form);
      targetPath = resolveTargetPath(form);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Thông tin mã kích hoạt chưa hợp lệ.";
      toast.error(message);
      return;
    }

    createMutation.mutate({
      code: form.customCode.toUpperCase(),
      type: form.codeType,
      allowedCourses: form.selectedCourses,
      description: form.description.trim(),
      maxUses: form.codeType === "multi" ? Number(form.maxUses) : 1,
      createdBy: user.uid,
      durationDays,
      targetPath,
    });
  };

  const copyCode = async (codeText: string) => {
    try {
      await navigator.clipboard.writeText(codeText);
      toast.success(`Đã sao chép mã: ${codeText}`);
    } catch {
      toast.error("Không thể sao chép mã vào clipboard.");
    }
  };

  const removeCode = async (codeText: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mã "${codeText}" không?`)) return;
    deleteMutation.mutate(codeText);
  };

  const toggleStatus = async (codeItem: AccessCode) => {
    const nextStatus = codeItem.status === "active" ? "expired" : "active";
    statusMutation.mutate({ codeId: codeItem.code, status: nextStatus });
  };

  const filteredCodes = useMemo(() => {
    if (filterStatus === "all") return codes;
    return codes.filter((code) => code.status === filterStatus);
  }, [codes, filterStatus]);

  const stats = useMemo(
    () => ({
      total: codes.length,
      active: codes.filter((code) => code.status === "active").length,
      totalRedeems: codes.reduce((acc, code) => acc + (code.currentUses || 0), 0),
    }),
    [codes]
  );

  return {
    codes,
    filteredCodes,
    filterStatus,
    form,
    loading,
    loadingUserSummaries,
    showCreateForm,
    stats,
    submitting: createMutation.isPending,
    userSummaries,
    setFilterStatus,
    updateForm,
    toggleCreateForm,
    generateRandomCode,
    toggleCourse,
    handleCreateCode,
    copyCode,
    removeCode,
    toggleStatus,
  };
}
