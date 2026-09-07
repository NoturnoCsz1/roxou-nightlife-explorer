/**
 * PartnerConvergedGate — Fase 3.
 *
 * Gate dos módulos CONVERTIDOS (Reservas, VIP, Validador, Promotores).
 *
 * Comportamento:
 * - Backend oficial ATIVO (`VITE_PARTNER_SUPABASE_*`): exige PartnerSession
 *   ativa (organization_members). Sem vínculo → PartnerNotEnabledState.
 *   O vínculo legado NUNCA habilita módulo convertido.
 * - Backend oficial AINDA NÃO conectado: LEGACY COMPATIBILITY — as telas
 *   continuam sendo servidas pelo caminho legado, sem quebrar a operação
 *   atual do parceiro. Nenhuma escrita dupla acontece.
 */
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { convergenceBackendReady } from "@modules/partner/converged/client";
import PartnerNotEnabledState from "./PartnerNotEnabledState";
import { usePartnerSessionContext } from "../contexts/PartnerSessionContext";

export interface PartnerConvergedGateProps {
  children: ReactNode;
}

export function PartnerConvergedGate({ children }: PartnerConvergedGateProps) {
  const { isLoading, isEnabled, refresh } = usePartnerSessionContext();

  // LEGACY COMPATIBILITY — enquanto o Supabase oficial não estiver conectado.
  if (!convergenceBackendReady) return <>{children}</>;

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (!isEnabled) {
    return (
      <div className="px-4 py-10">
        <PartnerNotEnabledState onRefresh={refresh} />
      </div>
    );
  }

  return <>{children}</>;
}

export default PartnerConvergedGate;
