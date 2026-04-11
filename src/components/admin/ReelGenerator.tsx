import { useCallback, useRef, useState } from "react";
import { Loader2, Download, Video, Send } from "lucide-react";
import { toast } from "sonner";

interface EventData {
  title: string;
  date_time: string;
  venue_name: string | null;
  category: string;
  image_url: string | null;
}

interface Props {
  event: EventData;
  badge?: string;
  onSendToDraft?: (videoUrl: string) => void;
}

const W = 1080;
const H = 1920;
const DURATION = 7; // seconds
const FPS = 30;
const TOTAL_FRAMES = DURATION * FPS;

// Brand
const BG = "#0f0a1a";
const ACCENT = "#e91e8c";
const ACCENT_ALT = "#9333ea";
const WHITE = "#ffffff";
const MUTED = "rgba(255,255,255,0.6)";

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
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Easing functions
function easeOutQuart(t: number) { return 1 - Math.pow(1 - t, 4); }
function easeInOutCubic(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function renderFrame(
  ctx: CanvasRenderingContext2D,
  frame: number,
  flyerImg: HTMLImageElement | null,
  event: EventData,
  badge: string
) {
  const t = frame / TOTAL_FRAMES; // 0..1 progress
  const PAD = 60;

  // Clear
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Layer 1: Flyer background with slow zoom
  if (flyerImg) {
    const zoom = 1 + t * 0.08; // slow zoom from 1.0 to 1.08
    const imgRatio = flyerImg.width / flyerImg.height;
    const canvasRatio = W / H;
    let sw = flyerImg.width, sh = flyerImg.height, sx = 0, sy = 0;
    if (imgRatio > canvasRatio) {
      sw = flyerImg.height * canvasRatio;
      sx = (flyerImg.width - sw) / 2;
    } else {
      sh = flyerImg.width / canvasRatio;
      sy = (flyerImg.height - sh) / 2;
    }
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-W / 2, -H / 2);
    ctx.drawImage(flyerImg, sx, sy, sw, sh, 0, 0, W, H);
    ctx.restore();
  }

  // Layer 2: Dark overlay (stronger at bottom)
  const bottomGrad = ctx.createLinearGradient(0, H * 0.3, 0, H);
  bottomGrad.addColorStop(0, "rgba(15,10,26,0)");
  bottomGrad.addColorStop(0.35, "rgba(15,10,26,0.5)");
  bottomGrad.addColorStop(0.65, "rgba(15,10,26,0.8)");
  bottomGrad.addColorStop(1, "rgba(15,10,26,0.95)");
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, 0, W, H);

  // Top gradient
  const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.2);
  topGrad.addColorStop(0, "rgba(15,10,26,0.75)");
  topGrad.addColorStop(1, "rgba(15,10,26,0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, H * 0.25);

  // Purple tint
  ctx.fillStyle = "rgba(147,51,234,0.04)";
  ctx.fillRect(0, 0, W, H);

  // =========== SCENE 1: Badge (frames 0 to ~60 = 0-2s) ===========
  const badgeProgress = easeOutQuart(clamp01((frame - 12) / 30));
  if (badgeProgress > 0) {
    ctx.save();
    ctx.globalAlpha = badgeProgress;
    const badgeText = badge.toUpperCase();
    ctx.font = "bold 30px sans-serif";
    const bw = ctx.measureText(badgeText).width + 48;
    const bh = 54;
    const bx = PAD;
    const by = PAD + 40;

    // Badge shadow
    ctx.shadowColor = "rgba(233,30,140,0.3)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 4;

    const bg = ctx.createLinearGradient(bx, by, bx + bw, by);
    bg.addColorStop(0, ACCENT);
    bg.addColorStop(1, ACCENT_ALT);
    ctx.fillStyle = bg;
    roundRect(ctx, bx, by, bw, bh, 27);
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = WHITE;
    ctx.textBaseline = "middle";
    ctx.fillText(badgeText, bx + 24, by + bh / 2 + 1);
    ctx.restore();
  }

  // =========== SCENE 2: Event info (frames 55 to 145 = ~2-5s) ===========
  const infoY = H - 560;

  // Category chip
  const catProgress = easeOutQuart(clamp01((frame - 58) / 22));
  if (catProgress > 0 && event.category) {
    ctx.save();
    ctx.globalAlpha = catProgress;
    ctx.font = "bold 24px sans-serif";
    const catText = event.category.toUpperCase();
    const cw = ctx.measureText(catText).width + 34;
    ctx.fillStyle = "rgba(233,30,140,0.2)";
    roundRect(ctx, PAD, infoY, cw, 42, 21);
    ctx.fill();
    ctx.fillStyle = ACCENT;
    ctx.textBaseline = "middle";
    ctx.fillText(catText, PAD + 17, infoY + 22);
    ctx.restore();
  }

  // Title (slide up + fade — smoother)
  const titleProgress = easeOutQuart(clamp01((frame - 68) / 35));
  if (titleProgress > 0) {
    ctx.save();
    ctx.globalAlpha = titleProgress;
    const slideY = (1 - titleProgress) * 50;
    ctx.font = "bold 58px sans-serif";
    ctx.textBaseline = "top";
    const titleLines = wrapText(ctx, event.title, W - PAD * 2);
    const titleStartY = infoY + 60 + slideY;
    // Shadow for readability
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    titleLines.slice(0, 3).forEach((line, i) => {
      ctx.fillText(line, PAD + 2, titleStartY + i * 68 + 2);
    });
    ctx.fillStyle = WHITE;
    titleLines.slice(0, 3).forEach((line, i) => {
      ctx.fillText(line, PAD, titleStartY + i * 68);
    });
    ctx.restore();
  }

  // Time + date — with glow
  const timeProgress = easeOutQuart(clamp01((frame - 90) / 22));
  if (timeProgress > 0) {
    ctx.save();
    ctx.globalAlpha = timeProgress;
    ctx.font = "bold 34px sans-serif";
    ctx.fillStyle = ACCENT;
    ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(233,30,140,0.2)";
    ctx.shadowBlur = 8;
    const timeStr = formatTime(event.date_time);
    const dateStr = formatDateShort(event.date_time);
    ctx.fillText(`${timeStr}  ·  ${dateStr}`, PAD, infoY + 300);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Venue
  const venueProgress = easeOutQuart(clamp01((frame - 100) / 22));
  if (venueProgress > 0 && event.venue_name) {
    ctx.save();
    ctx.globalAlpha = venueProgress;
    ctx.font = "400 28px sans-serif";
    ctx.fillStyle = MUTED;
    ctx.textBaseline = "top";
    ctx.fillText(`📍  ${event.venue_name}`, PAD, infoY + 350);
    ctx.restore();
  }

  // =========== SCENE 3: CTA (frames 148 to 210 = 5-7s) — cinematic ===========
  const ctaProgress = easeInOutCubic(clamp01((frame - 148) / 28));
  if (ctaProgress > 0) {
    ctx.save();
    ctx.globalAlpha = ctaProgress;

    // Divider
    const divY = H - 170;
    const dg = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    dg.addColorStop(0, "rgba(233,30,140,0.5)");
    dg.addColorStop(0.5, "rgba(147,51,234,0.25)");
    dg.addColorStop(1, "rgba(233,30,140,0)");
    ctx.strokeStyle = dg;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAD, divY);
    ctx.lineTo(W - PAD, divY);
    ctx.stroke();

    // CTA text
    ctx.font = "bold 32px sans-serif";
    ctx.fillStyle = WHITE;
    ctx.textBaseline = "top";
    ctx.fillText("VEJA NA ROXOU", PAD, divY + 22);

    // URL
    ctx.font = "500 26px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("roxou.com.br", PAD, divY + 64);

    // ROXOU brand
    const rg = ctx.createLinearGradient(W - 180, divY + 22, W - PAD, divY + 22);
    rg.addColorStop(0, ACCENT);
    rg.addColorStop(1, ACCENT_ALT);
    ctx.fillStyle = rg;
    ctx.font = "bold 34px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("ROXOU", W - PAD, divY + 32);

    ctx.restore();
  }
}

