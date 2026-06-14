import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Download, RefreshCw, Copy, Check, Trophy, Tv, CheckSquare, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getStartOfTodaySP, getEndOfTodaySP, formatDateHeader } from "@/lib/dateUtils";
import { toast } from "@/hooks/use-toast";
import { normalizeInstagramHandle } from "@/lib/instagramHandle";

// ===== Tipos =====
type EventRow = {
  id: string;
  title: string;
  venue_name: string | null;
  date_time: string;
  category: string | null;
  sub_category: string | null;
  partner_id: string | null;
  image_url: string | null;
  featured?: boolean | null;
};

type PartnerInfo = { id: string; name: string; instagram: string | null };

type EnrichedEvent = EventRow & {
  time_label: string;
  short_title: string;
  featured_partner: boolean;
  partner_instagram: string | null;
  is_copa: boolean;
  is_live_music: boolean;
  is_bar: boolean;
  incomplete: boolean;
};

type StoryPage = {
  page: number;
  events: EnrichedEvent[];
  imageUrl: string;
  caption: string;
};

// ===== Constantes visuais =====
const W = 1080;
const H = 1920;
const PREVIEW_W = 270;

const COLORS = {
  bgDeep: "#0B0613",
  bgMid: "#170926",
  purple: "#8B3DFF",
  purpleLight: "#C86CFF",
  gold: "#F7C948",
  green: "#00D084",
  yellow: "#FFD93D",
  white: "#FFFFFF",
  muted: "rgba(255,255,255,0.65)",
  glass: "rgba(255,255,255,0.06)",
  glassBorder: "rgba(200,108,255,0.25)",
};

const CTAS = [
  "👇 Marca quem vai sair hoje",
  "🍻 Qual vai ser seu rolê hoje?",
  "⚽ Vai assistir o jogo onde?",
  "🔥 Confira a agenda completa na Roxou",
];

const COPA_RE = /(copa|brasil\s*x|brasil\s*vs|fifa|sele[çc][aã]o|jogo\s+do\s+brasil|transmiss[aã]o|ao\s+vivo|world\s*cup)/i;
const LIVE_MUSIC_RE = /(ao\s+vivo|sertanejo|samba|pagode|rock|forr[oó]|mpb|m[uú]sica\s+ao\s+vivo|dj\s|show)/i;
const BAR_RE = /(bar|gastrobar|pub|boteco|cervejaria)/i;

const WEEKDAY_PT = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
const MONTH_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

// ===== Helpers =====
function pickCta() { return CTAS[Math.floor(Math.random() * CTAS.length)]; }

function formatTimeSP(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso)).replace(":", "h");
}

function formatTodayHeader(): string {
  const now = new Date();
  const sp = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return `${WEEKDAY_PT[sp.getDay()]}, ${sp.getDate()} de ${MONTH_PT[sp.getMonth()]}`;
}

