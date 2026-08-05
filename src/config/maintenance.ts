/**
 * ============================================================
 * MODO DE MANUTENÇÃO — FONTE ÚNICA DE VERDADE
 * ============================================================
 *
 * Para DESATIVAR a manutenção: mude `enabled` para `false` e publique.
 * Nenhum outro arquivo precisa ser alterado.
 */
export const MAINTENANCE_CONFIG = {
  /** Liga/desliga o modo de manutenção em toda a aplicação principal. */
  enabled: true,
  /** Fim previsto — sexta-feira, 07/08/2026 18:00 (America/Sao_Paulo). */
  endsAt: "2026-08-07T18:00:00-03:00",
  /** Caminhos públicos liberados (match exato ou como prefixo de sub-rota). */
  allowedPublicPaths: ["/manutencao", "/expo2026", "/health"] as const,
  /** Caminhos administrativos: exigem sessão + papel de admin real (RBAC). */
  adminPaths: ["/admin"] as const,
  /** Rota de login do admin — liberada para que a equipe consiga autenticar. */
  adminLoginPath: "/admin/central",
  /**
   * Subdomínios/produtos que NÃO fazem parte da aplicação principal
   * (parceiro, reserva, cortes, motorista, mídia) — nunca entram em manutenção.
   */
  bypassHostPrefixes: [
    "midia.",
    "parceiro.",
    "reserva.",
    "cortes.",
    "motorista.",
  ] as const,
};

/** Verdadeiro quando o host atual não é a aplicação principal roxou.com.br. */
export function isBypassedHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return MAINTENANCE_CONFIG.bypassHostPrefixes.some((p) => host.startsWith(p));
}

const matches = (pathname: string, base: string) =>
  pathname === base || pathname === `${base}/` || pathname.startsWith(`${base}/`);

/** Rota pública liberada durante a manutenção (Expo 2026, /manutencao, health). */
export function isAllowedPublicPath(pathname: string): boolean {
  return MAINTENANCE_CONFIG.allowedPublicPaths.some((p) => matches(pathname, p));
}

/** Rota administrativa (protegida por autenticação + RBAC reais). */
export function isAdminPath(pathname: string): boolean {
  return MAINTENANCE_CONFIG.adminPaths.some((p) => matches(pathname, p));
}

/** Rota de login do admin (liberada para autenticação da equipe). */
export function isAdminLoginPath(pathname: string): boolean {
  return matches(pathname, MAINTENANCE_CONFIG.adminLoginPath);
}
