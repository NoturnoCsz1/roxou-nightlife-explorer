import { ACCENT, ACCENT_ALT, BG, FORMAT_SIZES, MUTED, WHITE, type ArtFormat, type CoverPartner } from "../types";
import { drawBadge, drawGlow, drawGrain, drawPremiumCTA } from "../canvas";
import { loadImage, roundRect } from "../utils";

export async function renderCoverPartners(canvas: HTMLCanvasElement, partners: CoverPartner[], fmt: ArtFormat = "feed"): Promise<string> {
  const { w: W, h: H } = FORMAT_SIZES[fmt];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const PAD = fmt === "banner" ? 80 : 64;

  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  drawGrain(ctx, W, H);
  drawGlow(ctx, W / 2, H / 2, 500, ACCENT_ALT, 0.08);

  drawBadge(ctx, "PARCEIROS EM ALTA", PAD, PAD);

  ctx.save();
  ctx.font = "bold 50px sans-serif"; ctx.fillStyle = WHITE; ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 10;
  ctx.fillText("PARCEIROS EM ALTA", PAD, PAD + 60);
  ctx.shadowBlur = 0; ctx.restore();

  ctx.font = "400 22px sans-serif"; ctx.fillStyle = MUTED; ctx.textBaseline = "top";
  ctx.fillText("Os locais mais acessados da semana", PAD, PAD + 125);

  const rankY = PAD + 180;
  const cardH = fmt === "story" ? 110 : 95;
  const maxP = Math.min(partners.length, fmt === "story" ? 6 : 5);

  for (let i = 0; i < maxP; i++) {
    const p = partners[i];
    const y = rankY + i * (cardH + 10);

    ctx.save();
    ctx.fillStyle = i === 0 ? "rgba(233,30,140,0.08)" : "rgba(255,255,255,0.025)";
    roundRect(ctx, PAD, y, W - PAD * 2, cardH, 14);
    ctx.fill(); ctx.restore();

    // Rank
    ctx.save();
    ctx.font = "bold 34px sans-serif";
    const rg = ctx.createLinearGradient(PAD + 16, y, PAD + 56, y);
    rg.addColorStop(0, ACCENT); rg.addColorStop(1, ACCENT_ALT);
    ctx.fillStyle = rg; ctx.textBaseline = "top";
    ctx.fillText(`#${i + 1}`, PAD + 16, y + (cardH - 34) / 2);
    ctx.restore();

    // Logo
    if (p.logo_url) {
      try {
        const img = await loadImage(p.logo_url);
        ctx.save();
        ctx.beginPath(); ctx.arc(PAD + 110, y + cardH / 2, 26, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
        ctx.drawImage(img, PAD + 84, y + cardH / 2 - 26, 52, 52);
        ctx.restore();
      } catch { /* skip */ }
    }

    ctx.font = "bold 24px sans-serif"; ctx.fillStyle = WHITE; ctx.textBaseline = "top";
    ctx.fillText(p.name, PAD + 150, y + (cardH - 48) / 2);
    ctx.font = "400 16px sans-serif"; ctx.fillStyle = MUTED;
    ctx.fillText(`${p.views} acessos`, PAD + 150, y + (cardH - 48) / 2 + 30);
  }

  drawPremiumCTA(ctx, W, H, "DESCUBRA MAIS EM ROXOU.COM.BR", PAD);
  return canvas.toDataURL("image/png");
}
