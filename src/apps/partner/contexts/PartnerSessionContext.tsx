/**
 * PartnerSessionContext — Fase 3.
 *
 * Integra a fundação `usePartnerSession` (Fase 2) ao entry point do
 * Partner Pro, disponibilizando userId, organizationId, venueId e roleCode
 * para os módulos convertidos.
 *
 * NÃO substitui o `PartnerContext` legado: módulos ainda não convertidos
 * (CRM, Bio, Menu, Métricas, Subscriptions) continuam lendo o legado.
 * Nunca há dual-write.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePartnerSession } from "../hooks/usePartnerSession";
import type { PartnerScope } from "@modules/partner/converged/tenancy";

export type PartnerSessionContextValue = ReturnType<typeof usePartnerSession> & {
  /** Escopo de tenancy pronto para os serviços convertidos. */
  scope: PartnerScope | null;
};

const PartnerSessionContext = createContext<PartnerSessionContextValue | null>(null);

export function PartnerSessionProvider({ children }: { children: ReactNode }) {
  const session = usePartnerSession();

  const value = useMemo<PartnerSessionContextValue>(() => {
    const scope: PartnerScope | null = session.organizationId
      ? {
          organizationId: session.organizationId,
          venueId: session.venueId,
          roleCode: session.roleCode,
        }
      : null;
    return { ...session, scope };
  }, [session]);

  return (
    <PartnerSessionContext.Provider value={value}>
      {children}
    </PartnerSessionContext.Provider>
  );
}

export function usePartnerSessionContext(): PartnerSessionContextValue {
  const ctx = useContext(PartnerSessionContext);
  if (!ctx) {
    throw new Error(
      "usePartnerSessionContext deve ser usado dentro de <PartnerSessionProvider>.",
    );
  }
  return ctx;
}

/**
 * Escopo de tenancy dos módulos convertidos.
 * Retorna `null` quando a sessão oficial ainda não está habilitada.
 */
export function usePartnerScope(): PartnerScope | null {
  return usePartnerSessionContext().scope;
}
