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
import { supabase } from "@/integrations/supabase/client";
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

  const loadAccess = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setPartners([]);
        setSubscription(null);
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
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
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
    if (!selectedPartnerId) {
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
