// Helpers para detectar e vincular transmissões de futebol em eventos/flyers.
// Sem IA: regras + busca em sports_matches.

import { supabase } from "@/integrations/supabase/client";
import { isSameTeam } from "@/lib/theSportsDb";

const lower = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const STRONG_KW = ["transmissao", "transmite", "transmitindo", "telao", "ao vivo no telao"];
const SPORTS_KW = [
  "futebol", "ao vivo", "jogo", "jogos",
  "brasileirao", "copa do brasil", "libertadores", "sul-americana", "sulamericana",
  "champions", "uefa", "premier league", "la liga", "serie a", "serie b",
  "final", "classico", "torcida", "vem assistir", "vem torcer",
];

export interface SportsDetection {
  is_transmission: boolean;
  confidence: "high" | "medium" | "low";
  teams: string[];
  has_strong_kw: boolean;
}

export interface TeamAlias {
  canonical: string; // como aparece em sports_matches.home_team/away_team (lowercase normalized)
  aliases: string[];
}

// Lista canônica + apelidos. Canonical em lower/sem acento.
const TEAM_ALIASES: TeamAlias[] = [
  { canonical: "sao paulo", aliases: ["sao paulo", "spfc", "tricolor paulista", "tricolor"] },
  { canonical: "palmeiras", aliases: ["palmeiras", "verdao", "porco", "sep"] },
  { canonical: "corinthians", aliases: ["corinthians", "timao", "coringao"] },
  { canonical: "santos", aliases: ["santos", "peixe", "santos fc"] },
  { canonical: "flamengo", aliases: ["flamengo", "mengao", "mengo", "fla"] },
  { canonical: "fluminense", aliases: ["fluminense", "flu", "nense"] },
  { canonical: "vasco", aliases: ["vasco", "gigante da colina"] },
  { canonical: "botafogo", aliases: ["botafogo", "fogao", "glorioso"] },
  { canonical: "gremio", aliases: ["gremio", "tricolor gaucho"] },
  { canonical: "internacional", aliases: ["internacional", "inter", "colorado"] },
  { canonical: "atletico-mg", aliases: ["atletico mg", "atletico-mg", "galo", "atletico mineiro"] },
  { canonical: "cruzeiro", aliases: ["cruzeiro", "raposa"] },
  { canonical: "bahia", aliases: ["bahia", "tricolor de aco", "ec bahia"] },
  { canonical: "vitoria", aliases: ["vitoria", "leao da barra"] },
  { canonical: "ceara", aliases: ["ceara", "vovo"] },
  { canonical: "fortaleza", aliases: ["fortaleza", "leao do pici"] },
  { canonical: "athletico-pr", aliases: ["athletico", "athletico pr", "athletico-pr", "furacao"] },
  { canonical: "coritiba", aliases: ["coritiba", "coxa"] },
  { canonical: "juventude", aliases: ["juventude", "ju"] },
  { canonical: "bragantino", aliases: ["bragantino", "red bull bragantino", "rb bragantino"] },
  { canonical: "cuiaba", aliases: ["cuiaba", "dourado"] },
  { canonical: "sport", aliases: ["sport", "sport recife", "leao da ilha"] },
  { canonical: "mirassol", aliases: ["mirassol"] },
  { canonical: "remo", aliases: ["remo"] },
  { canonical: "jacuipense", aliases: ["jacuipense"] },
  // Europeus principais
  { canonical: "psg", aliases: ["psg", "paris saint-germain", "paris"] },
  { canonical: "barcelona", aliases: ["barcelona", "barca"] },
  { canonical: "real madrid", aliases: ["real madrid", "real"] },
  { canonical: "manchester city", aliases: ["manchester city", "city", "man city"] },
  { canonical: "manchester united", aliases: ["manchester united", "man united", "united"] },
  { canonical: "liverpool", aliases: ["liverpool"] },
  { canonical: "chelsea", aliases: ["chelsea"] },
  { canonical: "arsenal", aliases: ["arsenal"] },
  { canonical: "bayern", aliases: ["bayern", "bayern munich", "bayern de munique"] },
  { canonical: "juventus", aliases: ["juventus", "juve"] },
  { canonical: "milan", aliases: ["milan", "ac milan"] },
  { canonical: "inter de milao", aliases: ["inter de milao", "inter milao", "internazionale"] },
];

export function detectSportsTransmission(text: string): SportsDetection {
  const t = lower(text || "");
  if (!t.trim()) return { is_transmission: false, confidence: "low", teams: [], has_strong_kw: false };

  const has_strong_kw = STRONG_KW.some((k) => t.includes(k));
  const has_sports_kw = SPORTS_KW.some((k) => t.includes(k));

  // Detecta times
  const found = new Set<string>();
  for (const team of TEAM_ALIASES) {
    for (const a of team.aliases) {
      // Word-boundary leve para evitar match parcial em palavras maiores
      const re = new RegExp(`(^|[^a-z])${a.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}([^a-z]|$)`, "i");
      if (re.test(t)) {
        found.add(team.canonical);
        break;
      }
    }
  }
  const teams = Array.from(found);

  if (!has_strong_kw && !has_sports_kw && teams.length === 0) {
    return { is_transmission: false, confidence: "low", teams, has_strong_kw };
  }

  const is_transmission = has_strong_kw || (has_sports_kw && teams.length > 0) || teams.length >= 2;

  let confidence: "high" | "medium" | "low" = "low";
  if (has_strong_kw && teams.length > 0) confidence = "high";
  else if (has_strong_kw || teams.length >= 2) confidence = "medium";
  else if (teams.length === 1 && has_sports_kw) confidence = "medium";
  else confidence = "low";

  return { is_transmission, confidence, teams, has_strong_kw };
}

