/**
 * Canvas drawing primitives for Roxou cover renderers.
 * Extracted verbatim from the original src/lib/coverRenderer.ts.
 */

import { ACCENT, ACCENT_ALT, BG, WHITE } from "./types";
import { loadImage, roundRect } from "./utils";

export function drawGrain(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.globalAlpha = 0.02;
  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#000";
    ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 2, Math.random() * 2);
  }
  ctx.restore();
}

export function drawGlow(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, _color = ACCENT, alpha = 0.12) {
  const g = ctx.createRadialGradient(cx, cy, radius * 0.05, cx, cy, radius);
  g.addColorStop(0, `rgba(233,30,140,${alpha})`);
  g.addColorStop(0.4, `rgba(147,51,234,${alpha * 0.4})`);
  g.addColorStop(1, "rgba(15,10,26,0)");
  ctx.fillStyle = g;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
}

/** Single hero image bg — very heavy overlay so text dominates */
export async function drawHeroBg(ctx: CanvasRenderingContext2D, w: number, h: number, imageUrl: string | null) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  if (imageUrl) {
    try {
      const img = await loadImage(imageUrl);
      const imgR = img.width / img.height;
      const canR = w / h;
      let sw = img.width, sh = img.height, sx = 0, sy = 0;
      if (imgR > canR) { sw = img.height * canR; sx = (img.width - sw) / 2; }
      else { sh = img.width / canR; sy = (img.height - sh) / 2; }
      // 12% zoom for cinematic crop
      const z = 0.12;
      const zw = sw * (1 - z), zh = sh * (1 - z);
      ctx.drawImage(img, sx + (sw - zw) / 2, sy + (sh - zh) / 2, zw, zh, 0, 0, w, h);
    } catch { /* solid fallback */ }
  }

  // Very heavy multi-stop overlay
  const ov = ctx.createLinearGradient(0, 0, 0, h);
  ov.addColorStop(0, "rgba(15,10,26,0.6)");
  ov.addColorStop(0.25, "rgba(15,10,26,0.75)");
  ov.addColorStop(0.5, "rgba(15,10,26,0.88)");
  ov.addColorStop(0.75, "rgba(15,10,26,0.95)");
  ov.addColorStop(1, "rgba(15,10,26,0.98)");
  ctx.fillStyle = ov;
  ctx.fillRect(0, 0, w, h);

  // Vignette edges
  const vigL = ctx.createLinearGradient(0, 0, w * 0.15, 0);
  vigL.addColorStop(0, "rgba(15,10,26,0.5)"); vigL.addColorStop(1, "rgba(15,10,26,0)");
  ctx.fillStyle = vigL; ctx.fillRect(0, 0, w * 0.15, h);
  const vigR = ctx.createLinearGradient(w * 0.85, 0, w, 0);
  vigR.addColorStop(0, "rgba(15,10,26,0)"); vigR.addColorStop(1, "rgba(15,10,26,0.5)");
  ctx.fillStyle = vigR; ctx.fillRect(w * 0.85, 0, w * 0.15, h);

  // Purple tint
  ctx.fillStyle = "rgba(147,51,234,0.03)";
  ctx.fillRect(0, 0, w, h);
}

export function drawBadge(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 22) {
  ctx.save();
  ctx.font = `bold ${size}px sans-serif`;
  const bw = ctx.measureText(text).width + 36;
  const bh = size + 18;
  const grad = ctx.createLinearGradient(x, y, x + bw, y);
  grad.addColorStop(0, ACCENT);
  grad.addColorStop(1, ACCENT_ALT);
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, bw, bh, bh / 2);
  ctx.fill();
  ctx.shadowColor = "rgba(233,30,140,0.4)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 4;
  ctx.fill();
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = WHITE;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 18, y + bh / 2 + 1);
  ctx.restore();
}

/** Glass panel behind the hero text block for contrast */
export function drawGlassPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  // Dark semi-transparent backdrop
  ctx.fillStyle = "rgba(15,10,26,0.45)";
  roundRect(ctx, x, y, w, h, 24);
  ctx.fill();
  // Subtle border
  ctx.strokeStyle = "rgba(233,30,140,0.1)";
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 24);
  ctx.stroke();
  ctx.restore();
}

/** Premium CTA block — pill style with brand */
export function drawPremiumCTA(ctx: CanvasRenderingContext2D, w: number, h: number, text: string, pad: number) {
  const ctaH = 100;
  const ctaY = h - ctaH - 20;

  // Gradient backdrop
  const bg = ctx.createLinearGradient(0, ctaY, 0, h);
  bg.addColorStop(0, "rgba(15,10,26,0)");
  bg.addColorStop(0.3, "rgba(15,10,26,0.6)");
  bg.addColorStop(1, "rgba(15,10,26,0.95)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, ctaY - 40, w, ctaH + 60);

  // CTA pill
  const pillW = Math.min(w - pad * 2, 700);
  const pillX = (w - pillW) / 2;
  const pillY = ctaY + 6;
  const pillH = 44;
  ctx.save();
  const pg = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY);
  pg.addColorStop(0, "rgba(233,30,140,0.2)");
  pg.addColorStop(1, "rgba(147,51,234,0.15)");
  ctx.fillStyle = pg;
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(233,30,140,0.25)";
  ctx.lineWidth = 1;
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.font = "bold 20px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, pillY + pillH / 2);
  ctx.restore();

  // ROXOU brand below
  ctx.save();
  ctx.font = "bold 32px sans-serif";
  const g = ctx.createLinearGradient(w / 2 - 80, 0, w / 2 + 80, 0);
  g.addColorStop(0, ACCENT); g.addColorStop(1, ACCENT_ALT);
  ctx.fillStyle = g;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("ROXOU", w / 2, pillY + pillH + 14);
  ctx.restore();
}

/** Ghost-style support item — very low visual weight */
export function drawGhostItem(ctx: CanvasRenderingContext2D, label: string, title: string, x: number, y: number, maxW: number) {
  // Label (time or medal) in low-opacity accent
  ctx.save();
  ctx.font = "bold 17px sans-serif";
  ctx.fillStyle = "rgba(233,30,140,0.5)";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y + 14);
  ctx.restore();

  // Title very dim
  ctx.font = "400 17px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.textBaseline = "middle";
  const tt = ctx.measureText(title).width > maxW - 90 ? title.slice(0, 28) + "…" : title;
  ctx.fillText(tt, x + 82, y + 14);
}
