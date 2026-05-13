/**
 * Busca metadados agregados para uma lista de jogos:
 *  - quantidade de bares vinculados por external_id
 *  - se há transmissão oficial ativa
 *  - se há chat ativo (msg nas últimas 30min)
 *
 * Faz isso usando o slug como ponte (sports_matches.slug == NormalizedMatch.slug).
 * Uma única query por dimensão; sem N+1.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MatchMeta {
  venuesCount: number;
  hasStream: boolean;
  hasActiveChat: boolean;
}

export type MatchMetaMap = Record<string, MatchMeta>;

export function useMatchMeta(slugs: string[]) {
  return useQuery({
    queryKey: ["match-meta", slugs.slice().sort().join("|")],
    enabled: slugs.length > 0,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<MatchMetaMap> => {
      if (slugs.length === 0) return {};

      // 1. matches com venue counts
      const { data: matches } = await supabase
        .from("sports_matches")
        .select("id, slug")
        .in("slug", slugs);

      const map: MatchMetaMap = {};
      for (const s of slugs) map[s] = { venuesCount: 0, hasStream: false, hasActiveChat: false };
      if (!matches?.length) {
        // chat ativo ainda assim
        await fillChat(slugs, map);
        return map;
      }

      const idToSlug = new Map(matches.map((m) => [m.id, m.slug]));
      const ids = matches.map((m) => m.id);

      // 2. venues count
      const { data: venues } = await supabase
        .from("sports_match_venues")
        .select("match_id")
        .in("match_id", ids);
      if (venues) {
        for (const v of venues) {
          const slug = idToSlug.get(v.match_id as string);
          if (slug) map[slug].venuesCount++;
        }
      }

      // 3. streams ativos
      const { data: streams } = await supabase
        .from("sports_match_streams")
        .select("match_id")
        .in("match_id", ids)
        .eq("is_active", true);
      if (streams) {
        for (const s of streams) {
          const slug = idToSlug.get(s.match_id as string);
          if (slug) map[slug].hasStream = true;
        }
      }

      await fillChat(slugs, map);
      return map;
    },
  });
}

async function fillChat(slugs: string[], map: MatchMetaMap) {
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("football_chat_messages")
    .select("match_slug")
    .in("match_slug", slugs)
    .gte("created_at", since)
    .eq("is_deleted", false)
    .limit(1000);
  if (data) {
    for (const row of data) {
      const s = row.match_slug as string;
      if (map[s]) map[s].hasActiveChat = true;
    }
  }
}
