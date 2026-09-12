/**
 * usePartnerBetaAccess — gate de acesso do Partner Pro.
 *
 * Backend oficial dedicado: acesso vem de `organization_members`, lido do
 * cache único (`partnerIdentityStore`) — sem repetir a consulta a cada
 * montagem ou a cada evento de auth.
 *
 * Backend legado (compartilhado): admin Roxou OU `partner_beta_access` ativo.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { partnerBackendIsDedicated } from "../backend/partnerSupabase";
import {
  getCachedPartnerIdentity,
  loadPartnerIdentity,
  subscribePartnerIdentity,
} from "../domain/partnerIdentityStore";

export interface PartnerBetaAccessResult {
  hasAccess: boolean;
  isAdmin: boolean;
  partnerIds: string[];
  loading: boolean;
  userId: string | null;
  /** Erro real de consulta — nunca convertido em "sem acesso" silencioso. */
  error: Error | null;
}

const INITIAL: PartnerBetaAccessResult = {
  hasAccess: false,
  isAdmin: false,
  partnerIds: [],
  loading: true,
  userId: null,
  error: null,
};

function fromCache(): PartnerBetaAccessResult | null {
  if (!partnerBackendIsDedicated) return null;
  const cached = getCachedPartnerIdentity();
  if (!cached) return null;
  return {
    hasAccess: cached.memberships.length > 0,
    isAdmin: false,
    partnerIds: [],
    loading: false,
    userId: cached.userId,
    error: cached.error,
  };
}

export function usePartnerBetaAccess(): PartnerBetaAccessResult {
  const [state, setState] = useState<PartnerBetaAccessResult>(
    () => fromCache() ?? INITIAL,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDedicated() {
      const identity = await loadPartnerIdentity();
      if (cancelled) return;
      setState({
        hasAccess: identity.memberships.length > 0,
        isAdmin: false,
        partnerIds: [],
        loading: false,
        userId: identity.userId,
        error: identity.error,
      });
    }

    async function loadLegacy() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user ?? null;
      if (!user) {
        if (!cancelled) setState({ ...INITIAL, loading: false });
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
        error: null,
      });
    }

    if (partnerBackendIsDedicated) {
      void loadDedicated();
      const unsubscribe = subscribePartnerIdentity(() => {
        void loadDedicated();
      });
      return () => {
        cancelled = true;
        unsubscribe();
      };
    }

    void loadLegacy();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED") return;
      void loadLegacy();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
