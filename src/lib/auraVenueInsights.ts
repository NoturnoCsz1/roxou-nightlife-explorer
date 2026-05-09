/**
 * auraVenueInsights — heurísticas locais (sem IA externa) para gerar
 * "insights" sobre um local com base no partner + eventos.
 *
 * NÃO faz fetch, NÃO altera analytics, NÃO depende de timezone.
 * Usa apenas Date no contexto de "dia da semana"/"hora" do dado já salvo.
 */

export interface AuraInsightsInput {
  partner: {
    name?: string | null;
    type?: string | null;
    short_description?: string | null;
    full_description?: string | null;
    city?: string | null;
  };
  events: Array<{
    date_time?: string | null;
    category?: string | null;
    sub_category?: string | null;
    title?: string | null;
  }>;
}

export interface AuraInsights {
  crowd: string;
  vibe: string;
  priceLevel: "$" | "$$" | "$$$";
  bestDay: string;
  musicStyle: string;
  peakTime: string;
  idealFor: string[];
  confidence: "low" | "medium" | "high";
}

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const TYPE_PROFILES: Record<
  string,
  Partial<Pick<AuraInsights, "crowd" | "vibe" | "priceLevel" | "musicStyle" | "idealFor">>
> = {
  bar: {
    crowd: "Grupo de amigos",
    vibe: "Barzinho descontraído",
    priceLevel: "$$",
    musicStyle: "Pop / MPB",
    idealFor: ["Happy hour", "Resenha", "Encontro"],
  },
  pub: {
    crowd: "Universitário",
    vibe: "Pub temático",
    priceLevel: "$$",
    musicStyle: "Rock / Pop Rock",
    idealFor: ["Happy hour", "Resenha"],
  },
  balada: {
    crowd: "Universitário",
    vibe: "Balada premium",
    priceLevel: "$$$",
    musicStyle: "Eletrônico / Funk",
    idealFor: ["Aniversários", "After", "Resenha"],
  },
  "casa de shows": {
    crowd: "Público misto",
    vibe: "Música ao vivo",
    priceLevel: "$$$",
    musicStyle: "Sertanejo / Pagode",
    idealFor: ["Show", "Encontro"],
  },
  universitario: {
    crowd: "Universitário",
    vibe: "Open air universitário",
    priceLevel: "$$",
    musicStyle: "Sertanejo / Funk",
    idealFor: ["Resenha", "Aniversários"],
  },
  restaurante: {
    crowd: "Casais",
    vibe: "Lounge gastronômico",
    priceLevel: "$$$",
    musicStyle: "Lounge / MPB",
    idealFor: ["Encontro", "Aniversários"],
  },
  lounge: {
    crowd: "Premium",
    vibe: "Lounge premium",
    priceLevel: "$$$",
    musicStyle: "Lounge / Eletrônico",
    idealFor: ["Encontro", "After"],
  },
  cultural: {
    crowd: "Alternativo",
    vibe: "Espaço cultural",
    priceLevel: "$$",
    musicStyle: "MPB / Indie",
    idealFor: ["Encontro", "Cultura"],
  },
};

const SUB_TO_MUSIC: Record<string, string> = {
  funk: "Funk",
  pagode_samba: "Pagode / Samba",
  rock: "Rock",
  pop_rock: "Pop Rock",
  mpb: "MPB",
  eletronica: "Eletrônico",
  sertanejo: "Sertanejo",
};

function detectFromText(text: string): Partial<AuraInsights> {
  const t = text.toLowerCase();
  const out: Partial<AuraInsights> = {};
  if (/(premium|vip|exclusiv|sofistic|gourmet)/.test(t)) {
    out.priceLevel = "$$$";
    out.crowd = "Premium";
  }
  if (/(univers|faculd|estud)/.test(t)) out.crowd = "Universitário";
  if (/(casal|romant|jantar)/.test(t)) out.crowd = "Casais";
  if (/(altern|indie|underground)/.test(t)) out.crowd = "Alternativo";
  if (/(open air|ao ar livre|jardim|terra[çc]o)/.test(t)) out.vibe = "Open air";
  if (/(ao vivo|live|sertanejo|pagode|samba)/.test(t)) out.vibe = "Música ao vivo";
  if (/(funk|baile)/.test(t)) out.musicStyle = "Funk";
  if (/(eletr[oô]nic|techno|house)/.test(t)) out.musicStyle = "Eletrônico";
  if (/(sertanej)/.test(t)) out.musicStyle = "Sertanejo";
  if (/(rock)/.test(t)) out.musicStyle = "Rock";
  if (/(pagod|samba)/.test(t)) out.musicStyle = "Pagode / Samba";
  return out;
}

export function buildAuraVenueInsights(input: AuraInsightsInput): AuraInsights {
  const type = (input.partner.type || "").toLowerCase().trim();
  const base: Partial<AuraInsights> = TYPE_PROFILES[type] || TYPE_PROFILES.bar;

  const text = [input.partner.short_description, input.partner.full_description]
    .filter(Boolean)
    .join(" ");
  const fromText = detectFromText(text);

  // Dia/horário com base nos eventos
  const dayCount = new Array(7).fill(0);
  const hourCount = new Array(24).fill(0);
  const subCount: Record<string, number> = {};
  for (const ev of input.events) {
    if (!ev.date_time) continue;
    const d = new Date(ev.date_time);
    if (Number.isNaN(d.getTime())) continue;
    dayCount[d.getDay()] += 1;
    hourCount[d.getHours()] += 1;
    const sub = ev.sub_category || ev.category;
    if (sub) subCount[sub] = (subCount[sub] || 0) + 1;
  }

  let bestDay = "Sexta";
  if (input.events.length > 0) {
    const idx = dayCount.indexOf(Math.max(...dayCount));
    if (idx >= 0 && dayCount[idx] > 0) bestDay = DAYS[idx];
  }

  let peakTime = "22h às 02h";
  if (input.events.length > 0) {
    const idx = hourCount.indexOf(Math.max(...hourCount));
    if (idx >= 0 && hourCount[idx] > 0) {
      const start = idx;
      const end = (idx + 4) % 24;
      peakTime = `${String(start).padStart(2, "0")}h às ${String(end).padStart(2, "0")}h`;
    }
  }

  let musicStyle = fromText.musicStyle || base.musicStyle || "Variado";
  const topSub = Object.entries(subCount).sort((a, b) => b[1] - a[1])[0];
  if (topSub && SUB_TO_MUSIC[topSub[0]]) musicStyle = SUB_TO_MUSIC[topSub[0]];

  const eventCount = input.events.length;
  const confidence: AuraInsights["confidence"] =
    eventCount >= 6 ? "high" : eventCount >= 2 ? "medium" : "low";

  return {
    crowd: fromText.crowd || base.crowd || "Público misto",
    vibe: fromText.vibe || base.vibe || "Ambiente acolhedor",
    priceLevel: (fromText.priceLevel || base.priceLevel || "$$") as AuraInsights["priceLevel"],
    bestDay,
    musicStyle,
    peakTime,
    idealFor: base.idealFor || ["Happy hour", "Encontro"],
    confidence,
  };
}
