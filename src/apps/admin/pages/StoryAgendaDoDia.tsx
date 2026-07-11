/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps -- preservado do original (Fase 6B: movimentação física apenas) */
import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Download, RefreshCw, Copy, Check, Trophy, Tv, CheckSquare, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getStartOfTodaySP, getEndOfTodaySP } from "@/lib/dateUtils";
import { toast } from "@/hooks/use-toast";
import { normalizeInstagramHandle } from "@shared/utils/instagramHandle";

// ===================================================================
// STORY GENERATOR ROXOU NEON — 3 modos sobre o mesmo template
// 1) Agenda do Dia
// 2) Onde Assistir o Brasil
// 3) Pós-Jogo
// Todos consomem APENAS dados reais (events / partners / partner_awards / sports_matches).
// Nada é inventado.
// ===================================================================

type Mode = "agenda" | "onde-assistir" | "pos-jogo";

type Item = {
  id: string;
  kind: "event" | "match";
  // exibição
  time_label: string;
  title: string;
  subtitle: string | null;        // local / liga
  instagram: string | null;       // handle do parceiro/local
  // flags visuais
  featured_partner: boolean;      // 👑 DESTAQUE ROXOU
  is_copa: boolean;               // ⚽ COPA
  featured: boolean;              // ⭐ EM DESTAQUE
  is_live_music: boolean;         // 🎤 prefixo
  is_bar: boolean;
  // ordenação / extras
  sort_time: string;
  score_label?: string | null;    // p/ Pós-Jogo
  incomplete: boolean;
};

type StoryPage = {
  page: number;
  events: Item[];
  imageUrl: string;
  caption: string;
};

// ===== Visual =====
const W = 1080;
const H = 1920;
const PREVIEW_W = 270;

const COLORS = {
  bgDeep: "#0B0613",
  bgMid: "#170926",
  purple: "#8B3DFF",
  purpleLight: "#C86CFF",
  gold: "#F7C948",
  goldSoft: "#FFE08A",
  green: "#00D084",
  yellow: "#FFD93D",
  white: "#FFFFFF",
  muted: "rgba(255,255,255,0.65)",
  glass: "rgba(255,255,255,0.06)",
  glassBorder: "rgba(200,108,255,0.25)",
};

const COPA_RE = /(copa|brasil\s*x|brasil\s*vs|fifa|sele[çc][aã]o|jogo\s+do\s+brasil|transmiss[aã]o|ao\s+vivo|world\s*cup)/i;
const LIVE_MUSIC_RE = /(ao\s+vivo|sertanejo|samba|pagode|rock|forr[oó]|mpb|m[uú]sica\s+ao\s+vivo|dj\s|show)/i;
const BAR_RE = /(bar|gastrobar|pub|boteco|cervejaria)/i;
const BRAZIL_RE = /(brasil|brazil)/i;

const WEEKDAY_PT = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
const MONTH_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const MODES: Record<Mode, {
  label: string;
  emoji: string;
  headline: string;
  sub: string;
  ribbon: string;
  caption: string[];
  hashtags: string;
}> = {
  "agenda": {
    label: "Agenda do Dia",
    emoji: "🔥",
    headline: "🔥 O QUE ROLA HOJE?",
    sub: "EM PRESIDENTE PRUDENTE",
    ribbon: "⚽ MÊS DA COPA NA ROXOU  ·  Bares • Festas • Baladas",
    caption: [
      "🔥 O QUE ROLA HOJE EM PRUDENTE?",
      "",
      "Bares, festas, baladas e transmissões da Copa — tudo num lugar só.",
      "",
      "🌐 roxou.com.br",
      "📲 @roxou.pp",
    ],
    hashtags: "#PresidentePrudente #Roxou #AgendaPrudente #OQueRolaHoje #CopaDoMundo",
  },
  "onde-assistir": {
    label: "Onde Assistir o Brasil",
    emoji: "⚽",
    headline: "⚽ ONDE ASSISTIR O BRASIL",
    sub: "EM PRESIDENTE PRUDENTE",
    ribbon: "🇧🇷 COPA DO MUNDO 2026  ·  Transmissões oficiais",
    caption: [
      "⚽ ONDE ASSISTIR O JOGO DO BRASIL EM PRUDENTE",
      "",
      "Bares e parceiros transmitindo a Copa do Mundo 2026.",
      "",
      "🌐 roxou.com.br/copa-do-mundo-2026",
      "📲 @roxou.pp",
    ],
    hashtags: "#CopaDoMundo2026 #Brasil #PresidentePrudente #Roxou #OndeAssistir",
  },
  "pos-jogo": {
    label: "Pós-Jogo",
    emoji: "🏆",
    headline: "🏆 RESULTADOS DA RODADA",
    sub: "COPA DO MUNDO 2026",
    ribbon: "⚽ PÓS-JOGO ROXOU  ·  Próximos rolês na cidade",
    caption: [
      "🏆 PÓS-JOGO — RESULTADOS DA RODADA",
      "",
      "Confira os placares e o que vai rolar em Prudente hoje.",
      "",
      "🌐 roxou.com.br",
      "📲 @roxou.pp",
    ],
    hashtags: "#PosJogo #CopaDoMundo2026 #Resultados #Roxou #PresidentePrudente",
  },
};

