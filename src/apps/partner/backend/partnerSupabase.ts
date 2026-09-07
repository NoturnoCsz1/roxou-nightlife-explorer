/**
 * Partner Supabase Adapter — Fase 2 (Fundação da convergência).
 *
 * Camada central de acesso a backend do Partner Pro.
 *
 * Regras:
 * - Nenhum arquivo do Partner Pro deve importar
 *   `@/integrations/supabase/client` diretamente daqui para frente.
 *   Importar `partnerSupabase` deste módulo.
 * - Enquanto o Partner compartilhar o backend do core, este módulo
 *   REUTILIZA a mesma instância do client (evita duas instâncias de auth
 *   competindo pelo mesmo storage de sessão).
 * - Quando `VITE_PARTNER_SUPABASE_*` estiver definido, cria uma instância
 *   dedicada, isolando o cutover do Partner do restante da aplicação.
 *
 * NUNCA usar service_role aqui. Autorização final é sempre do banco (RLS/RPC).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabase as coreSupabase } from "@/integrations/supabase/client";
import { partnerBackendConfig } from "./partnerBackendConfig";

/**
 * Client tipado do Partner Pro.
 *
 * Tipagem: enquanto o backend é compartilhado, o tipo é o do client do core
 * (schema legado gerado). Após o cutover, o schema oficial passa a valer e a
 * tipagem será regenerada — por isso os módulos novos usam
 * `partnerBackendQuery()` para tabelas que ainda não existem na tipagem atual.
 */
export const partnerSupabase: typeof coreSupabase = partnerBackendConfig
  .isDedicated
  ? (createClient(
      partnerBackendConfig.url,
      partnerBackendConfig.publishableKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // storage próprio: não colide com a sessão do core (site/Admin/Garimpo).
          storageKey: "roxou.partner.auth",
        },
      },
    ) as unknown as typeof coreSupabase)
  : coreSupabase;

/**
 * Acesso destipado para tabelas do schema OFICIAL que ainda não existem na
 * tipagem gerada do backend atual (organizations, organization_members,
 * venues, roles). Some assim que a tipagem oficial for gerada.
 */
export function partnerBackendQuery(): SupabaseClient {
  return partnerSupabase as unknown as SupabaseClient;
}

/** `true` quando o Partner Pro já fala com backend próprio. */
export const partnerBackendIsDedicated = partnerBackendConfig.isDedicated;