async function generateReel(
  canvas: HTMLCanvasElement,
  event: EventData,
  badge: string,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Load flyer
  let flyerImg: HTMLImageElement | null = null;
  if (event.image_url) {
    try {
      flyerImg = await loadImage(event.image_url);
    } catch {
      // proceed without flyer
    }
  }

  // Use MediaRecorder with canvas stream
  const stream = canvas.captureStream(FPS);
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 4_000_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };
    recorder.onerror = (e) => reject(e);

    recorder.start();

    let frame = 0;
    const interval = 1000 / FPS;

    function drawNext() {
      if (frame >= TOTAL_FRAMES) {
        recorder.stop();
        return;
      }

      renderFrame(ctx, frame, flyerImg, event, badge);
      onProgress?.(Math.round((frame / TOTAL_FRAMES) * 100));
      frame++;

      setTimeout(drawNext, interval);
    }

    drawNext();
  });
}

export default function ReelGenerator({ event, badge = "HOJE NA ROXOU", onSendToDraft }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (!canvasRef.current) return;
    setGenerating(true);
    setProgress(0);
    setVideoUrl(null);
    try {
      const blob = await generateReel(canvasRef.current, event, badge, setProgress);
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      toast.success("Reel gerado!");
    } catch (err: any) {
      toast.error("Erro ao gerar reel", { description: err.message });
    } finally {
      setGenerating(false);
    }
  }, [event, badge]);

  const download = useCallback(() => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `roxou-reel-${event.title.slice(0, 25).replace(/[^a-zA-Z0-9]/g, "_")}.webm`;
    a.click();
    toast.success("Download iniciado!");
  }, [videoUrl, event.title]);

  return (
    <div className="space-y-2">
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex gap-1.5 flex-wrap items-center">
        <button
          onClick={generate}
          disabled={generating}
          className="flex items-center gap-1 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
        >
          {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Video className="h-3 w-3" />}
          {generating ? `Gerando ${progress}%` : "Gerar Reels"}
        </button>

        {videoUrl && (
          <>
            <button
              onClick={download}
              className="flex items-center gap-1 rounded-md bg-secondary/50 px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition"
            >
              <Download className="h-3 w-3" /> Baixar vídeo
            </button>
            {onSendToDraft && (
              <button
                onClick={() => onSendToDraft(videoUrl)}
                className="flex items-center gap-1 rounded-md bg-primary/15 px-2.5 py-1.5 text-[10px] font-semibold text-primary hover:bg-primary/25 transition"
              >
                <Send className="h-3 w-3" /> Enviar
              </button>
            )}
          </>
        )}
      </div>

      {generating && (
        <div className="w-full h-1.5 rounded-full bg-secondary/30 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {videoUrl && (
        <div className="rounded-lg overflow-hidden border border-border/30 max-w-[200px]">
          <video
            src={videoUrl}
            controls
            autoPlay
            muted
            loop
            playsInline
            className="w-full"
            style={{ aspectRatio: "9/16" }}
          />
        </div>
      )}
    </div>
  );
}

export { generateReel };