function shortTitle(raw: string): string {
  if (!raw) return "Evento";
  let t = raw.trim();
  const cutPattern = /\s+(no|na|nos|nas|com|em|@)\s+/i;
  const m = t.match(cutPattern);
  if (m && m.index && m.index > 6) t = t.slice(0, m.index);
  if (t.length > 32) t = t.slice(0, 30).trimEnd() + "…";
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
function renderStory(canvas: HTMLCanvasElement, page: StoryPage, totalPages: number, subtitle: string) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Fundo gradiente
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
  ctx.fillStyle = glowTop;
  ctx.fillRect(0, 0, W, 900);

  // Faixa verde/amarelo discreta (Copa) — laterais finas
  ctx.fillStyle = "rgba(0,208,132,0.08)";
  ctx.fillRect(0, 0, 14, H);
  ctx.fillStyle = "rgba(255,217,61,0.08)";
  ctx.fillRect(W - 14, 0, 14, H);

  // Confetes neon decorativos
  const confettiColors = [COLORS.purpleLight, COLORS.gold, COLORS.green, COLORS.yellow];
  for (let i = 0; i < 28; i++) {
    const x = Math.random() * W;
    const y = Math.random() * 460;
    const s = 4 + Math.random() * 6;
    ctx.fillStyle = confettiColors[i % confettiColors.length];
    ctx.globalAlpha = 0.35 + Math.random() * 0.35;
    ctx.fillRect(x, y, s, s);
  }
  ctx.globalAlpha = 1;

  // Bola estilizada (Copa) — círculo no canto
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.arc(W - 110, 180, 70, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.white;
  ctx.fill();
  ctx.strokeStyle = COLORS.bgDeep;
  ctx.lineWidth = 4;
  for (let a = 0; a < 6; a++) {
    ctx.beginPath();
    const ang = (a * Math.PI) / 3;
    ctx.moveTo(W - 110, 180);
    ctx.lineTo(W - 110 + Math.cos(ang) * 65, 180 + Math.sin(ang) * 65);
    ctx.stroke();
  }
  ctx.restore();

  // Glow bottom
  const glowBottom = ctx.createRadialGradient(W / 2, H + 200, 0, W / 2, H - 200, 900);
  glowBottom.addColorStop(0, "rgba(200,108,255,0.32)");
  glowBottom.addColorStop(1, "rgba(200,108,255,0)");
  ctx.fillStyle = glowBottom;
  ctx.fillRect(0, H - 900, W, 900);

  // ===== Header =====
  ctx.textAlign = "center";

  // Logo ROXOU com glow neon
  ctx.save();
  ctx.shadowColor = COLORS.purple;
  ctx.shadowBlur = 30;
  ctx.fillStyle = COLORS.purpleLight;
  ctx.font = "900 58px 'Space Grotesk', 'Inter', sans-serif";
  ctx.fillText("R O X O U", W / 2, 130);
  ctx.restore();

  ctx.fillStyle = COLORS.muted;
  ctx.font = "700 24px 'Inter', sans-serif";
  ctx.fillText("AGENDA DE HOJE", W / 2, 172);

  ctx.fillStyle = COLORS.white;
  ctx.font = "900 70px 'Space Grotesk', 'Inter', sans-serif";
  ctx.fillText("🔥 O QUE ROLA HOJE?", W / 2, 258);
  ctx.fillStyle = COLORS.purpleLight;
  ctx.font = "900 52px 'Space Grotesk', 'Inter', sans-serif";
  ctx.fillText("EM PRESIDENTE PRUDENTE", W / 2, 320);

  ctx.fillStyle = COLORS.muted;
  ctx.font = "500 26px 'Inter', sans-serif";
  ctx.fillText("Bares • Festas • Baladas • Copa do Mundo", W / 2, 366);

  // Badge data dourado
  const dateLabel = `📅  ${subtitle}`;
  ctx.font = "800 28px 'Inter', sans-serif";
  const dbw = ctx.measureText(dateLabel).width + 52;
  const dbx = (W - dbw) / 2;
  const dby = 394;
  ctx.fillStyle = "rgba(247,201,72,0.14)";
  roundRect(ctx, dbx, dby, dbw, 56, 28);
  ctx.fill();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  roundRect(ctx, dbx, dby, dbw, 56, 28);
  ctx.stroke();
  ctx.fillStyle = COLORS.gold;
  ctx.textBaseline = "middle";
  ctx.fillText(dateLabel, W / 2, dby + 30);
  ctx.textBaseline = "alphabetic";

  if (totalPages > 1) {
    ctx.fillStyle = COLORS.purpleLight;
    ctx.font = "700 22px 'Inter', sans-serif";
    ctx.fillText(`Parte ${page.page} de ${totalPages}`, W / 2, dby + 92);
  }

  // ===== Cards =====
  const listTop = 510;
  const listBottom = H - 320;
  const slots = page.events.length;
  const gap = 20;
  const cardH = Math.min(210, Math.floor((listBottom - listTop - gap * (slots - 1)) / Math.max(slots, 1)));
  const cardW = W - 100;
  const cardX = 50;

  page.events.forEach((ev, i) => {
    const y = listTop + i * (cardH + gap);

    // Glass card
    ctx.fillStyle = ev.featured_partner ? "rgba(247,201,72,0.10)" : COLORS.glass;
    roundRect(ctx, cardX, y, cardW, cardH, 28);
    ctx.fill();

    if (ev.featured_partner) {
      ctx.save();
      ctx.shadowColor = COLORS.gold;
      ctx.shadowBlur = 32;
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 4;
      roundRect(ctx, cardX, y, cardW, cardH, 28);
      ctx.stroke();
      ctx.restore();
    } else if (ev.is_copa) {
      ctx.save();
      ctx.shadowColor = COLORS.green;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = COLORS.green;
      ctx.lineWidth = 3;
      roundRect(ctx, cardX, y, cardW, cardH, 28);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.strokeStyle = COLORS.glassBorder;
      ctx.lineWidth = 1.5;
      roundRect(ctx, cardX, y, cardW, cardH, 28);
      ctx.stroke();
    }

    // Pill horário (roxo neon)
    const timeText = ev.time_label;
    ctx.font = "800 36px 'Space Grotesk', sans-serif";
    const tw = ctx.measureText(timeText).width;
    const pillW = tw + 44;
    const pillH = 54;
    const pillX = cardX + 22;
    const pillY = y + 22;
    const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
    pillGrad.addColorStop(0, COLORS.purple);
    pillGrad.addColorStop(1, COLORS.purpleLight);
    ctx.save();
    ctx.shadowColor = COLORS.purple;
    ctx.shadowBlur = 18;
    ctx.fillStyle = pillGrad;
    roundRect(ctx, pillX, pillY, pillW, pillH, 28);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(timeText, pillX + pillW / 2, pillY + pillH / 2 + 2);

    // Badges direita
    let badgeX = cardX + cardW - 22;
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    if (ev.featured_partner) {
      ctx.font = "800 22px 'Inter', sans-serif";
      const label = "🏆 DESTAQUE DO MÊS";
      const bw = ctx.measureText(label).width + 28;
      ctx.save();
      ctx.shadowColor = COLORS.gold;
      ctx.shadowBlur = 20;
      ctx.fillStyle = COLORS.gold;
      roundRect(ctx, badgeX - bw, pillY, bw, pillH, 26);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, badgeX - bw, pillY, bw, pillH, 26);
      ctx.stroke();
      ctx.fillStyle = COLORS.bgDeep;
      ctx.fillText(label, badgeX - 14, pillY + pillH / 2);
      badgeX = badgeX - bw - 10;
    }
    if (ev.is_copa) {
      ctx.font = "800 20px 'Inter', sans-serif";
      const label = "⚽ COPA";
      const bw = ctx.measureText(label).width + 24;
      ctx.fillStyle = COLORS.green;
      roundRect(ctx, badgeX - bw, pillY, bw, pillH, 26);
      ctx.fill();
      ctx.fillStyle = COLORS.bgDeep;
      ctx.fillText(label, badgeX - 12, pillY + pillH / 2);
      badgeX = badgeX - bw - 10;
    }
    if (ev.featured && !ev.featured_partner) {
      ctx.font = "800 20px 'Inter', sans-serif";
      const label = "⭐ EM DESTAQUE";
      const bw = ctx.measureText(label).width + 24;
      ctx.fillStyle = COLORS.purple;
      roundRect(ctx, badgeX - bw, pillY, bw, pillH, 26);
      ctx.fill();
      ctx.fillStyle = COLORS.white;
      ctx.fillText(label, badgeX - 12, pillY + pillH / 2);
    }

    // Textos
    const textX = cardX + 26;
    const textY = pillY + pillH + 14;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    // Título com prefixo contextual (🎤 música ao vivo, ⚽ copa)
    let prefix = "";
    if (ev.is_copa) prefix = "⚽ ";
    else if (ev.is_live_music) prefix = "🎤 ";

    ctx.fillStyle = COLORS.white;
    ctx.font = "900 42px 'Space Grotesk', sans-serif";
    const titleMax = cardW - 52;
    const fullTitle = (prefix + ev.short_title).toUpperCase();
    let title = fullTitle;
    while (ctx.measureText(title).width > titleMax && title.length > 4) title = title.slice(0, -2);
    if (title !== fullTitle) title = title.replace(/…?$/, "…");
    ctx.fillText(title, textX, textY + 32);

    // Local — cinza claro
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = "500 26px 'Inter', sans-serif";
    const venue = `📍 ${ev.venue_name || "Local a confirmar"}`;
    let venueTxt = venue;
    while (ctx.measureText(venueTxt).width > titleMax && venueTxt.length > 6) venueTxt = venueTxt.slice(0, -2);
    ctx.fillText(venueTxt, textX, textY + 72);

    // Instagram (somente se existir, sem 📸)
    if (ev.partner_instagram) {
      ctx.fillStyle = COLORS.purpleLight;
      ctx.font = "700 22px 'Inter', sans-serif";
      ctx.fillText(`@${ev.partner_instagram}`, textX, textY + 108);
    }
  });

  // ===== Rodapé =====
  ctx.textAlign = "center";

  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 140, H - 230);
  ctx.lineTo(W / 2 + 140, H - 230);
  ctx.stroke();

  ctx.fillStyle = COLORS.white;
  ctx.font = "800 38px 'Inter', sans-serif";
  ctx.fillText("🌐 roxou.com.br", W / 2, H - 178);

  ctx.fillStyle = COLORS.muted;
  ctx.font = "500 26px 'Inter', sans-serif";
  ctx.fillText("Tudo que rola em Prudente", W / 2, H - 128);
  ctx.fillText("em um único lugar.", W / 2, H - 94);

  ctx.save();
  ctx.shadowColor = COLORS.purple;
  ctx.shadowBlur = 22;
  ctx.fillStyle = COLORS.gold;
  ctx.font = "900 42px 'Space Grotesk', sans-serif";
  ctx.fillText("R O X O U", W / 2, H - 44);
  ctx.restore();

  ctx.fillStyle = COLORS.purpleLight;
  ctx.font = "700 24px 'Inter', sans-serif";
  ctx.fillText("@roxou.pp", W / 2, H - 14);
}

