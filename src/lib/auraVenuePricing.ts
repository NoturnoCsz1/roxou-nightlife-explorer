/**
 * auraVenuePricing — heurística de estimativa de consumo (sem IA externa).
 * Não consulta nada externo, não altera analytics, não depende de timezone.
 *
 * IMPORTANTE: o retorno é SEMPRE estimativa. Nunca "preço oficial".
 */

export interface AuraPricingInput {
  partner: {
    type?: string | null;
    short_description?: string | null;
    full_description?: string | null;
  };
  events: Array<{
    date_time?: string | null;
    category?: string | null;
    sub_category?: string | null;
    title?: string | null;
  }>;
}

export type PriceProfile = "$" | "$$" | "$$$";

export interface AuraPricing {
  entryPrice: string;
  drinkAverage: string;
  estimatedSpend: string;
  priceProfile: PriceProfile;
  bestCostDay: string;
  confidence: "low" | "medium" | "high";
  notes: string[];
}

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

interface BaseProfile {
  entry: string;
  drink: string;
  spend: string;
  profile: PriceProfile;
}

const TYPE_BASE: Record<string, BaseProfile> = {
  bar: { entry: "Grátis/baixo", drink: "R$15–25", spend: "R$60–110", profile: "$$" },
  pub: { entry: "Grátis/baixo", drink: "R$18–28", spend: "R$70–130", profile: "$$" },
  balada: { entry: "R$30–60", drink: "R$20–35", spend: "R$120–220", profile: "$$$" },
  "casa de shows": { entry: "R$40–120", drink: "R$20–35", spend: "R$150–280", profile: "$$$" },
  universitario: { entry: "R$20–40", drink: "R$12–22", spend: "R$70–130", profile: "$$" },
  restaurante: { entry: "Grátis/baixo", drink: "R$18–30", spend: "R$90–180", profile: "$$$" },
  lounge: { entry: "R$20–50", drink: "R$25–40", spend: "R$150–260", profile: "$$$" },
  cultural: { entry: "Grátis/baixo", drink: "R$12–20", spend: "R$50–100", profile: "$" },
  espetinho: { entry: "Grátis/baixo", drink: "R$10–18", spend: "R$40–90", profile: "$" },
};

function shiftUp(b: BaseProfile): BaseProfile {
  return { ...b, profile: b.profile === "$" ? "$$" : "$$$", drink: bumpRange(b.drink, 1.3), spend: bumpRange(b.spend, 1.3), entry: bumpRange(b.entry, 1.3) };
}

function shiftDown(b: BaseProfile): BaseProfile {
  return { ...b, profile: b.profile === "$$$" ? "$$" : "$", drink: bumpRange(b.drink, 0.75), spend: bumpRange(b.spend, 0.75) };
}

function bumpRange(range: string, factor: number): string {
  const m = range.match(/R\$(\d+)\D+(\d+)/);
  if (!m) return range;
  const a = Math.round(Number(m[1]) * factor);
  const b = Math.round(Number(m[2]) * factor);
  return `R$${a}–${b}`;
}

export function buildAuraVenuePricing(input: AuraPricingInput): AuraPricing {
  const type = (input.partner.type || "").toLowerCase().trim();
  let base: BaseProfile = TYPE_BASE[type] || TYPE_BASE.bar;
  const notes: string[] = [];

  const text = [input.partner.short_description, input.partner.full_description, ...input.events.map((e) => e.title || "")]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/(premium|vip|exclusiv|sofistic|gourmet|lounge premium)/.test(text)) {
    base = shiftUp(base);
    notes.push("Perfil premium detectado na descrição.");
  }
  if (/(univers|faculd|estud)/.test(text)) {
    base = shiftDown(base);
    notes.push("Perfil universitário — geralmente mais acessível.");
  }
  if (/(open bar)/.test(text)) {
    notes.push("Open bar mencionado — entrada pode incluir bebidas.");
  }
  if (/(happy hour|chopp em dobro|promo[çc][aã]o|2 por 1)/.test(text)) {
    notes.push("Promoções/Happy hour detectados — verifique dia.");
  }
  if (/(show nacional|atra[çc][aã]o nacional|dj internacional)/.test(text)) {
    base = shiftUp(base);
    notes.push("Atração nacional/destaque pode elevar entrada.");
  }
  if (/(festival)/.test(text)) {
    notes.push("Festival — preço varia conforme lote e dia.");
  }

  // Melhor dia custo-benefício: dia da semana com mais eventos (assumindo programação consolidada → mais opções/promo)
  let bestCostDay = "A consultar";
  if (input.events.length > 0) {
    const dayCount = new Array(7).fill(0);
    for (const ev of input.events) {
      if (!ev.date_time) continue;
      const d = new Date(ev.date_time);
      if (Number.isNaN(d.getTime())) continue;
      dayCount[d.getDay()] += 1;
    }
    // Preferimos quinta/sexta como melhor custo-benefício se houver eventos nesses dias
    const preferred = [4, 5, 3];
    const found = preferred.find((i) => dayCount[i] > 0);
    if (found != null) {
      bestCostDay = DAYS[found];
    } else {
      const idx = dayCount.indexOf(Math.max(...dayCount));
      if (idx >= 0 && dayCount[idx] > 0) bestCostDay = DAYS[idx];
    }
  }

  const eventCount = input.events.length;
  const confidence: AuraPricing["confidence"] =
    eventCount >= 6 ? "medium" : eventCount >= 2 ? "low" : "low";

  if (eventCount === 0) notes.push("Sem eventos recentes — estimativa baseada no tipo do local.");

  return {
    entryPrice: base.entry,
    drinkAverage: base.drink,
    estimatedSpend: base.spend,
    priceProfile: base.profile,
    bestCostDay,
    confidence,
    notes,
  };
}
