import { useCallback, useRef, useState } from "react";
import { Loader2, Download, Image as ImageIcon, Send } from "lucide-react";
import { toast } from "sonner";

export type ImageFormat = "feed" | "story";
const FORMAT_SIZES: Record<ImageFormat, { w: number; h: number; label: string }> = {
  feed: { w: 1080, h: 1350, label: "Feed 4:5" },
  story: { w: 1080, h: 1920, label: "Story 9:16" },
};

interface EventData {
  title: string;
  date_time: string;
  venue_name: string | null;
  category: string;
  sub_category?: string | null;
  image_url: string | null;
  description?: string | null;
  ticket_url?: string | null;
}

interface Props {
  event: EventData;
  badge?: string;
  initialImage?: string;
  onImageGenerated?: (dataUrl: string) => void;
  onSendToDraft?: (imageDataUrl: string) => void;
}

// Roxou brand colors
const BRAND_BG = "#0f0a1a";
const BRAND_ACCENT = "#e91e8c";
const BRAND_ACCENT_ALT = "#9333ea";
const BRAND_WHITE = "#ffffff";
const BRAND_MUTED = "rgba(255,255,255,0.6)";

const WEEKDAYS = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];

function formatTime(dt: string) {
  const d = new Date(dt);
  return `${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDateShort(dt: string) {
  const d = new Date(dt);
  const months = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function getWeekday(dt: string) {
  return WEEKDAYS[new Date(dt).getDay()];
}

/** Extract artist/attraction from description (first line or "com XXX" pattern) */
function extractArtist(desc?: string | null): string | null {
  if (!desc) return null;
  const comMatch = desc.match(/\bcom\s+([A-ZÀ-Ú][^\n,.]{2,40})/i);
  if (comMatch) return comMatch[1].trim();
  const djMatch = desc.match(/\b(?:DJ|Dj|dj)\s+([^\n,.]{2,30})/);
  if (djMatch) return `DJ ${djMatch[1].trim()}`;
  return null;
}

/** Extract price info from description */
function extractPrice(desc?: string | null, ticketUrl?: string | null): string | null {
  if (!desc && !ticketUrl) return null;
  if (desc) {
    const freeMatch = desc.match(/\b(?:entrada\s+(?:franca|livre|grátis|gratuita)|free|grátis)\b/i);
    if (freeMatch) return "ENTRADA GRATUITA";
    const priceMatch = desc.match(/R\$\s*(\d+(?:[.,]\d{2})?)/);
    if (priceMatch) return `A PARTIR DE R$${priceMatch[1]}`;
  }
  if (ticketUrl) return "INGRESSOS DISPONÍVEIS";
  return null;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

async function renderEventCard(
  canvas: HTMLCanvasElement,
  event: EventData,
  badge: string,
  fmt: ImageFormat = "feed"
) {
  const { w: CANVAS_W, h: CANVAS_H } = FORMAT_SIZES[fmt];
  const ctx = canvas.getContext("2d")!;
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  const PAD = 64;

  // Layer 1: Background
  ctx.fillStyle = BRAND_BG;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (event.image_url) {
    try {
      const img = await loadImage(event.image_url);
      const imgRatio = img.width / img.height;
      const canvasRatio = CANVAS_W / CANVAS_H;
      let sw = img.width, sh = img.height, sx = 0, sy = 0;
      if (imgRatio > canvasRatio) {
        sw = img.height * canvasRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / canvasRatio;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, CANVAS_W, CANVAS_H);
    } catch { /* fallback solid bg */ }
  }

  // Layer 2: Dark overlay gradients
  const bottomGrad = ctx.createLinearGradient(0, CANVAS_H * 0.25, 0, CANVAS_H);
  bottomGrad.addColorStop(0, "rgba(15,10,26,0)");
  bottomGrad.addColorStop(0.3, "rgba(15,10,26,0.5)");
  bottomGrad.addColorStop(0.6, "rgba(15,10,26,0.82)");
  bottomGrad.addColorStop(1, "rgba(15,10,26,0.97)");
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const topGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H * 0.22);
  topGrad.addColorStop(0, "rgba(15,10,26,0.7)");
  topGrad.addColorStop(1, "rgba(15,10,26,0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H * 0.28);

  // Subtle purple tint
  ctx.fillStyle = "rgba(147,51,234,0.04)";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Subtle grain
  ctx.save();
  ctx.globalAlpha = 0.025;
  for (let i = 0; i < 2500; i++) {
    const gx = Math.random() * CANVAS_W;
    const gy = Math.random() * CANVAS_H;
    const gs = Math.random() * 2;
    ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#000";
    ctx.fillRect(gx, gy, gs, gs);
  }
  ctx.restore();

  // Layer 3: Top badge
  ctx.save();
  const badgeText = badge.toUpperCase();
  ctx.font = "bold 26px sans-serif";
  const badgeW = ctx.measureText(badgeText).width + 44;
  const badgeH = 48;
  const badgeX = PAD;
  const badgeY = PAD;

  const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY);
  badgeGrad.addColorStop(0, BRAND_ACCENT);
  badgeGrad.addColorStop(1, BRAND_ACCENT_ALT);
  ctx.fillStyle = badgeGrad;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 24);
  ctx.fill();

  ctx.shadowColor = "rgba(233,30,140,0.3)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = BRAND_WHITE;
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, badgeX + 22, badgeY + badgeH / 2 + 1);
  ctx.restore();

  // Layer 4: Weekday chip (top right)
  const weekday = getWeekday(event.date_time);
  ctx.save();
  ctx.font = "bold 22px sans-serif";
  const wdText = weekday;
  const wdW = ctx.measureText(wdText).width + 30;
  const wdX = CANVAS_W - PAD - wdW;
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  roundRect(ctx, wdX, PAD, wdW, 42, 21);
  ctx.fill();
  ctx.fillStyle = BRAND_WHITE;
  ctx.textBaseline = "middle";
  ctx.fillText(wdText, wdX + 15, PAD + 22);
  ctx.restore();

  // Layer 5: Lower info block
  const infoY = CANVAS_H - (fmt === "story" ? 520 : 420);

  // Category chip
  if (event.category) {
    ctx.save();
    ctx.font = "bold 20px sans-serif";
    const catText = (event.sub_category || event.category).toUpperCase();
    const catW = ctx.measureText(catText).width + 28;
    ctx.fillStyle = "rgba(233,30,140,0.2)";
    roundRect(ctx, PAD, infoY, catW, 36, 18);
    ctx.fill();
    ctx.fillStyle = BRAND_ACCENT;
    ctx.textBaseline = "middle";
    ctx.fillText(catText, PAD + 14, infoY + 19);
    ctx.restore();
  }

  // Event title — strong hierarchy
  ctx.save();
  ctx.font = "bold 52px sans-serif";
  ctx.textBaseline = "top";
  const titleLines = wrapText(ctx, event.title, CANVAS_W - PAD * 2);
  const titleStartY = infoY + 50;
  // Shadow pass
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  titleLines.slice(0, 3).forEach((line, i) => {
    ctx.fillText(line, PAD + 2, titleStartY + i * 62 + 2);
  });
  // Main pass
  ctx.fillStyle = BRAND_WHITE;
  titleLines.slice(0, 3).forEach((line, i) => {
    ctx.fillText(line, PAD, titleStartY + i * 62);
  });
  ctx.restore();

  // Artist/attraction line
  const artist = extractArtist(event.description);
  let afterTitleY = titleStartY + Math.min(titleLines.length, 3) * 62;
  if (artist) {
    ctx.save();
    ctx.font = "italic 28px sans-serif";
    ctx.fillStyle = "rgba(233,30,140,0.85)";
    ctx.textBaseline = "top";
    ctx.fillText(`✦ ${artist}`, PAD, afterTitleY + 6);
    ctx.restore();
    afterTitleY += 40;
  }

  // Time + date + weekday — prominent
  const metaY = afterTitleY + 14;
  ctx.save();
  ctx.font = "bold 32px sans-serif";
  ctx.fillStyle = BRAND_ACCENT;
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(233,30,140,0.2)";
  ctx.shadowBlur = 8;
  const timeStr = formatTime(event.date_time);
  const dateStr = formatDateShort(event.date_time);
  ctx.fillText(`${timeStr}  ·  ${dateStr}  ·  ${weekday}`, PAD, metaY);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.restore();

  // Venue
  if (event.venue_name) {
    ctx.save();
    ctx.font = "500 26px sans-serif";
    ctx.fillStyle = BRAND_MUTED;
    ctx.textBaseline = "top";
    ctx.fillText(`📍  ${event.venue_name}`, PAD, metaY + 44);
    ctx.restore();
  }

  // Price/entry info
  const price = extractPrice(event.description, event.ticket_url);
  if (price) {
    ctx.save();
    ctx.font = "bold 22px sans-serif";
    const priceY = metaY + (event.venue_name ? 88 : 48);
    const priceW = ctx.measureText(price).width + 32;
    // Pill background
    ctx.fillStyle = "rgba(233,30,140,0.15)";
    roundRect(ctx, PAD, priceY, priceW, 36, 18);
    ctx.fill();
    ctx.fillStyle = BRAND_ACCENT;
    ctx.textBaseline = "middle";
    ctx.fillText(price, PAD + 16, priceY + 19);
    ctx.restore();
  }

  // Layer 6: Footer
  const footerY = CANVAS_H - 80;

  // Divider
  ctx.save();
  const divGrad = ctx.createLinearGradient(PAD, 0, CANVAS_W - PAD, 0);
  divGrad.addColorStop(0, "rgba(233,30,140,0.4)");
  divGrad.addColorStop(0.5, "rgba(147,51,234,0.2)");
  divGrad.addColorStop(1, "rgba(233,30,140,0)");
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, footerY - 20);
  ctx.lineTo(CANVAS_W - PAD, footerY - 20);
  ctx.stroke();
  ctx.restore();

  // CTA text
  ctx.save();
  ctx.font = "bold 24px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.textBaseline = "top";
  const ctaText = event.ticket_url ? "GARANTA SUA ENTRADA" : "CONFIRA NA ROXOU";
  ctx.fillText(ctaText, PAD, footerY - 4);
  ctx.restore();

  // roxou.com.br
  ctx.save();
  ctx.font = "400 22px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.textBaseline = "top";
  ctx.fillText("roxou.com.br", PAD, footerY + 26);
  ctx.restore();

  // ROXOU brand — right side
  ctx.save();
  ctx.font = "bold 28px sans-serif";
  const roxouGrad = ctx.createLinearGradient(CANVAS_W - 180, footerY, CANVAS_W - PAD, footerY);
  roxouGrad.addColorStop(0, BRAND_ACCENT);
  roxouGrad.addColorStop(1, BRAND_ACCENT_ALT);
  ctx.fillStyle = roxouGrad;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText("ROXOU", CANVAS_W - PAD, footerY + 8);
  ctx.restore();

  return canvas.toDataURL("image/jpeg", 0.92);
}

export default function EventImageGenerator({ event, badge = "HOJE NA ROXOU", initialImage, onImageGenerated, onSendToDraft }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generating, setGenerating] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(initialImage || null);
  const [fmt, setFmt] = useState<ImageFormat>("feed");

  const generate = useCallback(async () => {
    if (!canvasRef.current) return;
    setGenerating(true);
    try {
      const dataUrl = await renderEventCard(canvasRef.current, event, badge, fmt);
      setImageDataUrl(dataUrl);
      onImageGenerated?.(dataUrl);
      toast.success("Imagem gerada!");
    } catch (err: any) {
      toast.error("Erro ao gerar imagem", { description: err.message });
    } finally {
      setGenerating(false);
    }
  }, [event, badge, fmt, onImageGenerated]);

  const download = useCallback(() => {
    if (!imageDataUrl) return;
    const a = document.createElement("a");
    a.href = imageDataUrl;
    const suffix = fmt === "story" ? "_story" : "";
    a.download = `roxou-${event.title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_")}${suffix}.jpg`;
    a.click();
    toast.success("Download iniciado!");
  }, [imageDataUrl, event.title, fmt]);

  return (
    <div className="space-y-2">
      <canvas ref={canvasRef} className="hidden" />

      {/* Format toggle */}
      <div className="flex gap-1">
        {(Object.entries(FORMAT_SIZES) as [ImageFormat, typeof FORMAT_SIZES["feed"]][]).map(([key, val]) => (
          <button
            key={key}
            onClick={() => { setFmt(key); setImageDataUrl(null); }}
            className={`text-[9px] px-2 py-1 rounded-full font-semibold transition ${fmt === key ? "bg-primary/20 text-primary" : "bg-secondary/30 text-muted-foreground hover:text-foreground"}`}
          >
            {val.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={generate}
          disabled={generating}
          className="flex items-center gap-1 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
        >
          {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
          Gerar imagem
        </button>

        {imageDataUrl && (
          <>
            <button
              onClick={download}
              className="flex items-center gap-1 rounded-md bg-secondary/50 px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition"
            >
              <Download className="h-3 w-3" /> Baixar
            </button>
            {onSendToDraft && (
              <button
                onClick={() => onSendToDraft(imageDataUrl)}
                className="flex items-center gap-1 rounded-md bg-primary/15 px-2.5 py-1.5 text-[10px] font-semibold text-primary hover:bg-primary/25 transition"
              >
                <Send className="h-3 w-3" /> Enviar p/ publicação
              </button>
            )}
          </>
        )}
      </div>

      {imageDataUrl && (
        <div className="rounded-lg overflow-hidden border border-border/30 max-w-[280px]">
          <img src={imageDataUrl} alt="Preview" className="w-full" />
        </div>
      )}
    </div>
  );
}

// Export the render function for bulk generation
export { renderEventCard, loadImage };
export type { EventData };
