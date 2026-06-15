import { ACCENT, FORMAT_SIZES, WHITE, type ArtFormat, type CoverEvent } from "../types";
import { drawBadge, drawGhostItem, drawGlassPanel, drawGlow, drawGrain, drawHeroBg, drawPremiumCTA } from "../canvas";
import { extractArtist, extractPrice, formatTime, getDateShort, getDayLabel, pickTitle, roundRect, wrapText } from "../utils";

export async function renderCoverAgenda(canvas: HTMLCanvasElement, events: CoverEvent[], fmt: ArtFormat = "feed"): Promise<string> {
  const { w: W, h: H } = FORMAT_SIZES[fmt];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const PAD = fmt === "banner" ? 80 : 72;
  const hero = events[0] || null;

  await drawHeroBg(ctx, W, H, hero?.image_url || null);
  drawGrain(ctx, W, H);

  // Central glow behind hero
  const glowCY = fmt === "story" ? H * 0.38 : H * 0.4;
  drawGlow(ctx, W * 0.5, glowCY, 600, ACCENT, 0.14);

  // ---- TOP: Minimal headline ----
  const titleSeed = new Date().getDate();
  const titleText = pickTitle(titleSeed);
  ctx.save();
  ctx.font = "bold 24px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.textBaseline = "top";
  ctx.fillText(titleText, PAD, PAD);
  ctx.restore();
  ctx.font = "bold 18px sans-serif";
  ctx.fillStyle = "rgba(233,30,140,0.6)";
  ctx.textBaseline = "top";
  ctx.fillText(`${getDayLabel()} · ${getDateShort()}`, PAD, PAD + 32);

  // ---- HERO BLOCK ----
  if (hero) {
    const heroY = fmt === "story" ? H * 0.24 : H * 0.2;
    const heroTitleSize = fmt === "story" ? 72 : fmt === "banner" ? 74 : 66;

    // Measure hero content height for glass panel
    ctx.font = `bold ${heroTitleSize}px sans-serif`;
    const heroLines = wrapText(ctx, hero.title, W - PAD * 2 - 40);
    const lineH = heroTitleSize + 12;
    const titleBlockH = Math.min(heroLines.length, 2) * lineH;
    const artist = extractArtist(hero.description);
    const price = extractPrice(hero.description, hero.ticket_url);
    let metaH = 50; // time + venue
    if (artist) metaH += 34;
    if (price) metaH += 38;
    const panelH = 56 + titleBlockH + metaH + 32; // badge + title + meta + padding

    // Glass panel
    drawGlassPanel(ctx, PAD - 20, heroY - 16, W - PAD * 2 + 40, panelH);

    // Badge
    drawBadge(ctx, "🔥 DESTAQUE", PAD, heroY, 20);

    // Title — HUGE with strong shadow
    ctx.save();
    ctx.font = `bold ${heroTitleSize}px sans-serif`;
    ctx.textBaseline = "top";
    // Double shadow for depth
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    heroLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, PAD + 4, heroY + 56 + i * lineH + 4));
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    heroLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, PAD + 2, heroY + 56 + i * lineH + 2));
    ctx.fillStyle = WHITE;
    heroLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, PAD, heroY + 56 + i * lineH));
    ctx.restore();

    // Meta below title
    const metaY = heroY + 56 + titleBlockH + 8;

    // Time — prominent
    ctx.save();
    ctx.font = "bold 36px sans-serif";
    ctx.fillStyle = ACCENT;
    ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(233,30,140,0.3)"; ctx.shadowBlur = 12;
    ctx.fillText(formatTime(hero.date_time), PAD, metaY);
    ctx.shadowBlur = 0; ctx.restore();

    // Venue inline
    if (hero.venue_name) {
      ctx.font = "500 20px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.textBaseline = "top";
      ctx.fillText(`📍 ${hero.venue_name}`, PAD + 120, metaY + 8);
    }

    let extraY = metaY + 46;
    if (artist) {
      ctx.font = "italic 20px sans-serif";
      ctx.fillStyle = "rgba(233,30,140,0.7)";
      ctx.textBaseline = "top";
      ctx.fillText(`✦ ${artist}`, PAD, extraY);
      extraY += 34;
    }
    if (price) {
      ctx.save();
      ctx.font = "bold 16px sans-serif";
      const pw = ctx.measureText(price).width + 22;
      ctx.fillStyle = "rgba(233,30,140,0.1)";
      roundRect(ctx, PAD, extraY, pw, 28, 14);
      ctx.fill();
      ctx.fillStyle = "rgba(233,30,140,0.7)";
      ctx.textBaseline = "middle";
      ctx.fillText(price, PAD + 11, extraY + 14);
      ctx.restore();
    }
  }

  // ---- BOTTOM: Ghost support list (max 3 feed, 4 story) ----
  const maxSupport = fmt === "story" ? 4 : 3;
  const supportEvents = events.slice(1, 1 + maxSupport);
  if (supportEvents.length > 0) {
    const itemH = 38;
    const listH = supportEvents.length * itemH;
    const listStartY = H - 140 - listH;

    // Very subtle label
    ctx.font = "600 12px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.textBaseline = "top";
    ctx.fillText("TAMBÉM HOJE", PAD, listStartY - 18);

    for (let i = 0; i < supportEvents.length; i++) {
      drawGhostItem(ctx, formatTime(supportEvents[i].date_time), supportEvents[i].title, PAD, listStartY + i * itemH, W - PAD * 2);
    }
  }

  // ---- CTA ----
  drawPremiumCTA(ctx, W, H, "CONFIRA A AGENDA COMPLETA EM ROXOU.COM.BR", PAD);

  return canvas.toDataURL("image/png");
}
