/**
 * services/instagram.ts — leitura de tabelas Instagram.
 * ADITIVO. Não invoca Edge Functions (use `lib/adminFetch` + fetch direto
 * nas páginas até a Fase 3).
 */
import { supabase } from "@/integrations/supabase/client";

export type InstagramAccountRow = Record<string, any>;
export type InstagramPostRow = Record<string, any>;

export async function listInstagramAccounts(): Promise<InstagramAccountRow[]> {
  const { data, error } = await supabase
    .from("instagram_accounts")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listRecentInstagramPosts(limit = 50): Promise<InstagramPostRow[]> {
  const { data, error } = await supabase
    .from("instagram_posts")
    .select("*")
    .order("posted_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function listPostsByHandle(handle: string, limit = 24): Promise<InstagramPostRow[]> {
  const { data, error } = await supabase
    .from("instagram_posts")
    .select("*")
    .eq("handle", handle)
    .order("posted_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
