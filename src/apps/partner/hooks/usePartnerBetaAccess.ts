/**
 * usePartnerBetaAccess — Fase 9K
 *
 * Verifica se o usuário atual pode acessar o Partner Pro (beta fechado).
 *
 * hasAccess = admin Roxou OU registro ativo em partner_beta_access.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PartnerBetaAccessResult {
  hasAccess: boolean;
  isAdmin: boolean;
  partnerIds: string[];
  loading: boolean;
  userId: string | null;
}

export function usePartnerBetaAccess(): PartnerBetaAccessResult {
  const [state, setState] = useState<PartnerBetaAccessResult>({
    hasAccess: false,
    isAdmin: false,
    partnerIds: [],
    loading: true,
    userId: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user ?? null;
      if (!user) {
        if (!cancelled)
          setState({
            hasAccess: false,
            isAdmin: false,
            partnerIds: [],
            loading: false,
            userId: null,
          });
        return;
      }

      const [rolesRes, betaRes] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin"),
        supabase
          .from("partner_beta_access")
          .select("partner_id")
          .eq("user_id", user.id)
          .eq("access_enabled", true),
      ]);

      if (cancelled) return;

      const isAdmin = (rolesRes.data ?? []).length > 0;
      const partnerIds = (betaRes.data ?? []).map(
        (r) => (r as { partner_id: string }).partner_id,
      );

      setState({
        hasAccess: isAdmin || partnerIds.length > 0,
        isAdmin,
        partnerIds,
        loading: false,
        userId: user.id,
      });
    }
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void load();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
