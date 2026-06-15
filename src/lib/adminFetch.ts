/* eslint-disable @typescript-eslint/no-explicit-any -- bridge tipado fraco até src/types/db.ts (Fase 3) */
/**
 * adminFetch — headers autenticados para chamadas fetch a Edge Functions
 * que usam `requireAdmin`.
 *
 * Centraliza o padrão hoje replicado em InstagramAdmin.tsx (e que aparecerá
 * em outras telas admin nas próximas fases), evitando regressão 401.
 *
 * Uso:
 *   const headers = await getAdminAuthHeaders();
 *   await fetch(url, { headers });
 */
import { supabase } from "@/integrations/supabase/client";

const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export class AdminSessionExpiredError extends Error {
  constructor() {
    super("Sessão expirada. Faça login novamente.");
    this.name = "AdminSessionExpiredError";
  }
}

export async function getAdminAuthHeaders(): Promise<HeadersInit> {
  const { data, error } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (error || !token) {
    throw new AdminSessionExpiredError();
  }
  return {
    Authorization: `Bearer ${token}`,
    apikey: PUBLISHABLE_KEY,
    "Content-Type": "application/json",
  };
}
