import { ACCENT, ACCENT_ALT, BG, MUTED, WEEKDAYS, WHITE, type CoverEvent } from "../types";
import { drawGlow, drawGrain, drawHeroBg } from "../canvas";
import { formatTime, getDateShort, getDayLabel, roundRect } from "../utils";

export async function renderBannerFestival(canvas: HTMLCanvasElement, events: CoverEvent[]): Promise<string> {
  const W = 1920, H = 1080;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const PAD = 80;

  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  const imageUrls = events.map(e => e.image_url).filter(Boolean) as string[];
  await drawHeroBg(ctx, W, H, imageUrls[0] || null);
  drawGrain(ctx, W, H);
  drawGlow(ctx, W * 0.5, H * 0.3, 600, ACCENT, 0.1);
  drawGlow(ctx, W * 0.8, H * 0.7, 400, ACCENT_ALT, 0.06);

  // Big centered title
  ctx.save();
  ctx.font = "bold 80px sans-serif";
  ctx.fillStyle = WHITE; ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 20;
  ctx.fillText("O QUE ROLA EM PRUDENTE", W / 2, 80);
  ctx.shadowBlur = 0; ctx.restore();

  // Subtitle
  ctx.font = "bold 32px sans-serif"; ctx.fillStyle = ACCENT;
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.fillText(`${getDayLabel()} · ${getDateShort()}  ·  AGENDA COMPLETA`, W / 2, 175);

  // Divider line
  ctx.save();
  const dg = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, 0);
  dg.addColorStop(0, "rgba(233,30,140,0)"); dg.addColorStop(0.5, "rgba(233,30,140,0.4)"); dg.addColorStop(1, "rgba(233,30,140,0)");
  ctx.strokeStyle = dg; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W * 0.2, 220); ctx.lineTo(W * 0.8, 220); ctx.stroke();
  ctx.restore();

  // Lineup grid — 2 columns
  const colW = (W - PAD * 3) / 2;
  const startY = 250;
  const itemH = 80;
  const maxItems = Math.min(events.length, 10);
  const leftCol = events.slice(0, Math.ceil(maxItems / 2));
  const rightCol = events.slice(Math.ceil(maxItems / 2), maxItems);

  ctx.textAlign = "left";

  [leftCol, rightCol].forEach((col, ci) => {
    const colX = PAD + ci * (colW + PAD);
    col.forEach((e, i) => {
      const y = startY + i * itemH;
      const time = formatTime(e.date_time);
      const wd = WEEKDAYS[new Date(e.date_time).getDay()].slice(0, 3);

      // Card bg
      ctx.save();
      ctx.fillStyle = i === 0 && ci === 0 ? "rgba(233,30,140,0.08)" : "rgba(255,255,255,0.025)";
      roundRect(ctx, colX, y, colW, itemH - 8, 12);
      ctx.fill(); ctx.restore();

      // Time pill
      ctx.save();
      ctx.font = "bold 15px sans-serif";
      ctx.fillStyle = "rgba(233,30,140,0.12)";
      roundRect(ctx, colX + 12, y + 14, 100, 28, 14);
      ctx.fill();
      ctx.fillStyle = ACCENT; ctx.textBaseline = "middle";
      ctx.fillText(`${wd} ${time}`, colX + 22, y + 28);
      ctx.restore();

      // Title
      ctx.font = "bold 22px sans-serif"; ctx.fillStyle = WHITE; ctx.textBaseline = "middle";
      const maxTW = colW - 140;
      const tt = ctx.measureText(e.title).width > maxTW ? e.title.slice(0, 24) + "…" : e.title;
      ctx.fillText(tt, colX + 122, y + 22);

      // Venue
      if (e.venue_name) {
        ctx.font = "400 15px sans-serif"; ctx.fillStyle = MUTED; ctx.textBaseline = "middle";
        ctx.fillText(`📍 ${e.venue_name}`, colX + 122, y + 48);
      }
    });
  });

  // Footer
  ctx.save();
  ctx.font = "bold 28px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.fillText("🔥 CONFIRA TODOS OS EVENTOS EM ROXOU.COM.BR", W / 2, H - 100);
  ctx.restore();

  // ROXOU brand
  ctx.save();
  ctx.font = "bold 32px sans-serif";
  const bg = ctx.createLinearGradient(W / 2 - 60, H - 60, W / 2 + 60, H - 60);
  bg.addColorStop(0, ACCENT); bg.addColorStop(1, ACCENT_ALT);
  ctx.fillStyle = bg; ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.fillText("ROXOU", W / 2, H - 60);
  ctx.restore();

  return canvas.toDataURL("image/png");
}
