import { useCallback, useRef, useState } from "react";
import { Loader2, Download, Video, Send } from "lucide-react";
import { toast } from "sonner";

/* ── Types ── */
interface EventData {
  title: string;
  date_time: string;
  venue_name: string | null;
  category: string;
  image_url: string | null;
  description?: string | null;
  sub_category?: string | null;
  ticket_url?: string | null;
}

interface Props {
  event: EventData;
  badge?: string;
  secondaryEvents?: EventData[];
  onSendToDraft?: (videoUrl: string) => void;
}

/* ── Constants ── */
const W = 1080;
const H = 1920;
const DURATION = 10;
const FPS = 30;
const TOTAL_FRAMES = DURATION * FPS;

const PAD = 72;
const SAFE_TOP = 120;          // status-bar safe area
const ZONE_CENTER_START = 420;
const ZONE_CENTER_END = 1260;
const ZONE_LIST_START = 1300;
const ZONE_CTA_START = 1620;

const BG = "#1a1a2e";
const ACCENT = "#e91e8c";
const ACCENT_ALT = "#9333ea";
const WHITE = "#ffffff";
const GREY = "rgba(255,255,255,0.55)";

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MONTHS = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];

/* ── Helpers ── */
function fmtTime(dt: string) {
  const d = new Date(dt);
  return `${String(d.getHours()).padStart(2,"0")}h${String(d.getMinutes()).padStart(2,"0")}`;
}
function fmtDate(dt: string) {
  const d = new Date(dt);
  return `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}
function fmtWeekday(dt: string) {
  return WEEKDAYS[new Date(dt).getDay()];
}

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }
function easeOut(t: number) { return 1 - Math.pow(1 - t, 4); }
function easeInOut(t: number) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines = 2): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      if (lines.length >= maxLines) return lines;
      cur = w;
    } else { cur = test; }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines;
}

function extractArtist(desc?: string | null): string | null {
  if (!desc) return null;
  const m = desc.match(/\bcom\s+([A-ZÀ-Ú][^\n,.]{2,35})/i);
  if (m) return m[1].trim();
  const dj = desc.match(/\b(?:DJ|Dj|dj)\s+([^\n,.]{2,25})/);
  if (dj) return `DJ ${dj[1].trim()}`;
  return null;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("img load failed"));
    img.src = src;
  });
}

/* ══════════════════════════════════════
   ZONE 0 — BACKGROUND + ATMOSPHERE
   ══════════════════════════════════════ */
function drawBackground(
  ctx: CanvasRenderingContext2D,
  frame: number,
  img: HTMLImageElement | null
) {
  const t = frame / TOTAL_FRAMES;

  // Solid dark base
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Hero image with cinematic zoom
  if (img) {
    const zoom = 1.08 + t * 0.08;
    const panY = Math.sin(t * Math.PI) * 20;
    const ratio = img.width / img.height;
    const canvasRatio = W / H;
    let sw = img.width, sh = img.height, sx = 0, sy = 0;
    if (ratio > canvasRatio) { sw = img.height * canvasRatio; sx = (img.width - sw) / 2; }
    else { sh = img.width / canvasRatio; sy = (img.height - sh) / 2; }

    ctx.save();
    ctx.translate(W / 2, H / 2 + panY);
    ctx.scale(zoom, zoom);
    ctx.translate(-W / 2, -H / 2);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
    ctx.restore();
  }

  // Heavy overlay (85% opacity)
  const ov = ctx.createLinearGradient(0, 0, 0, H);
  ov.addColorStop(0, "rgba(26,26,46,0.88)");
  ov.addColorStop(0.3, "rgba(26,26,46,0.82)");
  ov.addColorStop(0.6, "rgba(26,26,46,0.78)");
  ov.addColorStop(1, "rgba(26,26,46,0.92)");
  ctx.fillStyle = ov;
  ctx.fillRect(0, 0, W, H);

  // Central glow (pulsing)
  const pulse = 0.9 + Math.sin(frame * 0.06) * 0.1;
  const glow = ctx.createRadialGradient(W / 2, H * 0.42, 60, W / 2, H * 0.42, 500 * pulse);
  glow.addColorStop(0, "rgba(233,30,140,0.12)");
  glow.addColorStop(0.5, "rgba(147,51,234,0.06)");
  glow.addColorStop(1, "rgba(147,51,234,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Vignette
  const vig = ctx.createRadialGradient(W/2, H/2, W*0.3, W/2, H/2, W);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // Subtle grain
  ctx.save();
  ctx.globalAlpha = 0.025;
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "white" : "black";
    ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
  }
  ctx.restore();
}

/* ══════════════════════════════════════
   ZONE 1 — TOP (SAFE AREA)
   Header badge + date
   Y: 120 → 340
   ══════════════════════════════════════ */
function drawZoneTop(ctx: CanvasRenderingContext2D, frame: number, event: EventData, badge: string) {
  const p = easeOut(clamp01((frame - 5) / 20));
  if (p <= 0) return;

  ctx.save();
  ctx.globalAlpha = p * 0.75;  // discrete — doesn't compete

  // "AGENDA DE HOJE" / badge
  const badgeText = badge.toUpperCase();
  ctx.font = "600 22px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = GREY;
  ctx.fillText(badgeText, W / 2, SAFE_TOP);

  // Thin separator
  const sepW = 120 * p;
  const sepGrad = ctx.createLinearGradient(W/2 - sepW/2, 0, W/2 + sepW/2, 0);
  sepGrad.addColorStop(0, "rgba(233,30,140,0)");
  sepGrad.addColorStop(0.5, "rgba(233,30,140,0.5)");
  sepGrad.addColorStop(1, "rgba(233,30,140,0)");
  ctx.strokeStyle = sepGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W/2 - sepW/2, SAFE_TOP + 34);
  ctx.lineTo(W/2 + sepW/2, SAFE_TOP + 34);
  ctx.stroke();

  // Weekday + Date
  const d = new Date(event.date_time);
  ctx.font = "bold 28px sans-serif";
  ctx.fillStyle = WHITE;
  ctx.globalAlpha = p * 0.85;
  ctx.fillText(`${fmtWeekday(event.date_time)}, ${d.getDate()} DE ${MONTHS[d.getMonth()]}`, W / 2, SAFE_TOP + 52);

  // ROXOU mark
  ctx.font = "bold 18px sans-serif";
  ctx.globalAlpha = p * 0.35;
  const rg = ctx.createLinearGradient(W/2 - 40, 0, W/2 + 40, 0);
  rg.addColorStop(0, ACCENT);
  rg.addColorStop(1, ACCENT_ALT);
  ctx.fillStyle = rg;
  ctx.fillText("ROXOU", W / 2, SAFE_TOP + 94);

  ctx.restore();
}

/* ══════════════════════════════════════
   ZONE 2 — CENTER (HERO CARD)
   Glass panel + title + metadata
   Y: 420 → 1260
   ══════════════════════════════════════ */
function drawZoneCenter(ctx: CanvasRenderingContext2D, frame: number, event: EventData) {
  const enterStart = 18;
  const p = easeOut(clamp01((frame - enterStart) / 28));
  if (p <= 0) return;

  const cx = PAD;
  const cardW = W - PAD * 2;
  const cardY = ZONE_CENTER_START;
  const cardH = ZONE_CENTER_END - ZONE_CENTER_START;

  // Glass panel
  ctx.save();
  ctx.globalAlpha = p * 0.65;
  ctx.fillStyle = "rgba(26,26,46,0.7)";
  roundRect(ctx, cx, cardY, cardW, cardH, 28);
  ctx.fill();

  // Panel border glow
  ctx.globalAlpha = p * 0.3;
  const borderGrad = ctx.createLinearGradient(cx, cardY, cx + cardW, cardY + cardH);
  borderGrad.addColorStop(0, ACCENT);
  borderGrad.addColorStop(0.5, "rgba(147,51,234,0.4)");
  borderGrad.addColorStop(1, ACCENT);
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 1.5;
  roundRect(ctx, cx, cardY, cardW, cardH, 28);
  ctx.stroke();
  ctx.restore();

  // === Inner content with strict Y tracking ===
  const innerPad = 48;
  const innerX = cx + innerPad;
  const innerW = cardW - innerPad * 2;
  let curY = cardY + 48;

  // Category chip
  const catP = easeOut(clamp01((frame - enterStart - 8) / 18));
  if (catP > 0) {
    ctx.save();
    ctx.globalAlpha = catP * 0.85;
    const catText = (event.sub_category || event.category).toUpperCase();
    ctx.font = "bold 18px sans-serif";
    const cw = ctx.measureText(catText).width + 28;
    const catX = (W - cw) / 2;
    ctx.fillStyle = "rgba(233,30,140,0.15)";
    roundRect(ctx, catX, curY, cw, 32, 16);
    ctx.fill();
    ctx.fillStyle = ACCENT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(catText, catX + cw / 2, curY + 16);
    ctx.restore();
    curY += 52;
  }

  // TITLE (big, bold, centered, max 2 lines)
  const titleP = easeOut(clamp01((frame - enterStart - 12) / 25));
  if (titleP > 0) {
    ctx.save();
    ctx.globalAlpha = titleP;
    ctx.font = "bold 68px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const titleLines = wrapText(ctx, event.title, innerW, 2);

    // Text glow
    ctx.shadowColor = "rgba(233,30,140,0.25)";
    ctx.shadowBlur = 30;

    const slideY = (1 - titleP) * 40;
    titleLines.forEach((line, i) => {
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillText(line, W / 2 + 2, curY + i * 82 + slideY + 2);
      // Text
      ctx.fillStyle = WHITE;
      ctx.fillText(line, W / 2, curY + i * 82 + slideY);
    });
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.restore();
    curY += titleLines.length * 82 + 24;
  }

  // Divider
  const divP = easeOut(clamp01((frame - enterStart - 22) / 16));
  if (divP > 0) {
    ctx.save();
    ctx.globalAlpha = divP * 0.4;
    const divW = 200 * divP;
    const dg = ctx.createLinearGradient(W/2 - divW/2, 0, W/2 + divW/2, 0);
    dg.addColorStop(0, "rgba(233,30,140,0)");
    dg.addColorStop(0.5, ACCENT);
    dg.addColorStop(1, "rgba(233,30,140,0)");
    ctx.strokeStyle = dg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W/2 - divW/2, curY);
    ctx.lineTo(W/2 + divW/2, curY);
    ctx.stroke();
    ctx.restore();
    curY += 28;
  }

  // TIME — neon accent
  const timeP = easeOut(clamp01((frame - enterStart - 26) / 18));
  if (timeP > 0) {
    ctx.save();
    ctx.globalAlpha = timeP;
    ctx.font = "bold 44px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(233,30,140,0.4)";
    ctx.shadowBlur = 16;
    ctx.fillStyle = ACCENT;
    ctx.fillText(fmtTime(event.date_time), W / 2, curY);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.restore();
    curY += 60;
  }

  // VENUE — grey with icon
  if (event.venue_name) {
    const venP = easeOut(clamp01((frame - enterStart - 30) / 16));
    if (venP > 0) {
      ctx.save();
      ctx.globalAlpha = venP * 0.8;
      ctx.font = "500 28px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = GREY;
      ctx.fillText(`📍  ${event.venue_name}`, W / 2, curY);
      ctx.restore();
      curY += 46;
    }
  }

  // ARTIST (if found)
  const artist = extractArtist(event.description);
  if (artist) {
    const aP = easeOut(clamp01((frame - enterStart - 34) / 16));
    if (aP > 0) {
      ctx.save();
      ctx.globalAlpha = aP * 0.7;
      ctx.font = "italic 24px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(233,30,140,0.8)";
      ctx.fillText(`✦  ${artist}`, W / 2, curY);
      ctx.restore();
      curY += 40;
    }
  }

  // DATE block
  const dateP = easeOut(clamp01((frame - enterStart - 36) / 16));
  if (dateP > 0) {
    ctx.save();
    ctx.globalAlpha = dateP * 0.6;
    ctx.font = "500 22px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = GREY;
    ctx.fillText(`${fmtWeekday(event.date_time)}, ${fmtDate(event.date_time)}`, W / 2, curY);
    ctx.restore();
  }
}

/* ══════════════════════════════════════
   ZONE 3 — SECONDARY LIST (OPTIONAL)
   Y: 1300 → 1560
   ══════════════════════════════════════ */
function drawZoneList(ctx: CanvasRenderingContext2D, frame: number, events: EventData[]) {
  if (!events || events.length === 0) return;

  const listP = easeOut(clamp01((frame - 55) / 22));
  if (listP <= 0) return;

  const items = events.slice(0, 2);
  const itemH = 100;
  const gap = 16;

  // "TAMBÉM HOJE" label
  ctx.save();
  ctx.globalAlpha = listP * 0.35;
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = GREY;
  ctx.fillText("TAMBÉM HOJE", W / 2, ZONE_LIST_START);
  ctx.restore();

  let curY = ZONE_LIST_START + 32;

  items.forEach((ev, i) => {
    const ip = easeOut(clamp01((frame - 58 - i * 8) / 18));
    if (ip <= 0) return;

    ctx.save();
    ctx.globalAlpha = ip * 0.4;  // very discrete

    const iy = curY + i * (itemH + gap);

    // Item bg
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    roundRect(ctx, PAD + 20, iy, W - PAD * 2 - 40, itemH, 14);
    ctx.fill();

    // Time
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = ACCENT;
    ctx.fillText(fmtTime(ev.date_time), PAD + 40, iy + 16);

    // Title (1 line)
    ctx.font = "600 22px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    const maxTitleW = W - PAD * 2 - 200;
    const titleLines = wrapText(ctx, ev.title, maxTitleW, 1);
    ctx.fillText(titleLines[0] || ev.title.slice(0, 30), PAD + 40, iy + 48);

    // Venue small
    if (ev.venue_name) {
      ctx.font = "400 18px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillText(`📍 ${ev.venue_name}`, PAD + 40, iy + 74);
    }

    ctx.restore();
  });
}

/* ══════════════════════════════════════
   ZONE 4 — CTA + BRANDING
   Y: 1620 → 1840
   ══════════════════════════════════════ */
function drawZoneCTA(ctx: CanvasRenderingContext2D, frame: number) {
  const ctaStart = Math.floor(TOTAL_FRAMES * 0.6);
  const p = easeInOut(clamp01((frame - ctaStart) / 25));
  if (p <= 0) return;

  ctx.save();
  ctx.globalAlpha = p;

  // CTA pill
  const pillW = 560;
  const pillH = 56;
  const pillX = (W - pillW) / 2;
  const pillY = ZONE_CTA_START;

  // Pill bg with animated gradient
  const pg = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
  pg.addColorStop(0, ACCENT);
  pg.addColorStop(1, ACCENT_ALT);
  ctx.fillStyle = pg;
  roundRect(ctx, pillX, pillY, pillW, pillH, 28);
  ctx.fill();

  // Pill glow
  ctx.shadowColor = "rgba(233,30,140,0.35)";
  ctx.shadowBlur = 24;
  roundRect(ctx, pillX, pillY, pillW, pillH, 28);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  // CTA text
  ctx.font = "bold 22px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = WHITE;
  ctx.fillText("VEJA A AGENDA COMPLETA", W / 2, pillY + pillH / 2);

  // URL
  ctx.globalAlpha = p * 0.45;
  ctx.font = "500 20px sans-serif";
  ctx.fillStyle = GREY;
  ctx.fillText("roxou.com.br", W / 2, pillY + pillH + 32);

  // ROXOU brand
  ctx.globalAlpha = p;
  const brandGrad = ctx.createLinearGradient(W/2 - 80, 0, W/2 + 80, 0);
  brandGrad.addColorStop(0, ACCENT);
  brandGrad.addColorStop(1, ACCENT_ALT);
  ctx.fillStyle = brandGrad;
  ctx.font = "bold 46px sans-serif";
  ctx.fillText("ROXOU", W / 2, pillY + pillH + 80);

  ctx.restore();
}

/* ══════════════════════════════════════
   PROGRESS BAR
   ══════════════════════════════════════ */
function drawProgressBar(ctx: CanvasRenderingContext2D, frame: number) {
  ctx.save();
  ctx.globalAlpha = 0.3;
  const t = frame / TOTAL_FRAMES;
  const bg = ctx.createLinearGradient(0, 0, W, 0);
  bg.addColorStop(0, ACCENT);
  bg.addColorStop(1, ACCENT_ALT);
  ctx.fillStyle = bg;
  ctx.fillRect(0, H - 6, W * t, 6);
  ctx.restore();
}

/* ══════════════════════════════════════
   MAIN FRAME RENDERER
   ══════════════════════════════════════ */
function renderFrame(
  ctx: CanvasRenderingContext2D,
  frame: number,
  img: HTMLImageElement | null,
  event: EventData,
  badge: string,
  secondaryEvents: EventData[]
) {
  drawBackground(ctx, frame, img);
  drawZoneTop(ctx, frame, event, badge);
  drawZoneCenter(ctx, frame, event);
  drawZoneList(ctx, frame, secondaryEvents);
  drawZoneCTA(ctx, frame);
  drawProgressBar(ctx, frame);
}

/* ══════════════════════════════════════
   VIDEO GENERATION
   ══════════════════════════════════════ */
async function generateReel(
  canvas: HTMLCanvasElement,
  event: EventData,
  badge: string,
  secondaryEvents: EventData[],
  onProgress?: (pct: number) => void
): Promise<Blob> {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  let flyerImg: HTMLImageElement | null = null;
  if (event.image_url) {
    try { flyerImg = await loadImage(event.image_url); } catch { /* ok */ }
  }

  const stream = canvas.captureStream(FPS);
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9" : "video/webm";

  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = (e) => reject(e);
    recorder.start();

    let frame = 0;
    function drawNext() {
      if (frame >= TOTAL_FRAMES) { recorder.stop(); return; }
      renderFrame(ctx, frame, flyerImg, event, badge, secondaryEvents);
      onProgress?.(Math.round((frame / TOTAL_FRAMES) * 100));
      frame++;
      setTimeout(drawNext, 1000 / FPS);
    }
    drawNext();
  });
}

/* ══════════════════════════════════════
   REACT COMPONENT
   ══════════════════════════════════════ */
export default function ReelGenerator({ event, badge = "AGENDA DE HOJE", secondaryEvents = [], onSendToDraft }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (!canvasRef.current) return;
    setGenerating(true); setProgress(0); setVideoUrl(null);
    try {
      const blob = await generateReel(canvasRef.current, event, badge, secondaryEvents, setProgress);
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      toast.success("Reel gerado!");
    } catch (err: any) {
      toast.error("Erro ao gerar reel", { description: err.message });
    } finally { setGenerating(false); }
  }, [event, badge, secondaryEvents]);

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
              <Download className="h-3 w-3" /> Baixar
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
          <video src={videoUrl} controls autoPlay muted loop playsInline className="w-full" style={{ aspectRatio: "9/16" }} />
        </div>
      )}
    </div>
  );
}

export { generateReel };
