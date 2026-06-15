import { ACCENT, ACCENT_ALT, BG, FORMAT_SIZES, MUTED, WHITE, type ArtFormat } from "../types";
import { drawGlow, drawGrain } from "../canvas";
import { wrapText } from "../utils";

export async function renderCTASlide(canvas: HTMLCanvasElement, fmt: ArtFormat = "feed"): Promise<string> {
  const { w: W, h: H } = FORMAT_SIZES[fmt];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  drawGrain(ctx, W, H);
  drawGlow(ctx, W / 2, H / 2, 400, ACCENT, 0.12);

  // ROXOU
  ctx.save();
  ctx.font = "bold 80px sans-serif";
  const brandG = ctx.createLinearGradient(W / 2 - 150, H / 2 - 120, W / 2 + 150, H / 2 - 120);
  brandG.addColorStop(0, ACCENT); brandG.addColorStop(1, ACCENT_ALT);
  ctx.fillStyle = brandG; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("ROXOU", W / 2, H / 2 - 100);
  ctx.restore();

  ctx.save();
  ctx.font = "bold 34px sans-serif"; ctx.fillStyle = WHITE;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const ctaLines = wrapText(ctx, "ACESSE ROXOU.COM.BR E DESCUBRA TUDO QUE ROLA EM PRUDENTE", W - 160);
  ctaLines.forEach((l, i) => ctx.fillText(l, W / 2, H / 2 + i * 46));
  ctx.restore();

  ctx.font = "400 22px sans-serif"; ctx.fillStyle = MUTED;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(fmt === "story" ? "ARRASTE PARA CIMA ☝️" : "👆 Deslize para ver os eventos", W / 2, H / 2 + ctaLines.length * 46 + 50);

  ctx.font = "bold 28px sans-serif"; ctx.fillStyle = ACCENT;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("roxou.com.br", W / 2, H - 100);

  return canvas.toDataURL("image/png");
}