// ===== Página =====
const StoryAgendaDoDia = () => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [events, setEvents] = useState<EnrichedEvent[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [stories, setStories] = useState<StoryPage[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  async function loadEvents() {
    setLoading(true);
    setStories([]);
    try {
      const start = getStartOfTodaySP();
      const end = getEndOfTodaySP();

      const { data: rows, error } = await supabase
        .from("events")
        .select("id, title, venue_name, date_time, category, sub_category, partner_id, image_url, featured")
        .eq("status", "published")
        .gte("date_time", start)
        .lt("date_time", end)
        .order("date_time", { ascending: true });

      if (error) throw error;
      const evts = (rows || []) as EventRow[];
      if (evts.length === 0) {
        setEvents([]);
        toast({ title: "Sem eventos hoje", description: "Nenhum evento publicado para hoje." });
        return;
      }

      const partnerIds = [...new Set(evts.map((e) => e.partner_id).filter(Boolean) as string[])];
      let featuredSet = new Set<string>();
      const partnerMap = new Map<string, PartnerInfo>();
      if (partnerIds.length) {
        const [{ data: awards }, { data: partners }] = await Promise.all([
          supabase.from("partner_awards").select("partner_id").eq("active", true).in("partner_id", partnerIds),
          supabase.from("partners").select("id, name, instagram, instagram_username").in("id", partnerIds),
        ]);
        featuredSet = new Set((awards || []).map((a: any) => a.partner_id));
        (partners || []).forEach((p: any) => {
          const handle = normalizeInstagramHandle(p.instagram_username || p.instagram || "");
          partnerMap.set(p.id, { id: p.id, name: p.name, instagram: handle || null });
        });
      }

      const enriched: EnrichedEvent[] = evts.map((e) => {
        const partner = e.partner_id ? partnerMap.get(e.partner_id) : undefined;
        const haystack = `${e.title} ${e.category || ""} ${e.sub_category || ""}`;
        return {
          ...e,
          time_label: formatTimeSP(e.date_time),
          short_title: shortTitle(e.title),
          featured_partner: !!(e.partner_id && featuredSet.has(e.partner_id)),
          partner_instagram: partner?.instagram || null,
          is_copa: COPA_RE.test(haystack),
          is_live_music: LIVE_MUSIC_RE.test(haystack),
          is_bar: BAR_RE.test(`${e.category || ""} ${e.sub_category || ""} ${e.venue_name || ""}`),
          incomplete: !e.venue_name || !e.date_time || !e.title,
        };
      });

      // ordenação: destaque primeiro, depois copa, depois hora
      enriched.sort((a, b) => {
        if (a.featured_partner !== b.featured_partner) return a.featured_partner ? -1 : 1;
        if (a.is_copa !== b.is_copa) return a.is_copa ? -1 : 1;
        return a.date_time.localeCompare(b.date_time);
      });

      setEvents(enriched);

      // seleção padrão
      const auto = new Set<string>();
      enriched.forEach((e) => {
        if (e.incomplete) return;
        if (e.featured_partner || e.featured || e.is_copa || e.is_live_music) auto.add(e.id);
      });
      setSelected(auto);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro", description: e.message || "Falha ao carregar eventos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadEvents(); }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function selectAll() { setSelected(new Set(events.filter(e => !e.incomplete).map(e => e.id))); }
  function clearAll() { setSelected(new Set()); }
  function onlyFeatured() { setSelected(new Set(events.filter(e => e.featured_partner).map(e => e.id))); }
  function onlyCopa() { setSelected(new Set(events.filter(e => e.is_copa).map(e => e.id))); }
  function onlyBars() { setSelected(new Set(events.filter(e => e.is_bar).map(e => e.id))); }
  function onlyLive() { setSelected(new Set(events.filter(e => e.is_live_music).map(e => e.id))); }
  function onlyHighlighted() { setSelected(new Set(events.filter(e => e.featured).map(e => e.id))); }

  const selectedEvents = useMemo(
    () => events.filter((e) => selected.has(e.id)),
    [events, selected]
  );

  async function generate() {
    if (selectedEvents.length === 0) {
      toast({ title: "Selecione pelo menos um evento", description: "Marque os eventos que entrarão na arte.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const pages = chunk(selectedEvents, 8);
      const subtitle = formatTodayHeader();

      const built: StoryPage[] = pages.map((evts, idx) => ({
        page: idx + 1, events: evts, imageUrl: "", caption: pickCta(),
      }));
      setStories(built);

      setTimeout(() => {
        built.forEach((p, i) => {
          const c = canvasRefs.current[i];
          if (!c) return;
          renderStory(c, p, built.length, subtitle);
          const url = c.toDataURL("image/png");
          setStories((prev) => prev.map((s, j) => (j === i ? { ...s, imageUrl: url } : s)));
        });
      }, 50);

      toast({ title: "✨ Stories gerados", description: `${built.length} Story(s) com ${selectedEvents.length} eventos.` });
    } finally {
      setGenerating(false);
    }
  }

  function download(idx: number) {
    const s = stories[idx];
    if (!s?.imageUrl) return;
    const a = document.createElement("a");
    a.href = s.imageUrl;
    a.download = `roxou-story-agenda-${new Date().toISOString().slice(0, 10)}-p${s.page}.png`;
    a.click();
  }

  async function copyCaption(idx: number) {
    const s = stories[idx];
    if (!s) return;
    const lines = [
      "🔥 O QUE ROLA HOJE EM PRUDENTE",
      formatTodayHeader(),
      "",
      ...s.events.map((e) => `${e.time_label} — ${e.short_title} 📍 ${e.venue_name || ""}${e.partner_instagram ? ` 📸 @${e.partner_instagram}` : ""}${e.featured_partner ? " 🏆" : ""}${e.is_copa ? " ⚽" : ""}`),
      "",
      s.caption,
      "",
      "🌐 Acesse: roxou.com.br",
      "Fique por dentro de tudo que rola em Prudente em um único lugar.",
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black font-display text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Story Agenda do Dia
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione os eventos de hoje e gere os Stories 1080×1920 (até 8 por Story).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadEvents} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Recarregar
          </Button>
          <Button onClick={generate} disabled={generating || selectedEvents.length === 0} className="gap-2">
            <Sparkles className="h-4 w-4" />
            ✨ Gerar Story do Dia ({selectedEvents.length})
          </Button>
        </div>
      </div>

      {/* Filtros rápidos */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={selectAll}><CheckSquare className="h-3 w-3 mr-1" />Selecionar todos</Button>
        <Button size="sm" variant="ghost" onClick={clearAll}><Square className="h-3 w-3 mr-1" />Limpar</Button>
        <Button size="sm" variant="outline" onClick={onlyFeatured}>🏆 Parceiros destaque</Button>
        <Button size="sm" variant="outline" onClick={onlyCopa}>⚽ Copa</Button>
        <Button size="sm" variant="outline" onClick={onlyBars}>🍻 Bares</Button>
        <Button size="sm" variant="outline" onClick={onlyLive}>🎤 Música ao vivo</Button>
        <Button size="sm" variant="outline" onClick={onlyHighlighted}>⭐ Em destaque</Button>
      </div>

      {/* Lista de eventos */}
      <div className="rounded-2xl border border-border/40 bg-card/50 divide-y divide-border/30">
        {events.length === 0 && !loading && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhum evento publicado para hoje.
          </div>
        )}
        {events.map((e) => {
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
                  <span className="font-semibold text-foreground truncate">{e.short_title}</span>
                  {e.featured_partner && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-yellow-500">
                      <Trophy className="h-3 w-3" /> Parceiro Destaque Roxou
                    </span>
                  )}
                  {e.is_copa && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-400">
                      <Tv className="h-3 w-3" /> Copa
                    </span>
                  )}
                  {e.featured && (
                    <span className="text-[10px] font-bold uppercase text-primary">⭐ Em destaque</span>
                  )}
                  {e.incomplete && (
                    <span className="text-[10px] font-bold uppercase text-red-400">⚠ Incompleto</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  📍 {e.venue_name || "—"}
                  {e.partner_instagram && <> · 📸 @{e.partner_instagram}</>}
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
                <span className="text-[10px] text-muted-foreground">{s.events.length} eventos</span>
              </div>

              <div className="relative mx-auto overflow-hidden rounded-xl border border-border/40" style={{ width: PREVIEW_W }}>
                <canvas
                  ref={(el) => (canvasRefs.current[idx] = el)}
                  style={{ width: PREVIEW_W, height: PREVIEW_W * (H / W), display: "block" }}
                />
              </div>

              <p className="text-xs text-muted-foreground italic line-clamp-2">"{s.caption}"</p>

              <div className="grid grid-cols-3 gap-2">
                <Button size="sm" onClick={() => download(idx)} className="gap-1">
                  <Download className="h-3 w-3" /> PNG
                </Button>
                <Button size="sm" variant="secondary" onClick={() => copyCaption(idx)} className="gap-1">
                  {copiedIdx === idx ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  CTA
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
