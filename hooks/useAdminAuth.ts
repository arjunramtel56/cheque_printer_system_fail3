import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAdminAuthenticated, adminLogout } from "@/lib/admin";

export function useAdminAuth() {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const ok = isAdminAuthenticated();
    setAuthed(ok);
    setChecked(true);
    if (!ok) router.replace("/admin/login");
  }, [router]);

  const logout = () => {
    adminLogout();
    setAuthed(false);
    router.replace("/admin/login");
  };

  return { authed, checked, logout };
}

export function useAuthGate() {
  const { authed, checked, logout } = useAdminAuth();
  const loading = !checked || !authed;

  return { authed, loading, logout };
}