// ===== Helpers =====
function formatTimeSP(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso)).replace(":", "h");
}

function formatTodayHeader(): string {
  const now = new Date();
  const sp = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return `${WEEKDAY_PT[sp.getDay()]} • ${sp.getDate()} de ${MONTH_PT[sp.getMonth()]}`;
}

function shortTitle(raw: string, max = 32): string {
  if (!raw) return "Evento";
  let t = raw.trim();
  const m = t.match(/\s+(no|na|nos|nas|com|em|@)\s+/i);
  if (m && m.index && m.index > 6) t = t.slice(0, m.index);
  if (t.length > max) t = t.slice(0, max - 2).trimEnd() + "…";
  return t.toLowerCase().split(/\s+/)
    .map((w) => (w.length <= 2 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ===== Render do Story =====
function renderStory(
  canvas: HTMLCanvasElement,
  page: StoryPage,
  totalPages: number,
  subtitle: string,
  mode: Mode,
  totalSelected: number,
) {
  const meta = MODES[mode];
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Fundo
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, COLORS.bgDeep);
  bg.addColorStop(0.55, COLORS.bgMid);
  bg.addColorStop(1, COLORS.bgDeep);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Glow roxo topo
  const glowTop = ctx.createRadialGradient(W / 2, -120, 0, W / 2, 200, 900);
  glowTop.addColorStop(0, "rgba(139,61,255,0.55)");
  glowTop.addColorStop(1, "rgba(139,61,255,0)");
  ctx.fillStyle = glowTop; ctx.fillRect(0, 0, W, 900);

  // Faixas Copa
  ctx.fillStyle = "rgba(0,208,132,0.10)"; ctx.fillRect(0, 0, 14, H);
  ctx.fillStyle = "rgba(255,217,61,0.10)"; ctx.fillRect(W - 14, 0, 14, H);

  // Confetes neon
  const confettiColors = [COLORS.purpleLight, COLORS.gold, COLORS.green, COLORS.yellow];
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * W;
    const y = Math.random() * 460;
    const s = 4 + Math.random() * 6;
    ctx.fillStyle = confettiColors[i % confettiColors.length];
    ctx.globalAlpha = 0.32 + Math.random() * 0.35;
    ctx.fillRect(x, y, s, s);
  }
  ctx.globalAlpha = 1;

  // Glow bottom
  const glowBottom = ctx.createRadialGradient(W / 2, H + 200, 0, W / 2, H - 200, 900);
  glowBottom.addColorStop(0, "rgba(200,108,255,0.32)");
  glowBottom.addColorStop(1, "rgba(200,108,255,0)");
  ctx.fillStyle = glowBottom; ctx.fillRect(0, H - 900, W, 900);

  // ===== HEADER =====
  ctx.textAlign = "center";

  // ROXOU neon
  ctx.save();
  ctx.shadowColor = COLORS.purple;
  ctx.shadowBlur = 30;
  ctx.fillStyle = COLORS.purpleLight;
  ctx.font = "900 64px 'Space Grotesk', 'Inter', sans-serif";
  ctx.fillText("R O X O U", W / 2, 118);
  ctx.restore();

  ctx.fillStyle = COLORS.muted;
  ctx.font = "700 22px 'Inter', sans-serif";
  ctx.fillText("AGENDA DE HOJE", W / 2, 152);

  // Headline (mais impacto)
  ctx.fillStyle = COLORS.white;
  ctx.font = "900 70px 'Space Grotesk', 'Inter', sans-serif";
  ctx.fillText(meta.headline, W / 2, 232);
  ctx.fillStyle = COLORS.purpleLight;
  ctx.font = "900 52px 'Space Grotesk', 'Inter', sans-serif";
  ctx.fillText(meta.sub, W / 2, 296);

  // Linha de contagem
  ctx.fillStyle = COLORS.goldSoft;
  ctx.font = "700 26px 'Inter', sans-serif";
  const n = totalSelected;
  const countLine = `🍻 ${n} ${n === 1 ? "evento" : "eventos"} para curtir hoje em Prudente`;
  ctx.fillText(countLine, W / 2, 340);

  // Ribbon Copa (verde + dourado)
  ctx.font = "800 22px 'Inter', sans-serif";
  const ribbon = meta.ribbon;
  const rw = ctx.measureText(ribbon).width + 56;
  const rx = (W - rw) / 2;
  const ry = 370;
  ctx.save();
  ctx.shadowColor = COLORS.green; ctx.shadowBlur = 18;
  ctx.fillStyle = "rgba(0,208,132,0.18)";
  roundRect(ctx, rx, ry, rw, 50, 25); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = COLORS.green; ctx.lineWidth = 2;
  roundRect(ctx, rx, ry, rw, 50, 25); ctx.stroke();
  ctx.fillStyle = COLORS.white;
  ctx.textBaseline = "middle";
  ctx.fillText(ribbon, W / 2, ry + 26);
  ctx.textBaseline = "alphabetic";

  // Badge data dourado
  const dateLabel = `📅  ${subtitle}`;
  ctx.font = "800 26px 'Inter', sans-serif";
  const dbw = ctx.measureText(dateLabel).width + 48;
  const dbx = (W - dbw) / 2;
  const dby = ry + 68;
  ctx.fillStyle = "rgba(247,201,72,0.14)";
  roundRect(ctx, dbx, dby, dbw, 50, 25); ctx.fill();
  ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 2;
  roundRect(ctx, dbx, dby, dbw, 50, 25); ctx.stroke();
  ctx.fillStyle = COLORS.gold;
  ctx.textBaseline = "middle";
  ctx.fillText(dateLabel, W / 2, dby + 26);
  ctx.textBaseline = "alphabetic";

  if (totalPages > 1) {
    ctx.fillStyle = COLORS.purpleLight;
    ctx.font = "700 20px 'Inter', sans-serif";
    ctx.fillText(`Parte ${page.page} de ${totalPages}`, W / 2, dby + 78);
  }

  // ===== ÁREA DE CARDS — FOOTER FIXO RESERVADO =====
  const FOOTER_HEIGHT = 360;                  // área reservada para rodapé
  const listTop = 560;
  const listBottom = H - FOOTER_HEIGHT;       // fim absoluto da lista
  const slots = page.events.length;
  const gap = 22;
  const cardH = Math.max(180, Math.min(250, Math.floor((listBottom - listTop - gap * Math.max(slots - 1, 0)) / Math.max(slots, 1))));
  const cardW = W - 100;
  const cardX = 50;

  page.events.forEach((ev, i) => {
    const y = listTop + i * (cardH + gap);

    // Glass background
    ctx.fillStyle = ev.featured_partner ? "rgba(247,201,72,0.10)" : COLORS.glass;
    roundRect(ctx, cardX, y, cardW, cardH, 28); ctx.fill();

    // Bordas/destaques
    if (ev.featured_partner) {
      // Glow dourado premium
      ctx.save();
      ctx.shadowColor = "rgba(247,201,72,0.55)"; ctx.shadowBlur = 60;
      ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 4;
      roundRect(ctx, cardX, y, cardW, cardH, 28); ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.shadowColor = "rgba(247,201,72,0.35)"; ctx.shadowBlur = 25;
      ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 4;
      roundRect(ctx, cardX, y, cardW, cardH, 28); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = COLORS.goldSoft; ctx.lineWidth = 1.5;
      roundRect(ctx, cardX + 6, y + 6, cardW - 12, cardH - 12, 22); ctx.stroke();
    } else if (ev.is_copa) {
      ctx.save();
      ctx.shadowColor = COLORS.green; ctx.shadowBlur = 22;
      ctx.strokeStyle = COLORS.green; ctx.lineWidth = 3;
      roundRect(ctx, cardX, y, cardW, cardH, 28); ctx.stroke();
      ctx.restore();
    } else {
      ctx.strokeStyle = COLORS.glassBorder; ctx.lineWidth = 1.5;
      roundRect(ctx, cardX, y, cardW, cardH, 28); ctx.stroke();
    }

    // Time pill
    const timeText = ev.time_label;
    ctx.font = "800 32px 'Space Grotesk', sans-serif";
    const tw = ctx.measureText(timeText).width;
    const pillW = tw + 38;
    const pillH = 46;
    const pillX = cardX + 22;
    const pillY = y + 22;
    const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
    pillGrad.addColorStop(0, COLORS.purple);
    pillGrad.addColorStop(1, COLORS.purpleLight);
    ctx.save();
    ctx.shadowColor = COLORS.purple; ctx.shadowBlur = 18;
    ctx.fillStyle = pillGrad;
    roundRect(ctx, pillX, pillY, pillW, pillH, 24); ctx.fill();
    ctx.restore();
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(timeText, pillX + pillW / 2, pillY + pillH / 2 + 1);

    // Badges direita (reduzidas)
    let badgeX = cardX + cardW - 22;
    const badgeH = 38;
    const badgeY = pillY + (pillH - badgeH) / 2;
    ctx.textBaseline = "middle"; ctx.textAlign = "right";

    if (ev.featured_partner) {
      ctx.font = "900 15px 'Inter', sans-serif";
      const label = "👑 DESTAQUE ROXOU";
      const bw = Math.min(ctx.measureText(label).width + 20, 230);
      ctx.save();
      ctx.shadowColor = "rgba(247,201,72,0.55)"; ctx.shadowBlur = 18;
      ctx.fillStyle = COLORS.gold;
      roundRect(ctx, badgeX - bw, badgeY, bw, badgeH, 19); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = COLORS.goldSoft; ctx.lineWidth = 1.5;
      roundRect(ctx, badgeX - bw, badgeY, bw, badgeH, 19); ctx.stroke();
      ctx.fillStyle = COLORS.bgDeep;
      ctx.fillText(label, badgeX - 10, badgeY + badgeH / 2 + 1);
      badgeX = badgeX - bw - 8;
    }

    if (ev.is_copa) {
      ctx.font = "900 15px 'Inter', sans-serif";
      // tenta versão completa, senão reduz
      let label = ev.kind === "match" ? "🇧🇷 TRANSMISSÃO DA COPA" : "⚽ COPA DO MUNDO";
      let bw = ctx.measureText(label).width + 18;
      const availableW = badgeX - (pillX + pillW + 12);
      if (bw > availableW) { label = "⚽ COPA DO MUNDO"; bw = ctx.measureText(label).width + 18; }
      if (bw > availableW) { label = "⚽ COPA"; bw = ctx.measureText(label).width + 18; }
      ctx.save();
      ctx.shadowColor = COLORS.green; ctx.shadowBlur = 18;
      ctx.fillStyle = COLORS.green;
      roundRect(ctx, badgeX - bw, badgeY, bw, badgeH, 19); ctx.fill();
      ctx.restore();
      ctx.fillStyle = COLORS.bgDeep;
      ctx.fillText(label, badgeX - 9, badgeY + badgeH / 2 + 1);
      badgeX = badgeX - bw - 8;
    }

    if (ev.featured && !ev.featured_partner) {
      ctx.font = "800 14px 'Inter', sans-serif";
      const label = "⭐ EM DESTAQUE";
      const bw = ctx.measureText(label).width + 18;
      ctx.fillStyle = COLORS.purple;
      roundRect(ctx, badgeX - bw, badgeY, bw, badgeH, 19); ctx.fill();
      ctx.fillStyle = COLORS.white;
      ctx.fillText(label, badgeX - 9, badgeY + badgeH / 2 + 1);
    }

    // Conteúdo textual
    const textX = cardX + 26;
    const baseY = pillY + pillH + 18;
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";

    // Título com prefixo
    let prefix = "";
    if (ev.is_copa || ev.kind === "match") prefix = "⚽ ";
    else if (ev.is_live_music) prefix = "🎤 ";

    ctx.fillStyle = COLORS.white;
    ctx.font = "900 38px 'Space Grotesk', sans-serif";
    const titleMax = cardW - 52;
    const fullTitle = (prefix + ev.title).toUpperCase();
    let title = fullTitle;
    while (ctx.measureText(title).width > titleMax && title.length > 4) title = title.slice(0, -2);
    if (title !== fullTitle) title = title.replace(/…?$/, "…");
    ctx.fillText(title, textX, baseY + 28);

    // Score (Pós-Jogo)
    if (ev.score_label) {
      ctx.fillStyle = COLORS.gold;
      ctx.font = "900 30px 'Space Grotesk', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(ev.score_label, cardX + cardW - 26, baseY + 28);
      ctx.textAlign = "left";
    }

    // Local + Instagram inline na mesma linha
    if (ev.subtitle) {
      const venueLabel = `📍 ${ev.subtitle}`;
      const igLabel = ev.instagram ? `  •  @${ev.instagram}` : "";

      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.font = "500 24px 'Inter', sans-serif";
      let venueTxt = venueLabel;
      // mede IG (menor) para reservar espaço
      ctx.save();
      ctx.font = "600 20px 'Inter', sans-serif";
      const igW = igLabel ? ctx.measureText(igLabel).width : 0;
      ctx.restore();
      while (ctx.measureText(venueTxt).width + igW > titleMax && venueTxt.length > 6) {
        venueTxt = venueTxt.slice(0, -2);
      }
      if (venueTxt !== venueLabel) venueTxt = venueTxt.replace(/…?$/, "…");
      ctx.fillText(venueTxt, textX, baseY + 70);

      if (igLabel) {
        const venueW = ctx.measureText(venueTxt).width;
        ctx.fillStyle = "#D9B3FF";
        ctx.font = "600 20px 'Inter', sans-serif";
        ctx.fillText(igLabel, textX + venueW, baseY + 70);
      }
    } else if (ev.instagram) {
      ctx.fillStyle = "#D9B3FF";
      ctx.font = "600 20px 'Inter', sans-serif";
      ctx.fillText(`@${ev.instagram}`, textX, baseY + 70);
    }
  });

  // ===== RODAPÉ (área fixa, nunca sobrepõe cards) =====
  const footerTop = listBottom + 28;
  ctx.textAlign = "center";

  // Separador dourado
  ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 140, footerTop);
  ctx.lineTo(W / 2 + 140, footerTop);
  ctx.stroke();

  ctx.fillStyle = COLORS.white;
  ctx.font = "800 40px 'Inter', sans-serif";
  ctx.fillText("🌐 roxou.com.br", W / 2, footerTop + 58);

  ctx.fillStyle = COLORS.muted;
  ctx.font = "500 26px 'Inter', sans-serif";
  ctx.fillText("Tudo que rola em Prudente", W / 2, footerTop + 106);
  ctx.fillText("em um único lugar.", W / 2, footerTop + 140);

  ctx.fillStyle = COLORS.purpleLight;
  ctx.font = "800 30px 'Inter', sans-serif";
  ctx.fillText("📲 @roxou.pp", W / 2, footerTop + 196);

  // CTA final
  ctx.save();
  ctx.shadowColor = COLORS.gold; ctx.shadowBlur = 20;
  ctx.fillStyle = COLORS.gold;
  ctx.font = "900 28px 'Inter', sans-serif";
  ctx.fillText("👇 QUEM VAI SAIR HOJE COM VOCÊ?", W / 2, footerTop + 258);
  ctx.restore();
}

