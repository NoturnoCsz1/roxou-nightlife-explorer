import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AdminProfile {
  role: string;
  allowed_city: string | null;
}

export function useAdminProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProfile(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      // Source of truth: user_roles table (matches RLS has_role check)
      const [rolesRes, profileRes] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user!.id)
          .eq("role", "admin"),
        supabase
          .from("admin_profiles")
          .select("role, allowed_city")
          .eq("user_id", user!.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      const realAdmin = (rolesRes.data ?? []).length > 0;
      const cityEditorProfile = profileRes.data?.role === "city_editor";

      // Source of truth: real admin role OR explicit city_editor admin_profiles row
      setIsAdmin(realAdmin || cityEditorProfile);

      if (profileRes.data) {
        setProfile({
          role: profileRes.data.role,
          allowed_city: profileRes.data.allowed_city,
        });
      } else if (realAdmin) {
        // Real admin without admin_profiles row — full access, no city restriction
        setProfile({ role: "admin", allowed_city: null });
      } else {
        // No real admin role and no profile = NOT admin. Do not fake it.
        setProfile(null);
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const isCityEditor = profile?.role === "city_editor";
  const cityFilter = isCityEditor ? profile?.allowed_city ?? null : null;

  return { profile, loading, isAdmin, isCityEditor, cityFilter };
}
