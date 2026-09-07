/**
 * Cliente único dos módulos CONVERTIDOS do Partner Pro — Fase 3.
 *
 * Regra da fase: Reservas, VIP, Validador e Promotores NÃO importam
 * `@/integrations/supabase/client`. Todo acesso passa por aqui, que por sua
 * vez delega para `partnerSupabase` (fundação da Fase 2).
 *
 * Quando `VITE_PARTNER_SUPABASE_*` apontar para o Supabase oficial da Roxou,
 * estes módulos passam a falar com o backend oficial sem tocar em site
 * público, Admin ou Garimpo.
 *
 * NUNCA usar service_role aqui. Autorização final é sempre RLS/RPC.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  partnerBackendIsDedicated,
  partnerSupabase,
} from "@/apps/partner/backend/partnerSupabase";

/**
 * Client destipado para as tabelas do schema OFICIAL
 * (organizations, venues, reservations, vip_lists, promoter_profiles...),
 * que ainda não existem na tipagem gerada do backend legado.
 */
export function officialClient(): SupabaseClient {
  return partnerSupabase as unknown as SupabaseClient;
}

/**
 * `true` quando o Partner Pro já fala com o Supabase oficial dedicado.
 *
 * Enquanto for `false`, os módulos convertidos continuam disponíveis, mas as
 * telas seguem servidas pelo caminho LEGACY COMPATIBILITY (somente leitura do
 * legado, nunca dual-write).
 */
export const convergenceBackendReady = partnerBackendIsDedicated;
