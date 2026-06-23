/**
 * authHelpers — Utilidades compartilhadas para login/logout consistentes.
 *
 * - `safeReturnTo`: aceita apenas paths internos ("/..."), bloqueando open
 *   redirects para URLs externas ou protocol-relative ("//evil.com").
 * - `mapAuthError`: traduz mensagens do Supabase Auth em texto amigável.
 * - `signInWithGoogle`: envolve `lovable.auth.signInWithOAuth("google")`,
 *   garantindo o fluxo OAuth gerenciado da Lovable Cloud (funciona em
 *   roxou.com.br e parceiro.roxou.com.br).
 *
 * Em DEV, loga eventos básicos (sem token, sem senha, sem PIN).
 */
import { lovable } from "@/integrations/lovable/index";

const isDev = import.meta.env.DEV;

/** Retorna `path` apenas se for um caminho interno seguro; senão `fallback`. */
export function safeReturnTo(path: string | null | undefined, fallback = "/"): string {
  if (!path) return fallback;
  if (typeof path !== "string") return fallback;
  if (!path.startsWith("/")) return fallback;
  if (path.startsWith("//")) return fallback; // protocol-relative
  if (path.startsWith("/\\")) return fallback;
  return path;
}

/** Lê `?next=` ou `?returnTo=` da URL atual, validando contra open redirect. */
export function readReturnToFromUrl(fallback = "/"): string {
  if (typeof window === "undefined") return fallback;
  try {
    const sp = new URLSearchParams(window.location.search);
    return safeReturnTo(sp.get("returnTo") ?? sp.get("next"), fallback);
  } catch {
    return fallback;
  }
}

/** Traduz erro do Supabase Auth em mensagem em português amigável. */
export function mapAuthError(err: unknown): string {
  const raw =
    (err as { message?: string } | null)?.message?.toLowerCase() ?? "";
  if (!raw) return "Não foi possível entrar. Tente novamente.";
  if (raw.includes("invalid login") || raw.includes("invalid_credentials") || raw.includes("invalid grant")) {
    return "E-mail ou senha inválidos.";
  }
  if (raw.includes("email not confirmed") || raw.includes("email_not_confirmed")) {
    return "Confirme seu e-mail antes de entrar.";
  }
  if (raw.includes("rate") || raw.includes("too many")) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }
  if (raw.includes("network") || raw.includes("failed to fetch")) {
    return "Sem conexão. Verifique sua internet e tente novamente.";
  }
  if (raw.includes("user not found")) {
    return "Conta não encontrada para este e-mail.";
  }
  if (raw.includes("weak password") || raw.includes("password")) {
    return "Senha inválida. Use ao menos 8 caracteres.";
  }
  return "Não foi possível entrar. Tente novamente.";
}

export type GoogleSignInResult = { ok: boolean; error?: string };

/**
 * Inicia login com Google via Lovable Cloud Managed OAuth.
 * Funciona no subdomínio principal e no `parceiro.roxou.com.br`.
 * `returnTo` é preservado em sessionStorage para uso pós-callback.
 */
export async function signInWithGoogle(returnTo?: string): Promise<GoogleSignInResult> {
  try {
    const safe = safeReturnTo(returnTo, "/");
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("roxou:auth:returnTo", safe);
      } catch {
        /* noop */
      }
    }
    if (isDev) {
      // eslint-disable-next-line no-console
      console.info("[AUTH] google sign-in start", { returnTo: safe });
    }
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri:
        typeof window !== "undefined" ? window.location.origin : undefined,
    });
    if (result.error) {
      return { ok: false, error: mapGoogleError(result.error) };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: mapGoogleError(err) };
  }
}

function mapGoogleError(err: unknown): string {
  const raw =
    (err as { message?: string } | null)?.message?.toLowerCase() ?? "";
  if (raw.includes("popup") || raw.includes("blocked")) {
    return "Pop-up bloqueado. Permita pop-ups e tente novamente.";
  }
  if (raw.includes("cancel")) {
    return "Login com Google cancelado.";
  }
  if (raw.includes("network") || raw.includes("failed to fetch")) {
    return "Sem conexão. Tente novamente.";
  }
  return "Não foi possível entrar com Google. Tente novamente ou use e-mail e senha.";
}

/** Lê returnTo preservado em sessionStorage (após OAuth). */
export function consumeStoredReturnTo(fallback = "/"): string {
  if (typeof window === "undefined") return fallback;
  try {
    const v = sessionStorage.getItem("roxou:auth:returnTo");
    sessionStorage.removeItem("roxou:auth:returnTo");
    return safeReturnTo(v, fallback);
  } catch {
    return fallback;
  }
}