// ===================================================================
// Carregadores de dados — APENAS dados reais
// ===================================================================

async function fetchAgendaItems(): Promise<Item[]> {
  const start = getStartOfTodaySP();
  const end = getEndOfTodaySP();
  const { data: rows, error } = await supabase
    .from("events")
    .select("id, title, venue_name, date_time, category, sub_category, partner_id, featured")
    .eq("status", "published")
    .gte("date_time", start).lt("date_time", end)
    .order("date_time", { ascending: true });
  if (error) throw error;
  const evts = rows || [];
  if (!evts.length) return [];

  const partnerIds = [...new Set(evts.map((e: any) => e.partner_id).filter(Boolean))] as string[];
  let featuredSet = new Set<string>();
  const partnerMap = new Map<string, { name: string; instagram: string | null }>();
  if (partnerIds.length) {
    const [{ data: awards }, { data: partners }] = await Promise.all([
      supabase.from("partner_awards").select("partner_id").eq("active", true).in("partner_id", partnerIds),
      supabase.from("partners").select("id, name, instagram, instagram_username").in("id", partnerIds),
    ]);
    featuredSet = new Set((awards || []).map((a: any) => a.partner_id));
    (partners || []).forEach((p: any) => {
      const handle = normalizeInstagramHandle(p.instagram_username || p.instagram || "");
      partnerMap.set(p.id, { name: p.name, instagram: handle || null });
    });
  }

  return evts.map((e: any): Item => {
    const partner = e.partner_id ? partnerMap.get(e.partner_id) : undefined;
    const haystack = `${e.title} ${e.category || ""} ${e.sub_category || ""}`;
    return {
      id: e.id,
      kind: "event",
      time_label: formatTimeSP(e.date_time),
      title: shortTitle(e.title),
      subtitle: e.venue_name || null,
      instagram: partner?.instagram || null,
      featured_partner: !!(e.partner_id && featuredSet.has(e.partner_id)),
      is_copa: COPA_RE.test(haystack),
      featured: !!e.featured,
      is_live_music: LIVE_MUSIC_RE.test(haystack),
      is_bar: BAR_RE.test(`${e.category || ""} ${e.sub_category || ""} ${e.venue_name || ""}`),
      sort_time: e.date_time,
      incomplete: !e.venue_name || !e.date_time || !e.title,
    };
  });
}

