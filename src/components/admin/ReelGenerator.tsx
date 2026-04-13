import { useCallback, useRef, useState } from "react";
import { Loader2, Download, Video, Send } from "lucide-react";
import { toast } from "sonner";

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
  onSendToDraft?: (videoUrl: string) => void;
}

const W = 1080;
const H = 1920;
const DURATION = 10;
const FPS = 30;
const TOTAL_FRAMES = DURATION * FPS;

const BG = "#0f0a1a";
const ACCENT = "#e91e8c";
const ACCENT_ALT = "#9333ea";
const WHITE = "#ffffff";

const WEEKDAYS = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];
const WEEKDAYS_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MONTHS = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];

function formatTime(dt: string) {
  const d = new Date(dt);
  return `${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDateFull(dt: string) {
  const d = new Date(dt);
  return `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
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

// Easing
function easeOutQuart(t: number) { return 1 - Math.pow(1 - t, 4); }
function easeOutExpo(t: number) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
function easeInOutCubic(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function easeOutBack(t: number) { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
function easeOutElastic(t: number) { if (t === 0 || t === 1) return t; return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1; }
function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function extractArtist(desc?: string | null): string | null {
  if (!desc) return null;
  const comMatch = desc.match(/\bcom\s+([A-ZÀ-Ú][^\n,.]{2,40})/i);
  if (comMatch) return comMatch[1].trim();
  const djMatch = desc.match(/\b(?:DJ|Dj|dj)\s+([^\n,.]{2,30})/);
  if (djMatch) return `DJ ${djMatch[1].trim()}`;
  return null;
}

function extractPrice(desc?: string | null): string | null {
  if (!desc) return null;
  const m = desc.match(/R\$\s*[\d,.]+/i);
  return m ? m[0] : null;
}

// Layout variant based on event title hash
type LayoutVariant = "left" | "center" | "right";
function getLayoutVariant(title: string): LayoutVariant {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = ((hash << 5) - hash + title.charCodeAt(i)) | 0;
  const variants: LayoutVariant[] = ["left", "center", "right"];
  return variants[Math.abs(hash) % 3];
}

// ====== SCENE RENDERERS ======

/** Scene 1: Intro with badge + date (0-2.5s) */
function renderScene1(
  ctx: CanvasRenderingContext2D,
  frame: number,
  event: EventData,
  badge: string,
  layout: LayoutVariant
) {
  const PAD = 70;
  const d = new Date(event.date_time);

  // Badge pill
  const badgeP = easeOutBack(clamp01((frame - 8) / 25));
  if (badgeP > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, badgeP);
    const scale = 0.6 + 0.4 * badgeP;
    const badgeText = badge.toUpperCase();
    ctx.font = "bold 28px sans-serif";
    const bw = ctx.measureText(badgeText).width + 52;
    const bh = 56;
    let bx = PAD;
    if (layout === "center") bx = (W - bw) / 2;
    else if (layout === "right") bx = W - PAD - bw;
    const by = 100;

    ctx.translate(bx + bw / 2, by + bh / 2);
    ctx.scale(scale, scale);
    ctx.translate(-(bx + bw / 2), -(by + bh / 2));

    ctx.shadowColor = "rgba(233,30,140,0.4)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 4;

    const bg = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    bg.addColorStop(0, ACCENT);
    bg.addColorStop(1, ACCENT_ALT);
    ctx.fillStyle = bg;
    roundRect(ctx, bx, by, bw, bh, 28);
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = WHITE;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(badgeText, bx + bw / 2, by + bh / 2 + 1);
    ctx.restore();
  }

  // Weekday + date block
  const dateP = easeOutQuart(clamp01((frame - 20) / 22));
  if (dateP > 0) {
    ctx.save();
    ctx.globalAlpha = dateP;
    const slideX = layout === "right" ? (1 - dateP) * 40 : layout === "left" ? -(1 - dateP) * 40 : 0;
    const slideY = layout === "center" ? (1 - dateP) * 30 : 0;

    let tx = PAD;
    let align: CanvasTextAlign = "left";
    if (layout === "center") { tx = W / 2; align = "center"; }
    else if (layout === "right") { tx = W - PAD; align = "right"; }

    ctx.textAlign = align;
    ctx.textBaseline = "top";

    // Weekday large
    ctx.font = "bold 44px sans-serif";
    ctx.fillStyle = WHITE;
    ctx.fillText(WEEKDAYS[d.getDay()], tx + slideX, 190 + slideY);

    // Date + time
    ctx.font = "500 30px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(`${formatDateFull(event.date_time)}  ·  ${formatTime(event.date_time)}`, tx + slideX, 244 + slideY);

    ctx.restore();
  }

  // Category chip
  const catP = easeOutQuart(clamp01((frame - 35) / 18));
  if (catP > 0 && event.category) {
    ctx.save();
    ctx.globalAlpha = catP * 0.9;
    const catText = (event.sub_category || event.category).toUpperCase();
    ctx.font = "bold 20px sans-serif";
    const cw = ctx.measureText(catText).width + 32;
    let cx = PAD;
    if (layout === "center") cx = (W - cw) / 2;
    else if (layout === "right") cx = W - PAD - cw;

    ctx.fillStyle = "rgba(233,30,140,0.15)";
    roundRect(ctx, cx, 296, cw, 38, 19);
    ctx.fill();
    ctx.fillStyle = ACCENT;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(catText, cx + cw / 2, 316);
    ctx.restore();
  }
}

/** Scene 2: Hero title + metadata (2-6.5s) */
function renderScene2(
  ctx: CanvasRenderingContext2D,
  frame: number,
  event: EventData,
  layout: LayoutVariant
) {
  const PAD = 70;
  const sceneStart = 60; // 2s
  const artist = extractArtist(event.description);
  const price = extractPrice(event.description);

  let align: CanvasTextAlign = "left";
  let tx = PAD;
  let maxW = W - PAD * 2;
  if (layout === "center") { align = "center"; tx = W / 2; }
  else if (layout === "right") { align = "right"; tx = W - PAD; }

  // Glass panel background
  const panelP = easeInOutCubic(clamp01((frame - sceneStart) / 30));
  if (panelP > 0) {
    ctx.save();
    ctx.globalAlpha = panelP * 0.6;

    // Compute panel area
    ctx.font = "bold 64px sans-serif";
    const titleLines = wrapText(ctx, event.title, maxW).slice(0, 3);
    const titleH = titleLines.length * 78;
    const metaH = 180 + (artist ? 50 : 0) + (price ? 50 : 0);
    const panelH = titleH + metaH + 80;
    const panelY = H * 0.38;
    const panelX = layout === "center" ? PAD - 20 : layout === "right" ? W - PAD - (maxW + 40) : PAD - 20;

    ctx.fillStyle = "rgba(15,10,26,0.7)";
    roundRect(ctx, panelX, panelY, maxW + 40, panelH, 24);
    ctx.fill();

    // Glow behind panel
    const glow = ctx.createRadialGradient(W / 2, panelY + panelH / 2, 50, W / 2, panelY + panelH / 2, 400);
    glow.addColorStop(0, "rgba(147,51,234,0.12)");
    glow.addColorStop(1, "rgba(147,51,234,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, panelY - 50, W, panelH + 100);

    ctx.restore();
  }

  // Title — staggered word reveal
  const titleP = easeOutExpo(clamp01((frame - sceneStart - 5) / 30));
  if (titleP > 0) {
    ctx.save();
    ctx.font = "bold 64px sans-serif";
    const titleLines = wrapText(ctx, event.title, maxW).slice(0, 3);
    ctx.textAlign = align;
    ctx.textBaseline = "top";

    const baseY = H * 0.38 + 40;

    titleLines.forEach((line, i) => {
      const lineP = easeOutExpo(clamp01((frame - sceneStart - 5 - i * 6) / 28));
      if (lineP <= 0) return;
      ctx.globalAlpha = lineP;
      const slideY = (1 - lineP) * 50;

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillText(line, tx + 3, baseY + i * 78 + slideY + 3);
      // Text
      ctx.fillStyle = WHITE;
      ctx.fillText(line, tx, baseY + i * 78 + slideY);
    });
    ctx.restore();
  }

  // Metadata block below title
  ctx.font = "bold 64px sans-serif";
  const titleLinesCount = Math.min(wrapText(ctx, event.title, maxW).length, 3);
  let metaY = H * 0.38 + 40 + titleLinesCount * 78 + 24;

  // Divider line
  const divP = easeOutQuart(clamp01((frame - sceneStart - 30) / 20));
  if (divP > 0) {
    ctx.save();
    ctx.globalAlpha = divP * 0.5;
    const lineW = (maxW - 40) * divP;
    let lx = PAD;
    if (layout === "center") lx = (W - lineW) / 2;
    else if (layout === "right") lx = W - PAD - lineW;
    const dg = ctx.createLinearGradient(lx, 0, lx + lineW, 0);
    dg.addColorStop(0, ACCENT);
    dg.addColorStop(1, ACCENT_ALT);
    ctx.strokeStyle = dg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, metaY);
    ctx.lineTo(lx + lineW, metaY);
    ctx.stroke();
    ctx.restore();
    metaY += 20;
  }

  // Artist
  if (artist) {
    const aP = easeOutQuart(clamp01((frame - sceneStart - 35) / 18));
    if (aP > 0) {
      ctx.save();
      ctx.globalAlpha = aP;
      ctx.font = "italic 30px sans-serif";
      ctx.textAlign = align;
      ctx.textBaseline = "top";
      ctx.fillStyle = ACCENT;
      ctx.fillText(`✦  ${artist}`, tx, metaY);
      ctx.restore();
      metaY += 46;
    }
  }

  // Venue
  if (event.venue_name) {
    const vP = easeOutQuart(clamp01((frame - sceneStart - 40) / 18));
    if (vP > 0) {
      ctx.save();
      ctx.globalAlpha = vP;
      ctx.font = "500 30px sans-serif";
      ctx.textAlign = align;
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText(`📍  ${event.venue_name}`, tx, metaY);
      ctx.restore();
      metaY += 46;
    }
  }

  // Time highlight
  const tP = easeOutElastic(clamp01((frame - sceneStart - 45) / 25));
  if (tP > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, tP);
    ctx.font = "bold 36px sans-serif";
    ctx.textAlign = align;
    ctx.textBaseline = "top";
    const timeStr = `🕐  ${formatTime(event.date_time)}  ·  ${formatDateFull(event.date_time)}`;
    // Glow
    ctx.shadowColor = "rgba(233,30,140,0.3)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = ACCENT;
    ctx.fillText(timeStr, tx, metaY);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.restore();
    metaY += 50;
  }

  // Price tag
  if (price) {
    const pP = easeOutQuart(clamp01((frame - sceneStart - 52) / 18));
    if (pP > 0) {
      ctx.save();
      ctx.globalAlpha = pP;
      ctx.font = "bold 28px sans-serif";
      const priceText = `🎫  ${price}`;
      const pw = ctx.measureText(priceText).width + 32;
      let px = PAD;
      if (layout === "center") px = (W - pw) / 2;
      else if (layout === "right") px = W - PAD - pw;
      ctx.fillStyle = "rgba(233,30,140,0.15)";
      roundRect(ctx, px, metaY, pw, 44, 22);
      ctx.fill();
      ctx.fillStyle = WHITE;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(priceText, px + pw / 2, metaY + 22);
      ctx.restore();
    }
  }
}

/** Scene 3: CTA + branding (7-10s) */
function renderScene3(
  ctx: CanvasRenderingContext2D,
  frame: number,
  layout: LayoutVariant
) {
  const PAD = 70;
  const ctaStart = Math.floor(TOTAL_FRAMES * 0.7); // 7s
  const ctaP = easeInOutCubic(clamp01((frame - ctaStart) / 25));
  if (ctaP <= 0) return;

  ctx.save();
  ctx.globalAlpha = ctaP;

  // Full-width glass panel at bottom
  const panelY = H - 340;
  const panelH = 280;
  ctx.fillStyle = "rgba(15,10,26,0.8)";
  roundRect(ctx, PAD - 10, panelY, W - PAD * 2 + 20, panelH, 20);
  ctx.fill();

  // Animated gradient border
  const borderGrad = ctx.createLinearGradient(PAD, panelY, W - PAD, panelY);
  borderGrad.addColorStop(0, ACCENT);
  borderGrad.addColorStop(0.5 + Math.sin(frame * 0.08) * 0.3, ACCENT_ALT);
  borderGrad.addColorStop(1, ACCENT);
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2;
  roundRect(ctx, PAD - 10, panelY, W - PAD * 2 + 20, panelH, 20);
  ctx.stroke();

  // CTA text
  const ctaTexts = [
    "CONFIRA NA ROXOU",
    "VEJA A AGENDA COMPLETA",
    "DESCUBRA MAIS NA ROXOU",
  ];
  const ctaIdx = Math.abs(layout.charCodeAt(0)) % ctaTexts.length;

  const pulse = 1 + Math.sin(frame * 0.12) * 0.015;
  ctx.save();
  ctx.translate(W / 2, panelY + 60);
  ctx.scale(pulse, pulse);
  ctx.font = "bold 40px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Text glow
  ctx.shadowColor = "rgba(233,30,140,0.4)";
  ctx.shadowBlur = 20;
  ctx.fillStyle = WHITE;
  ctx.fillText(ctaTexts[ctaIdx], 0, 0);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.restore();

  // URL
  ctx.font = "500 26px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("roxou.com.br", W / 2, panelY + 100);

  // ROXOU brand with gradient
  const rg = ctx.createLinearGradient(W / 2 - 80, 0, W / 2 + 80, 0);
  rg.addColorStop(0, ACCENT);
  rg.addColorStop(1, ACCENT_ALT);
  ctx.fillStyle = rg;
  ctx.font = "bold 52px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ROXOU", W / 2, panelY + 160);

  // Animated sparkle dots
  const sparkleP = clamp01((frame - ctaStart - 20) / 20);
  if (sparkleP > 0) {
    ctx.globalAlpha = ctaP * sparkleP * 0.6;
    const dotCount = 5;
    for (let i = 0; i < dotCount; i++) {
      const angle = (i / dotCount) * Math.PI * 2 + frame * 0.03;
      const radius = 160 + Math.sin(frame * 0.05 + i) * 20;
      const dx = W / 2 + Math.cos(angle) * radius;
      const dy = panelY + 170 + Math.sin(angle) * 30;
      ctx.fillStyle = i % 2 === 0 ? ACCENT : ACCENT_ALT;
      ctx.beginPath();
      ctx.arc(dx, dy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// ====== MAIN RENDER ======

function renderFrame(
  ctx: CanvasRenderingContext2D,
  frame: number,
  flyerImg: HTMLImageElement | null,
  event: EventData,
  badge: string
) {
  const t = frame / TOTAL_FRAMES;
  const layout = getLayoutVariant(event.title);

  // Clear
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Background image with cinematic zoom + pan based on layout
  if (flyerImg) {
    const zoom = 1.05 + t * 0.12;
    let panX = 0, panY = 0;
    if (layout === "left") {
      panX = Math.sin(t * Math.PI) * 25;
      panY = -t * 15;
    } else if (layout === "right") {
      panX = -Math.sin(t * Math.PI) * 25;
      panY = t * 10;
    } else {
      panX = Math.sin(t * Math.PI * 2) * 10;
      panY = Math.cos(t * Math.PI) * 15;
    }

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
    ctx.translate(W / 2 + panX, H / 2 + panY);
    ctx.scale(zoom, zoom);
    ctx.translate(-W / 2, -H / 2);
    ctx.drawImage(flyerImg, sx, sy, sw, sh, 0, 0, W, H);
    ctx.restore();
  }

  // Dark overlays — heavier for text legibility
  const bottomGrad = ctx.createLinearGradient(0, H * 0.15, 0, H);
  bottomGrad.addColorStop(0, "rgba(15,10,26,0)");
  bottomGrad.addColorStop(0.25, "rgba(15,10,26,0.4)");
  bottomGrad.addColorStop(0.5, "rgba(15,10,26,0.75)");
  bottomGrad.addColorStop(0.75, "rgba(15,10,26,0.92)");
  bottomGrad.addColorStop(1, "rgba(15,10,26,0.98)");
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, 0, W, H);

  const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.25);
  topGrad.addColorStop(0, "rgba(15,10,26,0.8)");
  topGrad.addColorStop(1, "rgba(15,10,26,0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, H * 0.3);

  // Purple tint
  ctx.fillStyle = "rgba(147,51,234,0.04)";
  ctx.fillRect(0, 0, W, H);

  // Animated floating particles
  ctx.save();
  ctx.globalAlpha = 0.15;
  const particleCount = 8;
  for (let i = 0; i < particleCount; i++) {
    const px = ((i * 137 + frame * 0.3) % W);
    const py = ((i * 251 + frame * 0.5) % H);
    const size = 2 + Math.sin(frame * 0.02 + i) * 1.5;
    ctx.fillStyle = i % 2 === 0 ? ACCENT : ACCENT_ALT;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Render scenes
  renderScene1(ctx, frame, event, badge, layout);
  renderScene2(ctx, frame, event, layout);
  renderScene3(ctx, frame, layout);

  // Vignette
  const vigGrad = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.95);
  vigGrad.addColorStop(0, "rgba(0,0,0,0)");
  vigGrad.addColorStop(1, "rgba(0,0,0,0.3)");
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, W, H);

  // Grain
  ctx.save();
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < 600; i++) {
    const gx = Math.random() * W;
    const gy = Math.random() * H;
    ctx.fillStyle = Math.random() > 0.5 ? "white" : "black";
    ctx.fillRect(gx, gy, 1, 1);
  }
  ctx.restore();

  // Progress bar at bottom
  ctx.save();
  ctx.globalAlpha = 0.3;
  const barW = W * t;
  const barGrad = ctx.createLinearGradient(0, 0, W, 0);
  barGrad.addColorStop(0, ACCENT);
  barGrad.addColorStop(1, ACCENT_ALT);
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, H - 6, barW, 6);
  ctx.restore();
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

  let flyerImg: HTMLImageElement | null = null;
  if (event.image_url) {
    try {
      flyerImg = await loadImage(event.image_url);
    } catch { /* proceed without flyer */ }
  }

  const stream = canvas.captureStream(FPS);
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 5_000_000,
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

  const layout = getLayoutVariant(event.title);
  const layoutLabel = layout === "center" ? "Centralizado" : layout === "right" ? "Direita" : "Esquerda";

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

        <span className="text-[9px] text-muted-foreground bg-secondary/30 px-2 py-0.5 rounded-full">
          Layout: {layoutLabel}
        </span>

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
