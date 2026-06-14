import { useEffect, useRef, useState } from "react";
import { Sparkles, Download, RefreshCw, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { getStartOfTodaySP, getEndOfTodaySP, formatDateHeader } from "@/lib/dateUtils";
import { toast } from "@/hooks/use-toast";

// ===== Tipos =====
type EventRow = {
  id: string;
  title: string;
  venue_name: string | null;
  date_time: string;
  category: string | null;
  partner_id: string | null;
};

type StoryEvent = EventRow & {
  time_label: string;
  short_title: string;
  featured: boolean;
};

type StoryPage = {
  page: number;
  events: StoryEvent[];
  imageUrl: string;
  caption: string;
};

// ===== Constantes visuais =====
const W = 1080;
const H = 1920;
const PREVIEW_W = 270; // 1/4 do tamanho real

const COLORS = {
  bgDeep: "#0B0613",
  bgMid: "#170926",
  purple: "#8B3DFF",
  purpleLight: "#C86CFF",
  gold: "#F7C948",
  white: "#FFFFFF",
  muted: "rgba(255,255,255,0.65)",
  glass: "rgba(255,255,255,0.06)",
  glassBorder: "rgba(200,108,255,0.25)",
};

const CTAS = [
  "Quem manda a agenda no grupo é amigo de verdade 😎",
  "Marca quem vai sair hoje 👇",
  "Compartilhe este Story com seu grupo 🍻",
  "Salve para não perder nenhum rolê 🔥",
];

// ===== Helpers =====
function pickCta() {
  return CTAS[Math.floor(Math.random() * CTAS.length)];
}

function formatTimeSP(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso)).replace(":", "h");
}

function shortTitle(raw: string): string {
  if (!raw) return "Evento";
  let t = raw.trim();
  // Corta na primeira conjunção/preposição comum tipo "NO", "COM", "EM", "@"
  const cutPattern = /\s+(no|na|nos|nas|com|em|@)\s+/i;
  const m = t.match(cutPattern);
  if (m && m.index && m.index > 6) t = t.slice(0, m.index);
  if (t.length > 30) t = t.slice(0, 28).trimEnd() + "…";
  // Title case leve
  return t
    .toLowerCase()
    .split(/\s+/)
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

  // Fundo escuro com gradiente roxo
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, COLORS.bgDeep);
  bg.addColorStop(0.55, COLORS.bgMid);
  bg.addColorStop(1, "#0B0613");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Brilho neon roxo no topo
  const glowTop = ctx.createRadialGradient(W / 2, -120, 0, W / 2, 200, 900);
  glowTop.addColorStop(0, "rgba(139,61,255,0.55)");
  glowTop.addColorStop(1, "rgba(139,61,255,0)");
  ctx.fillStyle = glowTop;
  ctx.fillRect(0, 0, W, 900);

  // Brilho neon magenta no rodapé
  const glowBottom = ctx.createRadialGradient(W / 2, H + 200, 0, W / 2, H - 200, 900);
  glowBottom.addColorStop(0, "rgba(200,108,255,0.35)");
  glowBottom.addColorStop(1, "rgba(200,108,255,0)");
  ctx.fillStyle = glowBottom;
  ctx.fillRect(0, H - 900, W, 900);

  // ===== Header =====
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.purpleLight;
  ctx.font = "700 36px 'Inter', system-ui, sans-serif";
  ctx.fillText("ROXOU • AGENDA DO DIA", W / 2, 130);

  ctx.fillStyle = COLORS.white;
  ctx.font = "900 78px 'Space Grotesk', 'Inter', sans-serif";
  ctx.fillText("🔥 O QUE ROLA HOJE", W / 2, 240);
  ctx.fillStyle = COLORS.purpleLight;
  ctx.fillText("EM PRUDENTE", W / 2, 330);

  ctx.fillStyle = COLORS.muted;
  ctx.font = "500 38px 'Inter', sans-serif";
  ctx.fillText(subtitle, W / 2, 400);

  // Paginação
  if (totalPages > 1) {
    ctx.fillStyle = COLORS.gold;
    ctx.font = "700 28px 'Inter', sans-serif";
    ctx.fillText(`Parte ${page.page} de ${totalPages}`, W / 2, 450);
  }

  // ===== Lista de eventos (glass cards) =====
  const listTop = 510;
  const listBottom = H - 380;
  const slots = page.events.length;
  const gap = 16;
  const cardH = Math.min(160, Math.floor((listBottom - listTop - gap * (slots - 1)) / Math.max(slots, 1)));
  const cardW = W - 120;
  const cardX = 60;

  page.events.forEach((ev, i) => {
    const y = listTop + i * (cardH + gap);

    // Glass card
    ctx.fillStyle = COLORS.glass;
    roundRect(ctx, cardX, y, cardW, cardH, 28);
    ctx.fill();

    // Borda
    ctx.strokeStyle = ev.featured ? COLORS.gold : COLORS.glassBorder;
    ctx.lineWidth = ev.featured ? 3 : 1.5;
    roundRect(ctx, cardX, y, cardW, cardH, 28);
    ctx.stroke();

    // Pill horário
    const timeText = ev.time_label;
    ctx.font = "800 44px 'Space Grotesk', sans-serif";
    const tw = ctx.measureText(timeText).width;
    const pillW = tw + 56;
    const pillH = 64;
    const pillX = cardX + 28;
    const pillY = y + (cardH - pillH) / 2;
    const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
    pillGrad.addColorStop(0, COLORS.purple);
    pillGrad.addColorStop(1, COLORS.purpleLight);
    ctx.fillStyle = pillGrad;
    roundRect(ctx, pillX, pillY, pillW, pillH, 32);
    ctx.fill();
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(timeText, pillX + pillW / 2, pillY + pillH / 2 + 2);

    // Texto evento
    const textX = pillX + pillW + 26;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = COLORS.white;
    ctx.font = "900 44px 'Space Grotesk', sans-serif";
    const titleMax = cardW - (textX - cardX) - 30;
    let title = ev.short_title;
    while (ctx.measureText(title).width > titleMax && title.length > 4) {
      title = title.slice(0, -2);
    }
    if (title !== ev.short_title) title = title.replace(/…?$/, "…");
    ctx.fillText(title, textX, y + 64);

    ctx.fillStyle = COLORS.muted;
    ctx.font = "500 32px 'Inter', sans-serif";
    const venue = `📍 ${ev.venue_name || "Local a confirmar"}`;
    let venueTxt = venue;
    while (ctx.measureText(venueTxt).width > titleMax && venueTxt.length > 6) {
      venueTxt = venueTxt.slice(0, -2);
    }
    ctx.fillText(venueTxt, textX, y + 110);

    if (ev.featured) {
      ctx.fillStyle = COLORS.gold;
      ctx.font = "800 24px 'Inter', sans-serif";
      ctx.fillText("🏆 PARCEIRO DESTAQUE", textX, y + 144);
    }
  });

  // ===== Rodapé =====
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.white;
  ctx.font = "700 34px 'Inter', sans-serif";
  ctx.fillText("📲 Salve este Story", W / 2, H - 280);
  ctx.fillText("📤 Compartilhe no grupo", W / 2, H - 220);

  // Linha dourada
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 120, H - 170);
  ctx.lineTo(W / 2 + 120, H - 170);
  ctx.stroke();

  ctx.fillStyle = COLORS.gold;
  ctx.font = "900 48px 'Space Grotesk', sans-serif";
  ctx.fillText("🌐 roxou.com.br", W / 2, H - 110);

  ctx.fillStyle = COLORS.purpleLight;
  ctx.font = "600 26px 'Inter', sans-serif";
  ctx.fillText("Agenda atualizada em tempo real", W / 2, H - 60);
}

