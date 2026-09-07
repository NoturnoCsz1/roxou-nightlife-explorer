/**
 * usePartnerSession — Fase 2 (Fundação da convergência).
 *
 * Hook de leitura da identidade canônica futura do Partner Pro
 * (user → organization_member → organization → venue).
 *
 * NÃO substitui ainda o `PartnerContext` legado: os módulos existentes
 * (Reservas, VIP, CRM, Bio, Menu, Métricas) continuam funcionando como
 * hoje. Este hook é o caminho para os módulos convertidos nas próximas fases.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { partnerSupabase } from "../backend/partnerSupabase";
import {
  EMPTY_PARTNER_SESSION,
  type PartnerSession,
} from "../domain/partnerSession";
import { resolvePartnerSession } from "../domain/partnerSessionGateway";
import {
  canManageEvents,
  canManageReservations,
  canManageTeam,
  canValidateCheckIn,
  canViewAnalytics,
  isOrgManagerOrOwner,
} from "../domain/roles";

export const SELECTED_ORGANIZATION_STORAGE_KEY = "roxou.partner.selectedOrganizationId";
export const SELECTED_VENUE_STORAGE_KEY = "roxou.partner.selectedVenueId";

function readStored(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

export function usePartnerSession() {
  const [session, setSession] = useState<PartnerSession>(EMPTY_PARTNER_SESSION);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await resolvePartnerSession({
        preferredOrganizationId: readStored(SELECTED_ORGANIZATION_STORAGE_KEY),
        preferredVenueId: readStored(SELECTED_VENUE_STORAGE_KEY),
      });
      setSession(next);
      writeStored(SELECTED_ORGANIZATION_STORAGE_KEY, next.organizationId);
      writeStored(SELECTED_VENUE_STORAGE_KEY, next.venueId);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setSession(EMPTY_PARTNER_SESSION);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const { data: sub } = partnerSupabase.auth.onAuthStateChange(() => {
      if (mounted) void load();
    });
    void load();
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const selectOrganization = useCallback((organizationId: string | null) => {
    writeStored(SELECTED_ORGANIZATION_STORAGE_KEY, organizationId);
    void load();
  }, [load]);

  const selectVenue = useCallback((venueId: string | null) => {
    writeStored(SELECTED_VENUE_STORAGE_KEY, venueId);
    void load();
  }, [load]);

  return useMemo(
    () => ({
      session,
      isLoading,
      error,
      isEnabled: session.status === "active",
      isNotEnabled: session.status === "not_enabled",
      isSignedOut: session.status === "signed_out",
      roleCode: session.roleCode,
      organizationId: session.organizationId,
      venueId: session.venueId,
      isManagerOrOwner: isOrgManagerOrOwner(session.roleCode),
      canManageEvents: canManageEvents(session.roleCode),
      canManageReservations: canManageReservations(session.roleCode),
      canValidateCheckIn: canValidateCheckIn(session.roleCode),
      canViewAnalytics: canViewAnalytics(session.roleCode),
      canManageTeam: canManageTeam(session.roleCode),
      selectOrganization,
      selectVenue,
      refresh: load,
    }),
    [session, isLoading, error, selectOrganization, selectVenue, load],
  );
}
