"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logout as authLogout, isAuthenticated } from "@/lib/auth";

export type UserRole = "admin" | "user" | null;

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedRole = localStorage.getItem("userRole") as UserRole | null;
    const token = localStorage.getItem("authToken");

    if (token && storedRole) {
      setRole(storedRole);
    } else {
      setRole(null);
    }

    setIsLoading(false);
  }, []);

  const login = (userRole: UserRole, token: string) => {
    localStorage.setItem("userRole", userRole ?? "");
    localStorage.setItem("authToken", token);
    setRole(userRole);
  };

  const logout = () => {
    authLogout();
    localStorage.removeItem("userRole");
    localStorage.removeItem("authToken");
    setRole(null);
    router.push("/auth/login");
    router.refresh();
  };

  return { role, isLoading, login, logout, isAuthenticated };
}

