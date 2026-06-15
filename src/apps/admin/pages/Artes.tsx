import { useEffect, useMemo, useRef, useState } from "react";
import { Trophy, Download, ImageIcon } from "lucide-react";
import { useAwardsByType, formatAwardPeriod, type AwardWithPartner } from "@/hooks/usePartnerAwards";
import { Button } from "@/components/ui/button";

type FormatKey = "story" | "feed" | "thumb";

const FORMATS: Record<FormatKey, { label: string; w: number; h: number; preview: number }> = {
  story: { label: "Story 1080×1920", w: 1080, h: 1920, preview: 360 },
  feed:  { label: "Feed 1080×1350",  w: 1080, h: 1350, preview: 360 },
  thumb: { label: "Thumb 1200×630",  w: 1200, h: 630,  preview: 480 },
};

const AWARD_TYPES = [
  { value: "melhor_bar_mes", label: "Melhor Bar do Mês" },
];

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
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

async function renderAward(
  canvas: HTMLCanvasElement,
  award: AwardWithPartner,
  format: FormatKey,
) {
  const { w, h } = FORMATS[format];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Background — deep purple radial gradient + neon glow
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.35, w * 0.1, w * 0.5, h * 0.5, w * 0.9);
  bg.addColorStop(0, "#3a1466");
  bg.addColorStop(0.55, "#170629");
  bg.addColorStop(1, "#08010f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Magenta glow
  const glow = ctx.createRadialGradient(w * 0.85, h * 0.15, 0, w * 0.85, h * 0.15, w * 0.7);
  glow.addColorStop(0, "rgba(217, 70, 239, 0.45)");
  glow.addColorStop(1, "rgba(217, 70, 239, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const cyan = ctx.createRadialGradient(w * 0.1, h * 0.95, 0, w * 0.1, h * 0.95, w * 0.6);
  cyan.addColorStop(0, "rgba(56, 189, 248, 0.25)");
  cyan.addColorStop(1, "rgba(56, 189, 248, 0)");
  ctx.fillStyle = cyan;
  ctx.fillRect(0, 0, w, h);

  // Layout scale factor (use width as base)
  const s = w / 1080;
  const cx = w / 2;

  // Top brand
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `700 ${28 * s}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.letterSpacing = "0.3em";
  ctx.fillText("ROXOU · CURADORIA", cx, 90 * s);

  // Gold badge "🏆 MELHOR BAR DO MÊS"
  const badgeY = format === "thumb" ? 110 * s : 200 * s;
  const badgeText = "🏆  MELHOR BAR DO MÊS";
  ctx.font = `800 ${format === "thumb" ? 34 * s : 42 * s}px Inter, system-ui, sans-serif`;
  const badgeW = ctx.measureText(badgeText).width + 70 * s;
  const badgeH = (format === "thumb" ? 70 : 84) * s;
  const badgeX = cx - badgeW / 2;
  const gradBadge = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH);
  gradBadge.addColorStop(0, "#fde68a");
  gradBadge.addColorStop(0.5, "#f59e0b");
  gradBadge.addColorStop(1, "#b45309");
  ctx.fillStyle = gradBadge;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
  ctx.shadowColor = "rgba(251,191,36,0.55)";
  ctx.shadowBlur = 40 * s;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#1a0a00";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, cx, badgeY + badgeH / 2 + 2 * s);
  ctx.textBaseline = "alphabetic";

  // Period
  const periodY = badgeY + badgeH + (format === "thumb" ? 60 : 110) * s;
  ctx.fillStyle = "#fcd34d";
  ctx.font = `700 ${(format === "thumb" ? 28 : 38) * s}px Inter, system-ui, sans-serif`;
  ctx.fillText(formatAwardPeriod(award.month, award.year).toUpperCase(), cx, periodY);

  // Partner logo (circle)
  const logoUrl = award.image_url || award.partner?.logo_url || "";
  const logo = await loadImage(logoUrl);
  const logoSize = (format === "thumb" ? 180 : 320) * s;
  const logoY = periodY + (format === "thumb" ? 30 : 60) * s;
  ctx.save();
  // golden ring
  ctx.beginPath();
  ctx.arc(cx, logoY + logoSize / 2, logoSize / 2 + 10 * s, 0, Math.PI * 2);
  ctx.fillStyle = "#f59e0b";
  ctx.shadowColor = "rgba(251,191,36,0.65)";
  ctx.shadowBlur = 60 * s;
  ctx.fill();
  ctx.shadowBlur = 0;
  // clip circle
  ctx.beginPath();
  ctx.arc(cx, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (logo) {
    // cover crop
    const ratio = Math.max(logoSize / logo.width, logoSize / logo.height);
    const lw = logo.width * ratio;
    const lh = logo.height * ratio;
    ctx.drawImage(logo, cx - lw / 2, logoY + logoSize / 2 - lh / 2, lw, lh);
  } else {
    ctx.fillStyle = "#3a1466";
    ctx.fillRect(cx - logoSize / 2, logoY, logoSize, logoSize);
    ctx.fillStyle = "#fff";
    ctx.font = `900 ${logoSize * 0.5}px Inter, system-ui, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(award.partner?.name?.[0]?.toUpperCase() || "?", cx, logoY + logoSize / 2);
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();

  // Partner name
  const nameY = logoY + logoSize + (format === "thumb" ? 70 : 130) * s;
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${(format === "thumb" ? 64 : 96) * s}px "Space Grotesk", Inter, system-ui, sans-serif`;
  const name = (award.partner?.name || award.title).toUpperCase();
  // shrink if too wide
  let nameSize = (format === "thumb" ? 64 : 96) * s;
  while (nameSize > 28 * s) {
    ctx.font = `900 ${nameSize}px "Space Grotesk", Inter, system-ui, sans-serif`;
    if (ctx.measureText(name).width <= w - 120 * s) break;
    nameSize -= 4 * s;
  }
  ctx.shadowColor = "rgba(217,70,239,0.5)";
  ctx.shadowBlur = 30 * s;
  ctx.fillText(name, cx, nameY);
  ctx.shadowBlur = 0;

  // Subtitle
  const subY = nameY + (format === "thumb" ? 50 : 80) * s;
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = `500 italic ${(format === "thumb" ? 26 : 34) * s}px Inter, system-ui, sans-serif`;
  ctx.fillText("Eleito pela curadoria Roxou", cx, subY);

  // CTA + URL bottom
  if (format !== "thumb") {
    const ctaY = h - 200 * s;
    // CTA pill
    const ctaText = "VEJA NA ROXOU";
    ctx.font = `800 ${42 * s}px Inter, system-ui, sans-serif`;
    const ctaW = ctx.measureText(ctaText).width + 90 * s;
    const ctaH = 96 * s;
    const ctaX = cx - ctaW / 2;
    const gradCta = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY + ctaH);
    gradCta.addColorStop(0, "#d946ef");
    gradCta.addColorStop(1, "#a855f7");
    ctx.fillStyle = gradCta;
    roundRect(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
    ctx.shadowColor = "rgba(217,70,239,0.6)";
    ctx.shadowBlur = 50 * s;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText(ctaText, cx, ctaY + ctaH / 2 + 2 * s);
    ctx.textBaseline = "alphabetic";

    // URL
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `700 ${30 * s}px Inter, system-ui, sans-serif`;
    ctx.fillText("roxou.com.br/bar-do-mes", cx, h - 70 * s);
  } else {
    // Thumb: right-aligned CTA + URL
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = `800 ${24 * s}px Inter, system-ui, sans-serif`;
    ctx.fillText("VEJA NA ROXOU · roxou.com.br/bar-do-mes", cx, h - 40 * s);
  }
}

export default function Artes() {
  const { awards, loading } = useAwardsByType("melhor_bar_mes");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [format, setFormat] = useState<FormatKey>("story");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(false);

  const selected = useMemo(
    () => awards.find((a) => a.id === selectedId) || awards[0] || null,
    [awards, selectedId],
  );

  useEffect(() => {
    if (!selected || !canvasRef.current) return;
    setRendering(true);
    renderAward(canvasRef.current, selected, format).finally(() => setRendering(false));
  }, [selected, format]);

  const download = () => {
    if (!canvasRef.current || !selected) return;
    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const slug = (selected.partner?.name || selected.title)
        .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
      a.href = url;
      a.download = `roxou-${format}-${slug}-${selected.month}-${selected.year}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const fmt = FORMATS[format];
  const aspect = fmt.h / fmt.w;
  const previewW = fmt.preview;
  const previewH = previewW * aspect;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto pb-24">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-amber-400 mb-1">
          <Trophy className="w-5 h-5" />
          <p className="text-[11px] font-extrabold uppercase tracking-widest">Gerador de Artes Roxou</p>
        </div>
        <h1 className="font-display font-black text-2xl md:text-3xl">Premiações · Story / Feed / Thumb</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gere artes prontas das premiações Roxou para Instagram e compartilhamento.
        </p>
      </header>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="space-y-5">
          <section>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Tipo de premiação
            </p>
            <div className="rounded-xl border border-border/40 bg-card/40 px-3 py-2 text-sm">
              {AWARD_TYPES[0].label}
            </div>
          </section>

          <section>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Premiação
            </p>
            {loading ? (
              <p className="text-xs text-muted-foreground">Carregando…</p>
            ) : awards.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma premiação cadastrada. Vá em <span className="text-primary">/admin/premiacoes</span>.
              </p>
            ) : (
              <div className="space-y-2">
                {awards.map((a) => {
                  const isSel = (selected?.id || awards[0]?.id) === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelectedId(a.id)}
                      className={`w-full text-left rounded-xl border px-3 py-2 transition ${
                        isSel
                          ? "border-amber-400/60 bg-amber-400/10"
                          : "border-border/40 bg-card/40 hover:border-primary/40"
                      }`}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                        {formatAwardPeriod(a.month, a.year)}
                      </p>
                      <p className="text-sm font-bold text-foreground truncate">
                        {a.partner?.name || a.title}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Formato
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(FORMATS) as FormatKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setFormat(k)}
                  className={`rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-wider border transition ${
                    format === k
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/40 bg-card/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">{fmt.label}</p>
          </section>

          <Button
            onClick={download}
            disabled={!selected || rendering}
            className="w-full gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold"
          >
            <Download className="w-4 h-4" />
            Baixar PNG
          </Button>
        </aside>

        {/* Preview */}
        <main className="flex flex-col items-center justify-start">
          <div
            className="rounded-2xl border border-border/40 bg-black/50 shadow-[0_30px_80px_-30px_rgba(217,70,239,0.4)] overflow-hidden"
            style={{ width: previewW, height: previewH }}
          >
            {selected ? (
              <canvas
                ref={canvasRef}
                style={{ width: "100%", height: "100%", display: "block" }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm gap-2">
                <ImageIcon className="w-4 h-4" /> Selecione uma premiação
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Preview escalado · exportação em {fmt.w}×{fmt.h}
          </p>
        </main>
      </div>
    </div>
  );
}
