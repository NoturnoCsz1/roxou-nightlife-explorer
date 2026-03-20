import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AdminProfile {
  role: string;
  allowed_city: string | null;
}

export function useAdminProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    async function load() {
      const { data } = await supabase
        .from("admin_profiles")
        .select("role, allowed_city")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (data) {
        setProfile({ role: data.role, allowed_city: data.allowed_city });
      } else {
        // No profile = full admin (backward compat for existing admins)
        setProfile({ role: "admin", allowed_city: null });
      }
      setLoading(false);
    }

    load();
  }, [user]);

  const isCityEditor = profile?.role === "city_editor";
  const cityFilter = isCityEditor ? profile?.allowed_city : null;

  return { profile, loading, isCityEditor, cityFilter };
}
