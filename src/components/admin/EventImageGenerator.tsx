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
}

interface Props {
  event: EventData;
  badge?: string;
  initialImage?: string;
  onImageGenerated?: (dataUrl: string) => void;
  onSendToDraft?: (imageDataUrl: string) => void;
}

const CANVAS_W = 1080;
const CANVAS_H = 1350;

// Roxou brand colors
const BRAND_BG = "#0f0a1a";
const BRAND_ACCENT = "#e91e8c";
const BRAND_ACCENT_ALT = "#9333ea";
const BRAND_WHITE = "#ffffff";
const BRAND_MUTED = "rgba(255,255,255,0.6)";

function formatTime(dt: string) {
  const d = new Date(dt);
  return `${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDateShort(dt: string) {
  const d = new Date(dt);
  const months = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
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

  // Layer 1: Background
  ctx.fillStyle = BRAND_BG;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  let flyerLoaded = false;
  if (event.image_url) {
    try {
      const img = await loadImage(event.image_url);
      // Cover fill
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
      flyerLoaded = true;
    } catch {
      // fallback to solid bg
    }
  }

  // Layer 2: Dark overlay gradients
  // Bottom gradient (stronger)
  const bottomGrad = ctx.createLinearGradient(0, CANVAS_H * 0.35, 0, CANVAS_H);
  bottomGrad.addColorStop(0, "rgba(15,10,26,0)");
  bottomGrad.addColorStop(0.4, "rgba(15,10,26,0.6)");
  bottomGrad.addColorStop(0.7, "rgba(15,10,26,0.85)");
  bottomGrad.addColorStop(1, "rgba(15,10,26,0.97)");
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Top gradient (subtle)
  const topGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H * 0.25);
  topGrad.addColorStop(0, "rgba(15,10,26,0.8)");
  topGrad.addColorStop(1, "rgba(15,10,26,0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H * 0.3);

  // Subtle purple tint over everything
  ctx.fillStyle = "rgba(147,51,234,0.06)";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Layer 3: Top badge
  const PAD = 60;
  ctx.save();
  const badgeText = badge.toUpperCase();
  ctx.font = "bold 28px sans-serif";
  const badgeW = ctx.measureText(badgeText).width + 48;
  const badgeH = 52;
  const badgeX = PAD;
  const badgeY = PAD;

  // Badge pill background
  const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY);
  badgeGrad.addColorStop(0, BRAND_ACCENT);
  badgeGrad.addColorStop(1, BRAND_ACCENT_ALT);
  ctx.fillStyle = badgeGrad;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 26);
  ctx.fill();

  ctx.fillStyle = BRAND_WHITE;
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, badgeX + 24, badgeY + badgeH / 2 + 1);
  ctx.restore();

  // Layer 4: Lower info block
  const infoY = CANVAS_H - 340;

  // Category chip
  if (event.category) {
    ctx.save();
    ctx.font = "bold 24px sans-serif";
    const catText = event.category.toUpperCase();
    const catW = ctx.measureText(catText).width + 32;
    ctx.fillStyle = "rgba(233,30,140,0.25)";
    roundRect(ctx, PAD, infoY, catW, 40, 20);
    ctx.fill();
    ctx.fillStyle = BRAND_ACCENT;
    ctx.textBaseline = "middle";
    ctx.fillText(catText, PAD + 16, infoY + 21);
    ctx.restore();
  }

  // Event title
  ctx.save();
  ctx.font = "bold 56px sans-serif";
  ctx.fillStyle = BRAND_WHITE;
  ctx.textBaseline = "top";
  const titleLines = wrapText(ctx, event.title, CANVAS_W - PAD * 2);
  const titleStartY = infoY + 56;
  titleLines.slice(0, 3).forEach((line, i) => {
    ctx.fillText(line, PAD, titleStartY + i * 66);
  });
  ctx.restore();

  // Time + venue
  const metaY = titleStartY + Math.min(titleLines.length, 3) * 66 + 16;
  ctx.save();
  ctx.font = "bold 32px sans-serif";
  ctx.fillStyle = BRAND_ACCENT;
  ctx.textBaseline = "top";
  const timeStr = formatTime(event.date_time);
  const dateStr = formatDateShort(event.date_time);
  ctx.fillText(`🕐  ${timeStr}  ·  ${dateStr}`, PAD, metaY);
  ctx.restore();

  if (event.venue_name) {
    ctx.save();
    ctx.font = "400 28px sans-serif";
    ctx.fillStyle = BRAND_MUTED;
    ctx.textBaseline = "top";
    ctx.fillText(`📍  ${event.venue_name}`, PAD, metaY + 46);
    ctx.restore();
  }

  // Layer 5: Footer
  const footerY = CANVAS_H - 80;

  // Divider line
  ctx.save();
  const divGrad = ctx.createLinearGradient(PAD, 0, CANVAS_W - PAD, 0);
  divGrad.addColorStop(0, "rgba(233,30,140,0.5)");
  divGrad.addColorStop(0.5, "rgba(147,51,234,0.3)");
  divGrad.addColorStop(1, "rgba(233,30,140,0.0)");
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD, footerY - 20);
  ctx.lineTo(CANVAS_W - PAD, footerY - 20);
  ctx.stroke();
  ctx.restore();

  // roxou.com.br text
  ctx.save();
  ctx.font = "bold 26px sans-serif";
  ctx.fillStyle = BRAND_MUTED;
  ctx.textBaseline = "top";
  ctx.fillText("roxou.com.br", PAD, footerY);
  ctx.restore();

  // ROXOU brand mark right side
  ctx.save();
  ctx.font = "bold 30px sans-serif";
  const roxouGrad = ctx.createLinearGradient(CANVAS_W - 200, footerY, CANVAS_W - PAD, footerY);
  roxouGrad.addColorStop(0, BRAND_ACCENT);
  roxouGrad.addColorStop(1, BRAND_ACCENT_ALT);
  ctx.fillStyle = roxouGrad;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText("ROXOU", CANVAS_W - PAD, footerY);
  ctx.restore();

  return canvas.toDataURL("image/jpeg", 0.92);
}

export default function EventImageGenerator({ event, badge = "HOJE NA ROXOU", initialImage, onImageGenerated, onSendToDraft }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generating, setGenerating] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(initialImage || null);

  const generate = useCallback(async () => {
    if (!canvasRef.current) return;
    setGenerating(true);
    try {
      const dataUrl = await renderEventCard(canvasRef.current, event, badge);
      setImageDataUrl(dataUrl);
      onImageGenerated?.(dataUrl);
      toast.success("Imagem gerada!");
    } catch (err: any) {
      toast.error("Erro ao gerar imagem", { description: err.message });
    } finally {
      setGenerating(false);
    }
  }, [event, badge, onImageGenerated]);

  const download = useCallback(() => {
    if (!imageDataUrl) return;
    const a = document.createElement("a");
    a.href = imageDataUrl;
    a.download = `roxou-${event.title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_")}.jpg`;
    a.click();
    toast.success("Download iniciado!");
  }, [imageDataUrl, event.title]);

  return (
    <div className="space-y-2">
      <canvas ref={canvasRef} className="hidden" />

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
