import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type AppRole = "passenger" | "driver" | "admin";

export function useV3Profile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProfile(null);
      setRoles([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetch = async () => {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      if (cancelled) return;

      setProfile(profileRes.data ?? null);
      setRoles((rolesRes.data ?? []).map((r) => r.role));
      setLoading(false);
    };

    fetch();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  const hasRole = (role: AppRole) => roles.includes(role);
  const isDriver = hasRole("driver");
  const isAdmin = hasRole("admin");
  const hasAcceptedTerms = !!profile?.accepted_terms_at;

  return {
    user,
    profile,
    roles,
    loading: authLoading || loading,
    hasRole,
    isDriver,
    isAdmin,
    hasAcceptedTerms,
  };
}