// ===== Página =====
const StoryAgendaDoDia = () => {
  const [loading, setLoading] = useState(false);
  const [stories, setStories] = useState<StoryPage[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  async function generate() {
    setLoading(true);
    setStories([]);
    try {
      const start = getStartOfTodaySP();
      const end = getEndOfTodaySP();

      const { data: rows, error } = await supabase
        .from("events")
        .select("id, title, venue_name, date_time, category, partner_id")
        .eq("status", "published")
        .gte("date_time", start)
        .lt("date_time", end)
        .order("date_time", { ascending: true });

      if (error) throw error;
      const events = (rows || []) as EventRow[];
      if (events.length === 0) {
        toast({ title: "Sem eventos hoje", description: "Nenhum evento publicado para hoje." });
        setLoading(false);
        return;
      }

      // Parceiros destaque ativos
      const partnerIds = [...new Set(events.map((e) => e.partner_id).filter(Boolean) as string[])];
      let featuredSet = new Set<string>();
      if (partnerIds.length) {
        const { data: awards } = await supabase
          .from("partner_awards")
          .select("partner_id")
          .eq("active", true)
          .in("partner_id", partnerIds);
        featuredSet = new Set((awards || []).map((a: any) => a.partner_id));
      }

      const enriched: StoryEvent[] = events.map((e) => ({
        ...e,
        time_label: formatTimeSP(e.date_time),
        short_title: shortTitle(e.title),
        featured: !!(e.partner_id && featuredSet.has(e.partner_id)),
      }));

      const pages = chunk(enriched, 8);
      const subtitle = formatDateHeader(new Date());

      const built: StoryPage[] = pages.map((evts, idx) => ({
        page: idx + 1,
        events: evts,
        imageUrl: "",
        caption: pickCta(),
      }));
      setStories(built);

      // Renderiza após mount dos canvases
      setTimeout(() => {
        built.forEach((p, i) => {
          const c = canvasRefs.current[i];
          if (!c) return;
          renderStory(c, p, built.length, subtitle);
          const url = c.toDataURL("image/png");
          setStories((prev) => prev.map((s, j) => (j === i ? { ...s, imageUrl: url } : s)));
        });
      }, 50);

      toast({ title: "✨ Stories gerados", description: `${built.length} Story(s) com ${events.length} eventos.` });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro", description: e.message || "Falha ao gerar Stories.", variant: "destructive" });
    } finally {
      setLoading(false);
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
      formatDateHeader(new Date()),
      "",
      ...s.events.map((e) => `${e.time_label} — ${e.short_title} 📍 ${e.venue_name || ""}${e.featured ? " 🏆" : ""}`),
      "",
      s.caption,
      "",
      "📲 Salve este Story • 📤 Compartilhe no grupo",
      "🌐 roxou.com.br",
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
      } else {
        download(idx);
      }
    } catch (e) {
      download(idx);
    }
  }

  useEffect(() => {
    // gera automático no primeiro acesso
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black font-display text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Story Agenda do Dia
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gera automaticamente Stories 1080×1920 da agenda de hoje (até 8 eventos por Story).
          </p>
        </div>
        <Button onClick={generate} disabled={loading} className="gap-2">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Gerando..." : "✨ Gerar Story Agenda do Dia"}
        </Button>
      </div>

      {stories.length === 0 && !loading && (
        <div className="rounded-2xl border border-border/40 bg-card/50 p-10 text-center text-sm text-muted-foreground">
          Nenhum Story gerado ainda. Clique em "Gerar Story Agenda do Dia".
        </div>
      )}

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
              <Button size="sm" variant="default" onClick={() => download(idx)} className="gap-1">
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
    </div>
  );
};

export default StoryAgendaDoDia;
