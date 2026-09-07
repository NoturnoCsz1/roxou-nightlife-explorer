/**
 * Partner Backend Config — Fase 2 (Fundação da convergência).
 *
 * Ponto ÚNICO onde o Partner Pro decide contra qual backend fala.
 *
 * Hoje: usa a mesma configuração do core (nenhuma mudança de ENV).
 * Futuro: basta definir VITE_PARTNER_SUPABASE_URL +
 * VITE_PARTNER_SUPABASE_PUBLISHABLE_KEY para o Partner Pro apontar para o
 * Supabase oficial da Roxou sem tocar em site público, Admin ou Garimpo.
 *
 * NÃO colocar service_role, chave administrativa ou qualquer secret aqui.
 * Apenas URL + publishable/anon key (valores públicos, protegidos por RLS).
 */

export interface PartnerBackendConfig {
  url: string;
  publishableKey: string;
  /** true quando o Partner Pro está apontando para um backend próprio. */
  isDedicated: boolean;
}

function readEnv(key: string): string | undefined {
  const env = import.meta.env as unknown as Record<string, string | undefined>;
  const value = env?.[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

export function resolvePartnerBackendConfig(): PartnerBackendConfig {
  const dedicatedUrl = readEnv("VITE_PARTNER_SUPABASE_URL");
  const dedicatedKey = readEnv("VITE_PARTNER_SUPABASE_PUBLISHABLE_KEY");

  if (dedicatedUrl && dedicatedKey) {
    return { url: dedicatedUrl, publishableKey: dedicatedKey, isDedicated: true };
  }

  return {
    url: readEnv("VITE_SUPABASE_URL") ?? "",
    publishableKey: readEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ?? "",
    isDedicated: false,
  };
}

export const partnerBackendConfig = resolvePartnerBackendConfig();

/** `true` enquanto o Partner Pro ainda compartilha o backend do core. */
export const isPartnerBackendShared = !partnerBackendConfig.isDedicated;
