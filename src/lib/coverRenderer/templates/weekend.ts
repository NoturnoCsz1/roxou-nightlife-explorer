import { ACCENT, FORMAT_SIZES, WEEKDAYS, WHITE, type ArtFormat, type CoverEvent } from "../types";
import { drawBadge, drawGhostItem, drawGlassPanel, drawGlow, drawGrain, drawHeroBg, drawPremiumCTA } from "../canvas";
import { formatTime, wrapText } from "../utils";

export async function renderCoverWeekend(canvas: HTMLCanvasElement, events: CoverEvent[], fmt: ArtFormat = "feed"): Promise<string> {
  const { w: W, h: H } = FORMAT_SIZES[fmt];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const PAD = fmt === "banner" ? 80 : 72;
  const hero = events[0] || null;

  await drawHeroBg(ctx, W, H, hero?.image_url || null);
  drawGrain(ctx, W, H);
  drawGlow(ctx, W * 0.45, H * 0.35, 600, ACCENT, 0.12);

  // ---- TOP ----
  ctx.save();
  ctx.font = "bold 24px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.textBaseline = "top";
  ctx.fillText("FIM DE SEMANA EM PRUDENTE", PAD, PAD);
  ctx.restore();
  ctx.font = "bold 18px sans-serif";
  ctx.fillStyle = "rgba(233,30,140,0.6)";
  ctx.textBaseline = "top";
  ctx.fillText("SEXTA · SÁBADO · DOMINGO", PAD, PAD + 32);

  // ---- HERO ----
  if (hero) {
    const heroY = fmt === "story" ? H * 0.22 : H * 0.2;
    const wd = WEEKDAYS[new Date(hero.date_time).getDay()];
    const heroTitleSize = fmt === "story" ? 68 : 62;

    ctx.font = `bold ${heroTitleSize}px sans-serif`;
    const hLines = wrapText(ctx, hero.title, W - PAD * 2 - 40);
    const lineH = heroTitleSize + 12;
    const titleBlockH = Math.min(hLines.length, 2) * lineH;
    const panelH = 56 + titleBlockH + 58 + 24;

    drawGlassPanel(ctx, PAD - 20, heroY - 16, W - PAD * 2 + 40, panelH);
    drawBadge(ctx, `🔥 ${wd}`, PAD, heroY, 20);

    ctx.save();
    ctx.font = `bold ${heroTitleSize}px sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    hLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, PAD + 4, heroY + 56 + i * lineH + 4));
    ctx.fillStyle = WHITE;
    hLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, PAD, heroY + 56 + i * lineH));
    ctx.restore();

    const metaY = heroY + 56 + titleBlockH + 8;
    ctx.save();
    ctx.font = "bold 34px sans-serif"; ctx.fillStyle = ACCENT; ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(233,30,140,0.3)"; ctx.shadowBlur = 12;
    ctx.fillText(formatTime(hero.date_time), PAD, metaY);
    ctx.shadowBlur = 0; ctx.restore();

    if (hero.venue_name) {
      ctx.font = "500 20px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.textBaseline = "top";
      ctx.fillText(`📍 ${hero.venue_name}`, PAD + 110, metaY + 8);
    }
  }

  // ---- BOTTOM: Ghost support ----
  const maxSupport = fmt === "story" ? 4 : 3;
  const supportEvents = events.slice(1, 1 + maxSupport);
  if (supportEvents.length > 0) {
    const itemH = 38;
    const listH = supportEvents.length * itemH;
    const listStartY = H - 140 - listH;

    ctx.font = "600 12px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.textBaseline = "top";
    ctx.fillText("MAIS NO FIM DE SEMANA", PAD, listStartY - 18);

    for (let i = 0; i < supportEvents.length; i++) {
      const e = supportEvents[i];
      const d = new Date(e.date_time);
      const dayShort = WEEKDAYS[d.getDay()].slice(0, 3);
      drawGhostItem(ctx, `${dayShort} ${formatTime(e.date_time)}`, e.title, PAD, listStartY + i * itemH, W - PAD * 2);
    }
  }

  drawPremiumCTA(ctx, W, H, "DESCUBRA TUDO NA ROXOU.COM.BR", PAD);
  return canvas.toDataURL("image/png");
}
