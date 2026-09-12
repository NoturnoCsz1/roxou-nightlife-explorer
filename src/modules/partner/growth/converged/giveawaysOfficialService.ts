/**
 * Sorteios — interface LIMITADA do Partner Pro sobre o módulo oficial
 * de Sorteios & Campanhas (Viral Growth Engine) da Roxou.
 *
 * Fonte de verdade: `giveaways`, `giveaway_participants`, `giveaway_entries`
 * e `giveaway_draws` no Supabase oficial. Nenhuma engine, ledger, antifraude
 * ou apuração é reimplementada aqui — o Partner Pro apenas LÊ.
 *
 * Escopo: `giveaways.venue_id` = venue da sessão. Autorização final é RLS.
 */
import { officialClient } from "@modules/partner/converged/client";
import { requireVenue, type PartnerScope } from "@modules/partner/converged/tenancy";

export const GIVEAWAYS_TABLE = "giveaways" as const;
export const GIVEAWAY_PARTICIPANTS_TABLE = "giveaway_participants" as const;
export const GIVEAWAY_DRAWS_TABLE = "giveaway_draws" as const;

export interface OfficialGiveaway {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  prize_title: string | null;
  prize_details: string | null;
  banner_url: string | null;
  total_winners: number | null;
  total_backups: number | null;
  starts_at: string | null;
  ends_at: string | null;
  draw_date: string | null;
  status: string;
  event_id: string | null;
  venue_id: string | null;
  created_at: string;
}

export interface OfficialGiveawayDraw {
  id: string;
  giveaway_id: string;
  draw_number: number | null;
  title: string | null;
  prize_title: string | null;
  status: string;
  drawn_at: string | null;
  total_eligible_participants: number | null;
  total_tickets_pool: number | null;
  winners_data: unknown;
}

const SELECT_COLS =
  "id, title, slug, description, prize_title, prize_details, banner_url, total_winners, total_backups, starts_at, ends_at, draw_date, status, event_id, venue_id, created_at";

export async function listVenueGiveaways(
  scope: PartnerScope,
): Promise<OfficialGiveaway[]> {
  const venueId = requireVenue(scope);
  const { data, error } = await officialClient()
    .from(GIVEAWAYS_TABLE)
    .select(SELECT_COLS)
    .eq("venue_id", venueId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as OfficialGiveaway[];
}

/** Contagem REAL de participantes. Nunca estimada. */
export async function countGiveawayParticipants(
  giveawayId: string,
): Promise<number | null> {
  const { count, error } = await officialClient()
    .from(GIVEAWAY_PARTICIPANTS_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("giveaway_id", giveawayId);
  if (error) return null;
  return count ?? 0;
}

export async function listGiveawayDraws(
  giveawayId: string,
): Promise<OfficialGiveawayDraw[]> {
  const { data, error } = await officialClient()
    .from(GIVEAWAY_DRAWS_TABLE)
    .select(
      "id, giveaway_id, draw_number, title, prize_title, status, drawn_at, total_eligible_participants, total_tickets_pool, winners_data",
    )
    .eq("giveaway_id", giveawayId)
    .order("draw_number", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as OfficialGiveawayDraw[];
}

export interface GiveawayWinnerRow {
  position: number;
  display_name: string;
  kind: "winner" | "backup";
}

/** Extrai ganhadores/suplentes do snapshot oficial da apuração. */
export function readWinners(draw: OfficialGiveawayDraw): GiveawayWinnerRow[] {
  const data = draw.winners_data as
    | {
        winners?: { position: number; display_name: string }[];
        backups?: { position: number; display_name: string }[];
      }
    | null;
  if (!data) return [];
  const winners = (data.winners ?? []).map((w) => ({
    position: w.position,
    display_name: w.display_name,
    kind: "winner" as const,
  }));
  const backups = (data.backups ?? []).map((w) => ({
    position: w.position,
    display_name: w.display_name,
    kind: "backup" as const,
  }));
  return [...winners, ...backups];
}
