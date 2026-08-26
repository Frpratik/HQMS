"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, UserRole, StaffUser } from "@/lib/api";

interface AuthGuardResult {
  user: StaffUser | null;
  loading: boolean;
  isAuthorized: boolean;
}

export function useRequireAuth(allowedRoles?: UserRole[]): AuthGuardResult {
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("hqms_staff_token") : null;
    const cachedUser = api.auth.getUser();

    if (!token || !cachedUser) {
      router.replace("/login");
      return;
    }

    // Role check
    if (allowedRoles && allowedRoles.length > 0) {
      const hasRole =
        cachedUser.role === "SUPER_ADMIN" || allowedRoles.includes(cachedUser.role as UserRole);

      if (!hasRole) {
        // Redirect unauthorized staff to their correct station
        if (cachedUser.role === "DOCTOR" || cachedUser.role === "DOCTOR_ASSISTANT") {
          router.replace("/doctor");
        } else if (cachedUser.role === "RECEPTIONIST") {
          router.replace("/reception");
        } else if (cachedUser.role === "HOSPITAL_ADMIN") {
          router.replace("/admin/departments");
        } else {
          router.replace("/login");
        }
        return;
      }
    }

    setUser(cachedUser);
    setIsAuthorized(true);
    setLoading(false);
  }, [router, allowedRoles]);

  return { user, loading, isAuthorized };
}
