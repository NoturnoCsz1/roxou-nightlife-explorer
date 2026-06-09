/**
 * partnerDescription — combina sinais reais (sem IA externa) para gerar
 * uma descrição enriquecida quando o parceiro não tem `short_description` curada.
 *
 * Ordem de preferência:
 * 1. short_description (curada pelo admin)
 * 2. aura_partner_summary (gerada pela Aura via cron)
 * 3. primeiras linhas da instagram_bio
 * 4. fallback heurístico a partir de type + neighborhood + city
 */

interface PartnerLike {
  name?: string | null;
  type?: string | null;
  short_description?: string | null;
  full_description?: string | null;
  aura_partner_summary?: string | null;
  aura_partner_tags?: string[] | null;
  instagram_bio?: string | null;
  neighborhood?: string | null;
  city?: string | null;
}

/** Limpa bio do IG removendo links, emojis decorativos e quebras excessivas. */
function cleanInstagramBio(bio: string): string {
  return bio
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false;
      // tira linhas que são só emoji+link tipo "Cardápio, iFood, WhatsApp 👇"
      if (/^[^\p{L}\p{N}]+$/u.test(l)) return false;
      if (/^https?:\/\//i.test(l)) return false;
      return true;
    })
    .slice(0, 3)
    .join(" • ");
}

function locationTail(p: PartnerLike): string {
  const parts: string[] = [];
  if (p.neighborhood) parts.push(p.neighborhood);
  if (p.city) parts.push(p.city);
  return parts.length > 0 ? ` em ${parts.join(", ")}` : "";
}

export function buildPartnerRichDescription(p: PartnerLike): string {
  if (p.short_description && p.short_description.trim().length > 10) {
    return p.short_description.trim();
  }
  if (p.aura_partner_summary && p.aura_partner_summary.trim().length > 10) {
    return p.aura_partner_summary.trim();
  }
  if (p.instagram_bio && p.instagram_bio.trim().length > 0) {
    const cleaned = cleanInstagramBio(p.instagram_bio);
    if (cleaned.length > 0) return cleaned;
  }
  const tipo = (p.type || "local").toLowerCase();
  const tail = locationTail(p);
  const tagHint =
    Array.isArray(p.aura_partner_tags) && p.aura_partner_tags.length > 0
      ? ` Ambiente conhecido por ${p.aura_partner_tags.slice(0, 3).join(", ")}.`
      : "";
  return `${p.name || "Este local"} é um ${tipo}${tail}.${tagHint}`.trim();
}