export interface MatchCandidate {
  id: string;
  home_team: string;
  away_team: string;
  match_time: string;
  league_label: string | null;
  category: string | null;
}

// Busca candidatos a jogo correspondente em sports_matches.
export async function findMatchingSportsMatch(opts: {
  teams: string[];
  referenceDate?: Date | null;
}): Promise<{ best: MatchCandidate | null; candidates: MatchCandidate[] }> {
  const { teams, referenceDate } = opts;
  if (!teams.length) return { best: null, candidates: [] };

  const refMs = referenceDate ? referenceDate.getTime() : Date.now();
  const fromIso = new Date(refMs - 1 * 86400_000).toISOString();
  const toIso = new Date(refMs + 7 * 86400_000).toISOString();

  const { data, error } = await supabase
    .from("sports_matches")
    .select("id,home_team,away_team,match_time,league_label,category")
    .gte("match_time", fromIso)
    .lte("match_time", toIso)
    .neq("status", "cancelled")
    .order("match_time", { ascending: true })
    .limit(200);

  if (error || !data) return { best: null, candidates: [] };

  const teamSet = new Set(teams.map((t) => lower(t)));
  const scored = data
    .map((m) => {
      const home = lower(m.home_team || "");
      const away = lower(m.away_team || "");
      // match by alias substring contains
      const matchTeam = (txt: string) => {
        for (const t of teamSet) if (txt.includes(t) || t.includes(txt)) return true;
        return false;
      };
      const hits = (matchTeam(home) ? 1 : 0) + (matchTeam(away) ? 1 : 0);
      const dt = Math.abs(new Date(m.match_time).getTime() - refMs);
      const dayDiff = dt / 86400_000;
      // Score: cada time bate vale +5; mesmo dia +3; até 2 dias +1
      let score = hits * 5;
      if (dayDiff < 0.5) score += 4;
      else if (dayDiff < 1.5) score += 2;
      else if (dayDiff < 3) score += 1;
      return { m: m as MatchCandidate, score, hits };
    })
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.score - a.score);

  const candidates = scored.map((s) => s.m);
  const best = scored[0];
  // Confiável: pelo menos 1 time + dentro de 2 dias OU 2 times batendo
  const isConfident = best && (best.hits >= 2 || best.score >= 7);
  return { best: isConfident ? best.m : null, candidates };
}

export interface LinkResult {
  detected: boolean;
  confidence: "high" | "medium" | "low";
  teams: string[];
  matched_match_id: string | null;
  linked: boolean;
  reason?: string;
}

// Pipeline completo: detecta -> busca jogo -> cria vínculo se confiança alta.
// Atualiza events com flags. Retorna o resultado.
export async function analyzeAndLinkEventTransmission(opts: {
  eventId: string;
  text: string;
  partnerId?: string | null;
  referenceDate?: Date | null;
  source: "manual" | "radar-ia" | "eventou" | string;
}): Promise<LinkResult> {
  const { eventId, text, partnerId, referenceDate, source } = opts;
  const det = detectSportsTransmission(text);

  if (!det.is_transmission) {
    return { detected: false, confidence: det.confidence, teams: det.teams, matched_match_id: null, linked: false };
  }

  let matchedId: string | null = null;
  let linked = false;
  let reason: string | undefined;

  if (det.teams.length > 0) {
    const { best } = await findMatchingSportsMatch({ teams: det.teams, referenceDate });
    matchedId = best?.id ?? null;

    // Vincula apenas se confiança alta + jogo encontrado + parceiro existe
    if (best && partnerId && det.confidence === "high") {
      const { data: existing } = await supabase
        .from("sports_match_venues")
        .select("id,confirmed_by_admin")
        .eq("match_id", best.id)
        .eq("venue_id", partnerId)
        .maybeSingle();

      if (existing) {
        // Não sobrescreve confirmado manualmente. Apenas atualiza tipo.
        if (!existing.confirmed_by_admin) {
          await supabase
            .from("sports_match_venues")
            .update({ transmission_type: "telao" })
            .eq("id", existing.id);
        }
        linked = true;
        reason = "vinculo-existente";
      } else {
        const { error: insErr } = await supabase.from("sports_match_venues").insert({
          match_id: best.id,
          venue_id: partnerId,
          transmission_type: "telao",
          confirmed_by_admin: source === "manual",
        });
        if (!insErr) {
          linked = true;
          reason = "vinculo-criado";
        } else {
          reason = `erro-insert: ${insErr.message}`;
        }
      }

      if (linked) {
        // Marca parceiro como supports_sports
        await supabase.from("partners").update({ supports_sports: true }).eq("id", partnerId);
      }
    } else if (best && det.confidence !== "high") {
      reason = "confianca-media-pendente-revisao";
    } else if (!best) {
      reason = "sem-jogo-correspondente";
    }
  } else {
    reason = "sem-time-detectado";
  }

  // Atualiza flags no evento
  const confidenceScore =
    det.confidence === "high" ? 0.9 : det.confidence === "medium" ? 0.6 : 0.3;
  await supabase
    .from("events")
    .update({
      is_sports_transmission: true,
      sports_match_id: matchedId,
      sports_transmission_confidence: confidenceScore,
      sports_transmission_source: source,
    } as any)
    .eq("id", eventId);

  return {
    detected: true,
    confidence: det.confidence,
    teams: det.teams,
    matched_match_id: matchedId,
    linked,
    reason,
  };
}
