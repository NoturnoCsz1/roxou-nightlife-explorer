import { ACCENT, ACCENT_ALT, FORMAT_SIZES, WHITE, type ArtFormat, type CoverEvent } from "../types";
import { drawBadge, drawGhostItem, drawGlassPanel, drawGlow, drawGrain, drawHeroBg, drawPremiumCTA } from "../canvas";
import { extractArtist, formatTime, wrapText } from "../utils";

export async function renderCoverTopRoles(canvas: HTMLCanvasElement, events: CoverEvent[], fmt: ArtFormat = "feed"): Promise<string> {
  const { w: W, h: H } = FORMAT_SIZES[fmt];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const PAD = fmt === "banner" ? 80 : 72;
  const hero = events[0] || null;

  await drawHeroBg(ctx, W, H, hero?.image_url || null);
  drawGrain(ctx, W, H);
  drawGlow(ctx, W * 0.5, H * 0.38, 600, ACCENT_ALT, 0.12);

  // ---- TOP: Subtle headline ----
  ctx.save();
  ctx.font = "bold 24px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.textBaseline = "top";
  ctx.fillText("OS MELHORES ROLÊS", PAD, PAD);
  ctx.restore();
  ctx.font = "400 16px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.textBaseline = "top";
  ctx.fillText("Selecionamos os destaques do dia", PAD, PAD + 30);

  // ---- HERO #1 ----
  if (hero) {
    const heroY = fmt === "story" ? H * 0.22 : H * 0.2;
    const heroTitleSize = fmt === "story" ? 68 : 62;

    ctx.font = `bold ${heroTitleSize}px sans-serif`;
    const hLines = wrapText(ctx, hero.title, W - PAD * 2 - 40);
    const lineH = heroTitleSize + 12;
    const titleBlockH = Math.min(hLines.length, 2) * lineH;
    const artist = extractArtist(hero.description);
    let metaH = 50;
    if (artist) metaH += 34;
    const panelH = 56 + titleBlockH + metaH + 24;

    drawGlassPanel(ctx, PAD - 20, heroY - 16, W - PAD * 2 + 40, panelH);
    drawBadge(ctx, "🥇 #1 DO DIA", PAD, heroY, 20);

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
    if (artist) {
      ctx.font = "italic 20px sans-serif"; ctx.fillStyle = "rgba(233,30,140,0.65)"; ctx.textBaseline = "top";
      ctx.fillText(`✦ ${artist}`, PAD, metaY + 46);
    }
  }

  // ---- BOTTOM: #2 #3 ghost style ----
  const medals = ["🥈 #2", "🥉 #3"];
  const maxSupport = fmt === "story" ? 3 : 2;
  const supportEvents = events.slice(1, 1 + maxSupport);
  if (supportEvents.length > 0) {
    const itemH = 38;
    const listH = supportEvents.length * itemH;
    const listStartY = H - 140 - listH;

    ctx.font = "600 12px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.textBaseline = "top";
    ctx.fillText("PRÓXIMOS NO RANKING", PAD, listStartY - 18);

    for (let i = 0; i < supportEvents.length; i++) {
      const e = supportEvents[i];
      const medal = medals[i] || `${i + 2}º`;
      drawGhostItem(ctx, `${medal}  ${formatTime(e.date_time)}`, e.title, PAD, listStartY + i * itemH, W - PAD * 2);
    }
  }

  drawPremiumCTA(ctx, W, H, "VEJA O RANKING COMPLETO EM ROXOU.COM.BR", PAD);
  return canvas.toDataURL("image/png");
}
