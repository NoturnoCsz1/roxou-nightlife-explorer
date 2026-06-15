import { ACCENT, ACCENT_ALT, BG, FORMAT_SIZES, WEEKDAYS, WHITE, type ArtFormat, type CoverEvent } from "../types";
import { drawBadge, drawGlassPanel, drawGlow, drawGrain, drawPremiumCTA } from "../canvas";
import { extractArtist, extractPrice, formatTime, loadImage, roundRect, wrapText } from "../utils";

export async function renderCoverDestaque(canvas: HTMLCanvasElement, event: CoverEvent, fmt: ArtFormat = "story"): Promise<string> {
  const { w: W, h: H } = FORMAT_SIZES[fmt];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const PAD = 72;

  // Full-bleed hero background with lighter overlay to show the event image
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  if (event.image_url) {
    try {
      const img = await loadImage(event.image_url);
      const imgR = img.width / img.height;
      const canR = W / H;
      let sw = img.width, sh = img.height, sx = 0, sy = 0;
      if (imgR > canR) { sw = img.height * canR; sx = (img.width - sw) / 2; }
      else { sh = img.width / canR; sy = (img.height - sh) / 2; }
      const z = 0.08;
      const zw = sw * (1 - z), zh = sh * (1 - z);
      ctx.drawImage(img, sx + (sw - zw) / 2, sy + (sh - zh) / 2, zw, zh, 0, 0, W, H);
    } catch { /* solid fallback */ }
  }

  // Gradient overlay — lighter top to show image, heavy bottom for text
  const ov = ctx.createLinearGradient(0, 0, 0, H);
  ov.addColorStop(0, "rgba(15,10,26,0.25)");
  ov.addColorStop(0.35, "rgba(15,10,26,0.35)");
  ov.addColorStop(0.55, "rgba(15,10,26,0.65)");
  ov.addColorStop(0.75, "rgba(15,10,26,0.9)");
  ov.addColorStop(1, "rgba(15,10,26,0.98)");
  ctx.fillStyle = ov; ctx.fillRect(0, 0, W, H);

  // Vignette
  const vigL = ctx.createLinearGradient(0, 0, W * 0.12, 0);
  vigL.addColorStop(0, "rgba(15,10,26,0.4)"); vigL.addColorStop(1, "rgba(15,10,26,0)");
  ctx.fillStyle = vigL; ctx.fillRect(0, 0, W * 0.12, H);
  const vigR = ctx.createLinearGradient(W * 0.88, 0, W, 0);
  vigR.addColorStop(0, "rgba(15,10,26,0)"); vigR.addColorStop(1, "rgba(15,10,26,0.4)");
  ctx.fillStyle = vigR; ctx.fillRect(W * 0.88, 0, W * 0.12, H);

  drawGrain(ctx, W, H);

  // Glow behind content area
  const glowY = fmt === "story" ? H * 0.6 : H * 0.55;
  drawGlow(ctx, W * 0.5, glowY, 500, ACCENT, 0.18);
  drawGlow(ctx, W * 0.3, glowY - 100, 300, ACCENT_ALT, 0.08);

  // ---- TOP: ROXOU branding + badge ----
  ctx.save();
  ctx.font = "bold 28px sans-serif";
  const brandGrad = ctx.createLinearGradient(PAD, 0, PAD + 120, 0);
  brandGrad.addColorStop(0, ACCENT); brandGrad.addColorStop(1, ACCENT_ALT);
  ctx.fillStyle = brandGrad; ctx.textBaseline = "top";
  ctx.fillText("ROXOU", PAD, PAD);
  ctx.restore();

  // Weekday chip top-right
  const wd = WEEKDAYS[new Date(event.date_time).getDay()];
  const d = new Date(event.date_time);
  const months = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
  const dateLabel = `${d.getDate()} ${months[d.getMonth()]} · ${wd}`;
  ctx.save();
  ctx.font = "bold 18px sans-serif";
  const dlW = ctx.measureText(dateLabel).width + 28;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  roundRect(ctx, W - PAD - dlW, PAD, dlW, 36, 18);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.textBaseline = "middle";
  ctx.fillText(dateLabel, W - PAD - dlW + 14, PAD + 18);
  ctx.restore();

  // ---- CONTENT BLOCK (bottom half) ----
  const isStory = fmt === "story";
  const contentY = isStory ? H * 0.52 : H * 0.42;

  // Glass panel
  const titleSize = isStory ? 78 : 64;
  ctx.font = `bold ${titleSize}px sans-serif`;
  const titleLines = wrapText(ctx, event.title, W - PAD * 2 - 20);
  const lineH = titleSize + 14;
  const visibleLines = Math.min(titleLines.length, 3);
  const titleBlockH = visibleLines * lineH;

  const artist = extractArtist(event.description);
  const price = extractPrice(event.description, event.ticket_url);
  let metaH = 60; // time
  if (event.venue_name) metaH += 40;
  if (artist) metaH += 40;
  if (price) metaH += 44;

  const panelH = 60 + titleBlockH + metaH + 40;
  drawGlassPanel(ctx, PAD - 24, contentY - 20, W - PAD * 2 + 48, panelH);

  // Badge
  const catLabel = event.sub_category || event.category || "EVENTO";
  drawBadge(ctx, `🔥 ${catLabel.toUpperCase()}`, PAD, contentY, 22);

  // Title — MASSIVE
  ctx.save();
  ctx.font = `bold ${titleSize}px sans-serif`;
  ctx.textBaseline = "top";
  // Triple shadow for depth
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  titleLines.slice(0, visibleLines).forEach((l, i) => ctx.fillText(l, PAD + 5, contentY + 60 + i * lineH + 5));
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  titleLines.slice(0, visibleLines).forEach((l, i) => ctx.fillText(l, PAD + 2, contentY + 60 + i * lineH + 2));
  ctx.fillStyle = WHITE;
  titleLines.slice(0, visibleLines).forEach((l, i) => ctx.fillText(l, PAD, contentY + 60 + i * lineH));
  ctx.restore();

  // Meta
  let metaY = contentY + 60 + titleBlockH + 12;

  // Time — BIG accent
  ctx.save();
  ctx.font = "bold 42px sans-serif"; ctx.fillStyle = ACCENT; ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(233,30,140,0.4)"; ctx.shadowBlur = 16;
  ctx.fillText(formatTime(event.date_time), PAD, metaY);
  ctx.shadowBlur = 0; ctx.restore();

  // Venue
  if (event.venue_name) {
    ctx.font = "500 22px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.textBaseline = "top";
    ctx.fillText(`📍 ${event.venue_name}`, PAD, metaY + 50);
    metaY += 40;
  }

  // Artist
  if (artist) {
    ctx.font = "italic 24px sans-serif"; ctx.fillStyle = "rgba(233,30,140,0.8)"; ctx.textBaseline = "top";
    ctx.fillText(`✦ ${artist}`, PAD, metaY + 52);
    metaY += 40;
  }

  // Price pill
  if (price) {
    const priceY = metaY + 56;
    ctx.save();
    ctx.font = "bold 18px sans-serif";
    const pw = ctx.measureText(price).width + 30;
    const priceGrad = ctx.createLinearGradient(PAD, priceY, PAD + pw, priceY);
    priceGrad.addColorStop(0, "rgba(233,30,140,0.15)"); priceGrad.addColorStop(1, "rgba(147,51,234,0.1)");
    ctx.fillStyle = priceGrad;
    roundRect(ctx, PAD, priceY, pw, 36, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(233,30,140,0.2)"; ctx.lineWidth = 1;
    roundRect(ctx, PAD, priceY, pw, 36, 18); ctx.stroke();
    ctx.fillStyle = ACCENT; ctx.textBaseline = "middle";
    ctx.fillText(price, PAD + 15, priceY + 18);
    ctx.restore();
  }

  // ---- CTA bottom ----
  drawPremiumCTA(ctx, W, H, "SAIBA MAIS EM ROXOU.COM.BR", PAD);

  return canvas.toDataURL("image/png");
}
