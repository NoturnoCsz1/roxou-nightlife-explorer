/**
 * services/instagram.ts — leitura de tabelas Instagram.
 * ADITIVO.
 *
 * Nota: `instagram_posts` não possui coluna `handle`; o vínculo com a conta
 * é via `instagram_account_id`. Use `listPostsByAccountId` para filtrar.
 */
import { supabase } from "@/integrations/supabase/client";

export type InstagramAccountRow = Record<string, any>;
export type InstagramPostRow = Record<string, any>;

export async function listInstagramAccounts(): Promise<InstagramAccountRow[]> {
  const { data, error } = await (supabase as any)
    .from("instagram_accounts")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as InstagramAccountRow[]) ?? [];
}

export async function listRecentInstagramPosts(limit = 50): Promise<InstagramPostRow[]> {
  const { data, error } = await (supabase as any)
    .from("instagram_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as InstagramPostRow[]) ?? [];
}

export async function listPostsByAccountId(
  instagramAccountId: string,
  limit = 24,
): Promise<InstagramPostRow[]> {
  const { data, error } = await (supabase as any)
    .from("instagram_posts")
    .select("*")
    .eq("instagram_account_id", instagramAccountId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as InstagramPostRow[]) ?? [];
}
