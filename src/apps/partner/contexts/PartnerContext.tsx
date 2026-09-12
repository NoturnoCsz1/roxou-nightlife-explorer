/**
 * PartnerProvider — Fase 9C
 *
 * Provider interno do Roxou Partner Pro. Mantém:
 * - usuário autenticado
 * - lista de partners administráveis
 * - partner selecionado (persistido em localStorage)
 * - role no partner selecionado
 * - assinatura do partner selecionado
 * - permissões derivadas
 *
 * Não registra rotas no App.tsx. Não altera Roxou pública nem Admin.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import {
  partnerBackendIsDedicated,
  partnerSupabase,
} from "../backend/partnerSupabase";
import { fetchOfficialMemberships } from "../domain/partnerSessionGateway";
import type { PartnerRole } from "../types";
import {
  getCurrentPartnerSubscription,
  listMyPartners,
  type PartnerAccess,
  type PartnerSubscription,
} from "../services/partnerAuth";
import {
  SELECTED_PARTNER_STORAGE_KEY,
  canEditProfile as canEditProfileFn,
  canManageEvents as canManageEventsFn,
  canManageReservations as canManageReservationsFn,
  canViewAnalytics as canViewAnalyticsFn,
} from "../hooks/usePartnerAuth";
import { PartnerContext, type PartnerContextValue } from "./partnerContextValue";

export { PartnerContext } from "./partnerContextValue";
export type { PartnerContextValue } from "./partnerContextValue";

function readStoredPartnerId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SELECTED_PARTNER_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredPartnerId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(SELECTED_PARTNER_STORAGE_KEY, id);
    else window.localStorage.removeItem(SELECTED_PARTNER_STORAGE_KEY);
  } catch {
    /* noop */
  }
}

export interface PartnerProviderProps {
  children: ReactNode;
}

export function PartnerProvider({ children }: PartnerProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [partners, setPartners] = useState<PartnerAccess[]>([]);
  const [selectedPartnerId, setSelectedPartnerIdState] = useState<string | null>(
    readStoredPartnerId,
  );
  const [subscription, setSubscription] = useState<PartnerSubscription | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const setSelectedPartnerId = useCallback((id: string | null) => {
    setSelectedPartnerIdState(id);
    writeStoredPartnerId(id);
  }, []);

  const loadAccess = useCallback(async (options?: { force?: boolean }) => {
    // Loader global só no primeiro bootstrap; refresh acontece em background.
    if (!getCachedPartnerIdentity() || options?.force) setIsLoading(true);
    setError(null);
    try {
      const identity = await loadPartnerIdentity({ force: options?.force });
      const { data: sessionData } = await partnerSupabase.auth.getSession();
      const currentUser = sessionData?.session?.user ?? null;
      setUser(currentUser);
      if (identity.error) setError(identity.error);

      if (!identity.userId) {
        setPartners([]);
        setSubscription(null);
        setSelectedPartnerIdState(null);
        writeStoredPartnerId(null);
        return;
      }

      // Backend oficial dedicado: a identidade vem de organization_members.
      if (partnerBackendIsDedicated) {
        const memberships = identity.memberships;
        const list: PartnerAccess[] = memberships.map((m) => {
          const venue = m.venues?.[0] ?? null;
          const role: PartnerRole =
            m.role_code === "owner"
              ? "owner"
              : m.role_code === "manager"
                ? "admin"
                : "attendant";
          return {
            linkId: `${m.organization_id}:${m.user_id}`,
            role,
            isActive: true,
            partner: {
              id: m.organization_id,
              name: venue?.name ?? m.organization?.name ?? "Meu estabelecimento",
              slug: venue?.slug ?? null,
              logo_url: null,
              city: venue?.city ?? null,
              type: null,
            },
          };
        });
        setPartners(list);
        setSubscription(null);
        const storedOfficial = readStoredPartnerId();
        const nextOfficial =
          storedOfficial && list.some((p) => p.partner.id === storedOfficial)
            ? storedOfficial
            : (list[0]?.partner.id ?? null);
        setSelectedPartnerIdState(nextOfficial);
        writeStoredPartnerId(nextOfficial);
        return;
      }

      const list = await listMyPartners();
      setPartners(list);

      const stored = readStoredPartnerId();
      const stillValid =
        stored && list.some((p) => p.partner.id === stored) ? stored : null;
      const nextSelected = stillValid ?? list[0]?.partner.id ?? null;
      setSelectedPartnerIdState(nextSelected);
      writeStoredPartnerId(nextSelected);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const { data: sub } = partnerSupabase.auth.onAuthStateChange(() => {
      if (mounted) void loadAccess();
    });
    void loadAccess();
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadAccess]);

  useEffect(() => {
    let cancelled = false;
    // No backend oficial não existe `partner_subscriptions` (tabela legada).
    if (partnerBackendIsDedicated || !selectedPartnerId) {
      setSubscription(null);
      return;
    }
    (async () => {
      try {
        const s = await getCurrentPartnerSubscription(selectedPartnerId);
        if (!cancelled) setSubscription(s);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPartnerId]);

  const value = useMemo<PartnerContextValue>(() => {
    const access =
      partners.find((p) => p.partner.id === selectedPartnerId) ?? null;
    const role = access?.role ?? null;
    return {
      user,
      partners,
      selectedPartner: access?.partner ?? null,
      selectedPartnerId,
      role,
      subscription,
      isLoading,
      error,
      canEditProfile: canEditProfileFn(role),
      canManageEvents: canManageEventsFn(role),
      canManageReservations: canManageReservationsFn(role),
      canViewAnalytics: canViewAnalyticsFn(role),
      setSelectedPartnerId,
      refresh: loadAccess,
    };
  }, [
    user,
    partners,
    selectedPartnerId,
    subscription,
    isLoading,
    error,
    setSelectedPartnerId,
    loadAccess,
  ]);

  return (
    <PartnerContext.Provider value={value}>{children}</PartnerContext.Provider>
  );
}