async function fetchOndeAssistirItems(): Promise<Item[]> {
  const start = getStartOfTodaySP();
  // Próximos jogos do Brasil (hoje em diante, até 14 dias) — APENAS dados reais
  const horizon = new Date(); horizon.setDate(horizon.getDate() + 14);
  const { data: matches, error } = await supabase
    .from("sports_matches")
    .select("id, slug, home_team, away_team, match_time, league_label, league_name, is_world_cup, venue_name, status")
    .gte("match_time", start)
    .lt("match_time", horizon.toISOString())
    .in("status", ["scheduled", "live"])
    .order("match_time", { ascending: true })
    .limit(20);
  if (error) throw error;

  const brazil = (matches || []).filter((m: any) =>
    BRAZIL_RE.test(m.home_team) || BRAZIL_RE.test(m.away_team) || m.is_world_cup,
  );

  const items: Item[] = brazil.map((m: any) => ({
    id: m.id,
    kind: "match",
    time_label: formatTimeSP(m.match_time),
    title: `${m.home_team} × ${m.away_team}`,
    subtitle: m.league_label || m.league_name || "Copa do Mundo 2026",
    instagram: null,
    featured_partner: false,
    is_copa: true,
    featured: !!m.is_world_cup,
    is_live_music: false,
    is_bar: false,
    sort_time: m.match_time,
    incomplete: !m.home_team || !m.away_team,
  }));

  // Eventos hoje com COPA → bares transmitindo
  const end = getEndOfTodaySP();
  const { data: evRows } = await supabase
    .from("events")
    .select("id, title, venue_name, date_time, category, sub_category, partner_id, featured")
    .eq("status", "published")
    .gte("date_time", start).lt("date_time", end);

  const evts = (evRows || []).filter((e: any) => COPA_RE.test(`${e.title} ${e.category || ""} ${e.sub_category || ""}`));
  const partnerIds = [...new Set(evts.map((e: any) => e.partner_id).filter(Boolean))] as string[];
  const partnerMap = new Map<string, { instagram: string | null }>();
  let featuredSet = new Set<string>();
  if (partnerIds.length) {
    const [{ data: awards }, { data: partners }] = await Promise.all([
      supabase.from("partner_awards").select("partner_id").eq("active", true).in("partner_id", partnerIds),
      supabase.from("partners").select("id, instagram, instagram_username").in("id", partnerIds),
    ]);
    featuredSet = new Set((awards || []).map((a: any) => a.partner_id));
    (partners || []).forEach((p: any) => {
      const handle = normalizeInstagramHandle(p.instagram_username || p.instagram || "");
      partnerMap.set(p.id, { instagram: handle || null });
    });
  }

  evts.forEach((e: any) => {
    const partner = e.partner_id ? partnerMap.get(e.partner_id) : undefined;
    items.push({
      id: e.id,
      kind: "event",
      time_label: formatTimeSP(e.date_time),
      title: shortTitle(e.venue_name || e.title, 30),
      subtitle: e.venue_name || null,
      instagram: partner?.instagram || null,
      featured_partner: !!(e.partner_id && featuredSet.has(e.partner_id)),
      is_copa: true,
      featured: !!e.featured,
      is_live_music: false,
      is_bar: BAR_RE.test(`${e.category || ""} ${e.venue_name || ""}`),
      sort_time: e.date_time,
      incomplete: !e.venue_name,
    });
  });

  return items;
}

