import { ACCENT, BG, FORMAT_SIZES, MUTED, WEEKDAYS, WHITE, type ArtFormat, type CoverEvent } from "../types";
import { drawBadge, drawGlow, drawGrain, drawPremiumCTA } from "../canvas";
import { extractArtist, extractPrice, formatTime, loadImage, roundRect, wrapText } from "../utils";
import { renderStoryV3 } from "./storyV3";

export async function renderFlyer(canvas: HTMLCanvasElement, event: CoverEvent & { aura_phrase?: string | null }, badge = "HOJE", fmt: ArtFormat = "feed"): Promise<string> {
  // Story uses the new Roxou V3 template (Aura protagonist).
  if (fmt === "story") {
    return renderStoryV3(canvas, event);
  }
  const { w: W, h: H } = FORMAT_SIZES[fmt === "banner" ? "feed" : fmt];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const PAD = 64;

  // Background: event image full bleed
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  if (event.image_url) {
    try {
      const img = await loadImage(event.image_url);
      const imgR = img.width / img.height;
      const canR = W / H;
      let sw = img.width, sh = img.height, sx = 0, sy = 0;
      if (imgR > canR) { sw = img.height * canR; sx = (img.width - sw) / 2; }
      else { sh = img.width / canR; sy = (img.height - sh) / 2; }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
    } catch { /* fallback solid */ }
  }

  // Heavy bottom gradient
  const grad = ctx.createLinearGradient(0, H * 0.2, 0, H);
  grad.addColorStop(0, "rgba(15,10,26,0)");
  grad.addColorStop(0.25, "rgba(15,10,26,0.3)");
  grad.addColorStop(0.5, "rgba(15,10,26,0.7)");
  grad.addColorStop(0.75, "rgba(15,10,26,0.96)");
  grad.addColorStop(1, "rgba(15,10,26,1)");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

  // Top gradient
  const topG = ctx.createLinearGradient(0, 0, 0, H * 0.2);
  topG.addColorStop(0, "rgba(15,10,26,0.6)");
  topG.addColorStop(1, "rgba(15,10,26,0)");
  ctx.fillStyle = topG; ctx.fillRect(0, 0, W, H * 0.25);

  drawGrain(ctx, W, H);
  drawGlow(ctx, W * 0.5, H * 0.7, 400, ACCENT, 0.06);

  // Badge
  drawBadge(ctx, badge.toUpperCase(), PAD, PAD);

  // Weekday chip (top right)
  const wd = WEEKDAYS[new Date(event.date_time).getDay()];
  ctx.save();
  ctx.font = "bold 20px sans-serif";
  const wdW = ctx.measureText(wd).width + 28;
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  roundRect(ctx, W - PAD - wdW, PAD, wdW, 38, 19);
  ctx.fill();
  ctx.fillStyle = WHITE; ctx.textBaseline = "middle";
  ctx.fillText(wd, W - PAD - wdW + 14, PAD + 19);
  ctx.restore();

  // Content block at bottom
  const contentY = H - 480;

  // Category chip
  if (event.category) {
    const cat = (event.sub_category || event.category).toUpperCase();
    ctx.save();
    ctx.font = "bold 18px sans-serif";
    const catW = ctx.measureText(cat).width + 24;
    ctx.fillStyle = "rgba(233,30,140,0.15)";
    roundRect(ctx, PAD, contentY, catW, 32, 16);
    ctx.fill();
    ctx.fillStyle = ACCENT; ctx.textBaseline = "middle";
    ctx.fillText(cat, PAD + 12, contentY + 16);
    ctx.restore();
  }

  // Title GRANDE
  ctx.save();
  ctx.font = "bold 56px sans-serif"; ctx.textBaseline = "top";
  const titleLines = wrapText(ctx, event.title, W - PAD * 2);
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  titleLines.slice(0, 3).forEach((l, i) => ctx.fillText(l, PAD + 2, contentY + 44 + i * 66 + 2));
  ctx.fillStyle = WHITE;
  titleLines.slice(0, 3).forEach((l, i) => ctx.fillText(l, PAD, contentY + 44 + i * 66));
  ctx.restore();

  // Artist
  const artist = extractArtist(event.description);
  let afterTitle = contentY + 44 + Math.min(titleLines.length, 3) * 66;
  if (artist) {
    ctx.font = "italic 26px sans-serif";
    ctx.fillStyle = "rgba(233,30,140,0.8)";
    ctx.textBaseline = "top";
    ctx.fillText(`✦ ${artist}`, PAD, afterTitle + 6);
    afterTitle += 38;
  }

  // Time + Date
  const metaY = afterTitle + 14;
  ctx.save();
  ctx.font = "bold 30px sans-serif"; ctx.fillStyle = ACCENT; ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(233,30,140,0.2)"; ctx.shadowBlur = 8;
  const timeStr = formatTime(event.date_time);
  const d = new Date(event.date_time);
  const months = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
  const dateStr = `${d.getDate()} ${months[d.getMonth()]}`;
  ctx.fillText(`${timeStr}  ·  ${dateStr}  ·  ${wd}`, PAD, metaY);
  ctx.shadowBlur = 0; ctx.restore();

  // Venue
  if (event.venue_name) {
    ctx.font = "500 24px sans-serif"; ctx.fillStyle = MUTED; ctx.textBaseline = "top";
    ctx.fillText(`📍 ${event.venue_name}`, PAD, metaY + 42);
  }

  // Price
  const price = extractPrice(event.description, event.ticket_url);
  if (price) {
    const priceY = metaY + (event.venue_name ? 82 : 46);
    ctx.save();
    ctx.font = "bold 20px sans-serif";
    const pw = ctx.measureText(price).width + 28;
    ctx.fillStyle = "rgba(233,30,140,0.12)";
    roundRect(ctx, PAD, priceY, pw, 34, 17);
    ctx.fill();
    ctx.fillStyle = ACCENT; ctx.textBaseline = "middle";
    ctx.fillText(price, PAD + 14, priceY + 17);
    ctx.restore();
  }

  drawPremiumCTA(ctx, W, H, "CONFIRA NA ROXOU.COM.BR", PAD);
  return canvas.toDataURL("image/png");
}
