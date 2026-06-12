// Estima economia (R$) a partir de texto livre de ofertas/eventos
// Estratégia: regex em ordem decrescente de especificidade.

export interface SavingsResult {
  amount: number; // R$ estimados
  tier: "alta" | "media" | "baixa";
  badges: string[];
}

const lower = (s?: string | null) => (s ?? "").toLowerCase();
const FREE_RE = /\b(grátis|gratis|gratuito|gratuita|free|entrada\s+(franca|livre|free)|sem\s+couvert|cortesia)\b/i;
const HAPPY_RE = /\b(happy\s*hour|chopp.{0,12}r\$|dobradinha|2\s*x\s*1|duas\s+por\s+uma|combo|promo)\b/i;
const STUDENT_RE = /\b(universit[áa]ri[oa]|estudante|meia[\s-]?entrada|carteirinha)\b/i;
const SPORTS_RE = /\b(jogo|futebol|brasileir[ãa]o|copa|libertadores|transmiss[ãa]o)\b/i;

const RS_RE = /r\$\s*(\d{1,4}(?:[.,]\d{1,2})?)/i;
const PCT_RE = /(\d{1,2})\s*%/;

export function estimateSavings(text?: string | null, fallbackBadge?: string): SavingsResult {
  const t = lower(text);
  const badges: string[] = [];
  let amount = 0;

  if (FREE_RE.test(t)) {
    amount = Math.max(amount, 25);
    badges.push("🎉 Gratuito");
  }
  if (HAPPY_RE.test(t)) {
    amount = Math.max(amount, 18);
    badges.push("🍻 Happy Hour");
  }
  if (STUDENT_RE.test(t)) {
    amount = Math.max(amount, 15);
    badges.push("🎓 Estudante");
  }
  if (SPORTS_RE.test(t) && /\bsem\s+couvert\b/i.test(t)) {
    amount = Math.max(amount, 20);
    badges.push("⚽ Sem couvert");
  }

  const mPct = t.match(PCT_RE);
  if (mPct) {
    const pct = parseInt(mPct[1], 10);
    if (pct >= 5 && pct <= 90) {
      amount = Math.max(amount, Math.round(pct * 0.8));
      badges.push(`🔥 ${pct}% OFF`);
    }
  }
  const mRs = t.match(RS_RE);
  if (mRs) {
    const v = parseFloat(mRs[1].replace(",", "."));
    if (!isNaN(v) && v > 0 && v < 500) {
      amount = Math.max(amount, Math.round(v));
      badges.push(`💰 R$${Math.round(v)}`);
    }
  }

  if (amount === 0) amount = 10;
  if (fallbackBadge && !badges.length) badges.push(fallbackBadge);
  // Generic
  if (!badges.includes("💰 Economia") && amount >= 10 && !badges.some((b) => b.includes("R$") || b.includes("OFF"))) {
    badges.unshift("💰 Economia");
  }

  const tier: SavingsResult["tier"] = amount >= 50 ? "alta" : amount >= 25 ? "media" : "baixa";
  return { amount, tier, badges: Array.from(new Set(badges)).slice(0, 3) };
}

export function tierColor(t: SavingsResult["tier"]): string {
  if (t === "alta") return "from-emerald-500/30 to-emerald-500/5 text-emerald-300 border-emerald-500/40";
  if (t === "media") return "from-primary/30 to-primary/5 text-primary border-primary/40";
  return "from-amber-500/25 to-amber-500/5 text-amber-300 border-amber-500/30";
}