async function fetchPosJogoItems(): Promise<Item[]> {
  // Últimos jogos finalizados (3 dias)
  const since = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
  const { data: matches, error } = await supabase
    .from("sports_matches")
    .select("id, home_team, away_team, home_score, away_score, match_time, league_label, league_name, is_world_cup, round_label")
    .eq("status", "finished")
    .gte("match_time", since)
    .order("match_time", { ascending: false })
    .limit(20);
  if (error) throw error;

  return (matches || []).map((m: any): Item => ({
    id: m.id,
    kind: "match",
    time_label: formatTimeSP(m.match_time),
    title: `${m.home_team} × ${m.away_team}`,
    subtitle: m.round_label || m.league_label || m.league_name || "Resultado",
    instagram: null,
    featured_partner: false,
    is_copa: !!m.is_world_cup,
    featured: !!m.is_world_cup,
    is_live_music: false,
    is_bar: false,
    sort_time: m.match_time,
    score_label: (m.home_score != null && m.away_score != null) ? `${m.home_score} – ${m.away_score}` : null,
    incomplete: false,
  }));
}

// ===================================================================
// Página
// ===================================================================
const StoryAgendaDoDia = () => {
  const [mode, setMode] = useState<Mode>("agenda");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [stories, setStories] = useState<StoryPage[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  function sortItems(list: Item[]): Item[] {
    // Ordem: Parceiro destaque → Copa → Em destaque → Música ao vivo → Bares → demais (por hora)
    const rank = (i: Item) => {
      if (i.featured_partner) return 0;
      if (i.is_copa) return 1;
      if (i.featured) return 2;
      if (i.is_live_music) return 3;
      if (i.is_bar) return 4;
      return 5;
    };
    return [...list].sort((a, b) => {
      const ra = rank(a), rb = rank(b);
      if (ra !== rb) return ra - rb;
      return a.sort_time.localeCompare(b.sort_time);
    });
  }

  async function load() {
    setLoading(true);
    setStories([]);
    try {
      let raw: Item[] = [];
      if (mode === "agenda") raw = await fetchAgendaItems();
      else if (mode === "onde-assistir") raw = await fetchOndeAssistirItems();
      else raw = await fetchPosJogoItems();

      if (!raw.length) {
        setItems([]); setSelected(new Set());
        toast({ title: "Sem dados", description: "Nenhum item encontrado para esse gerador." });
        return;
      }

      const sorted = sortItems(raw);
      setItems(sorted);

      // seleção padrão
      const auto = new Set<string>();
      sorted.forEach((i) => {
        if (i.incomplete) return;
        if (mode === "agenda") {
          if (i.featured_partner || i.featured || i.is_copa || i.is_live_music) auto.add(i.id);
        } else {
          auto.add(i.id);
        }
      });
      setSelected(auto);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro", description: e.message || "Falha ao carregar.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [mode]);

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  const selectedItems = useMemo(
    () => items.filter((i) => selected.has(i.id)),
    [items, selected],
  );

  const filters = {
    all: () => setSelected(new Set(items.filter(i => !i.incomplete).map(i => i.id))),
    none: () => setSelected(new Set()),
    featured: () => setSelected(new Set(items.filter(i => i.featured_partner).map(i => i.id))),
    copa: () => setSelected(new Set(items.filter(i => i.is_copa).map(i => i.id))),
    bars: () => setSelected(new Set(items.filter(i => i.is_bar).map(i => i.id))),
    live: () => setSelected(new Set(items.filter(i => i.is_live_music).map(i => i.id))),
    highlighted: () => setSelected(new Set(items.filter(i => i.featured).map(i => i.id))),
  };

  async function generate() {
    if (selectedItems.length === 0) {
      toast({ title: "Selecione pelo menos um item", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const pages = chunk(selectedItems, 5);
      const subtitle = formatTodayHeader();
      const meta = MODES[mode];

      const built: StoryPage[] = pages.map((evts, idx) => ({
        page: idx + 1, events: evts, imageUrl: "",
        caption: [...meta.caption, "", meta.hashtags].join("\n"),
      }));
      setStories(built);

      setTimeout(() => {
        built.forEach((p, i) => {
          const c = canvasRefs.current[i];
          if (!c) return;
          renderStory(c, p, built.length, subtitle, mode, selectedItems.length);
          const url = c.toDataURL("image/png");
          setStories((prev) => prev.map((s, j) => (j === i ? { ...s, imageUrl: url } : s)));
        });
      }, 50);

      toast({ title: "✨ Stories gerados", description: `${built.length} Story(s) com ${selectedItems.length} itens.` });
    } finally {
      setGenerating(false);
    }
  }

  function download(idx: number) {
    const s = stories[idx];
    if (!s?.imageUrl) return;
    const a = document.createElement("a");
    a.href = s.imageUrl;
    a.download = `roxou-story-${mode}-${new Date().toISOString().slice(0, 10)}-p${s.page}.png`;
    a.click();
  }

  async function copyCaption(idx: number) {
    const s = stories[idx];
    if (!s) return;
    await navigator.clipboard.writeText(s.caption);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
    toast({ title: "Legenda copiada" });
  }

  async function share(idx: number) {
    const s = stories[idx];
    if (!s?.imageUrl) return;
    try {
      const blob = await (await fetch(s.imageUrl)).blob();
      const file = new File([blob], `roxou-story-p${s.page}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: s.caption });
      } else { download(idx); }
    } catch { download(idx); }
  }

  const meta = MODES[mode];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black font-display text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Roxou Stories — Geradores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Três geradores, mesmo template Roxou Neon. Apenas dados reais do banco — nada é inventado.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Recarregar
          </Button>
          <Button onClick={generate} disabled={generating || selectedItems.length === 0} className="gap-2">
            <Sparkles className="h-4 w-4" />
            ✨ Gerar Story ({selectedItems.length})
          </Button>
        </div>
      </div>

      {/* Tabs de modo */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-border/40 bg-card/40 p-1">
        {(Object.keys(MODES) as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
              mode === m
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:bg-accent/30"
            }`}
          >
            {MODES[m].emoji} {MODES[m].label}
          </button>
        ))}
      </div>

      <div className="text-xs text-muted-foreground">
        Modo ativo: <strong>{meta.label}</strong> — {meta.headline} · {meta.sub}
      </div>

      {/* Filtros rápidos */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={filters.all}><CheckSquare className="h-3 w-3 mr-1" />Selecionar todos</Button>
        <Button size="sm" variant="ghost" onClick={filters.none}><Square className="h-3 w-3 mr-1" />Limpar</Button>
        {mode === "agenda" && (
          <>
            <Button size="sm" variant="outline" onClick={filters.featured}>👑 Destaque Roxou</Button>
            <Button size="sm" variant="outline" onClick={filters.copa}>⚽ Copa</Button>
            <Button size="sm" variant="outline" onClick={filters.bars}>🍻 Bares</Button>
            <Button size="sm" variant="outline" onClick={filters.live}>🎤 Música ao vivo</Button>
            <Button size="sm" variant="outline" onClick={filters.highlighted}>⭐ Em destaque</Button>
          </>
        )}
      </div>

      {/* Lista de itens */}
      <div className="rounded-2xl border border-border/40 bg-card/50 divide-y divide-border/30">
        {items.length === 0 && !loading && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhum item disponível para este gerador.
          </div>
        )}
        {items.map((e) => {
          const checked = selected.has(e.id);
          return (
            <label
              key={e.id}
              className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/30 transition ${
                e.featured_partner ? "bg-yellow-500/5" : ""
              }`}
            >
              <Checkbox checked={checked} onCheckedChange={() => toggle(e.id)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">{e.time_label}</span>
                  <span className="font-semibold text-foreground truncate">{e.title}</span>
                  {e.score_label && <span className="text-xs font-bold text-yellow-500">{e.score_label}</span>}
                  {e.featured_partner && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-yellow-500">
                      <Trophy className="h-3 w-3" /> Destaque Roxou
                    </span>
                  )}
                  {e.is_copa && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-400">
                      <Tv className="h-3 w-3" /> Copa
                    </span>
                  )}
                  {e.featured && !e.featured_partner && (
                    <span className="text-[10px] font-bold uppercase text-primary">⭐ Em destaque</span>
                  )}
                  {e.is_live_music && (
                    <span className="text-[10px] font-bold uppercase text-purple-300">🎤 Ao vivo</span>
                  )}
                  {e.incomplete && (
                    <span className="text-[10px] font-bold uppercase text-red-400">⚠ Incompleto</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {e.subtitle && <>📍 {e.subtitle}</>}
                  {e.instagram && <> · 📸 @{e.instagram}</>}
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {/* Stories gerados */}
      {stories.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stories.map((s, idx) => (
            <div key={idx} className="rounded-2xl border border-border/40 bg-card/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Story {s.page}/{stories.length}
                </span>
                <span className="text-[10px] text-muted-foreground">{s.events.length} itens</span>
              </div>

              <div className="relative mx-auto overflow-hidden rounded-xl border border-border/40" style={{ width: PREVIEW_W }}>
                <canvas
                  ref={(el) => (canvasRefs.current[idx] = el)}
                  style={{ width: PREVIEW_W, height: PREVIEW_W * (H / W), display: "block" }}
                />
              </div>

              <p className="text-xs text-muted-foreground italic line-clamp-3 whitespace-pre-line">{s.caption}</p>

              <div className="grid grid-cols-3 gap-2">
                <Button size="sm" onClick={() => download(idx)} className="gap-1">
                  <Download className="h-3 w-3" /> PNG
                </Button>
                <Button size="sm" variant="secondary" onClick={() => copyCaption(idx)} className="gap-1">
                  {copiedIdx === idx ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  Legenda
                </Button>
                <Button size="sm" variant="outline" onClick={() => share(idx)} className="gap-1">
                  📤 Share
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StoryAgendaDoDia;
