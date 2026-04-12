/**
 * Premium canvas renderers for Roxou Instagram content.
 * Formats: Feed (1080x1350), Story (1080x1920), Flyer (1080x1350), Banner Festival (1920x1080).
 * Each format has a unique layout optimized for its context.
 */

// ============ CONSTANTS ============

const BG = "#0f0a1a";
const ACCENT = "#e91e8c";
const ACCENT_ALT = "#9333ea";
const WHITE = "#ffffff";
const MUTED = "rgba(255,255,255,0.5)";

export type ArtFormat = "feed" | "story" | "flyer" | "banner";
export const FORMAT_SIZES: Record<ArtFormat, { w: number; h: number; label: string }> = {
  feed:   { w: 1080, h: 1350, label: "Feed 4:5" },
  story:  { w: 1080, h: 1920, label: "Story 9:16" },
  flyer:  { w: 1080, h: 1350, label: "Flyer" },
  banner: { w: 1920, h: 1080, label: "Banner Festival" },
};

export interface CoverEvent {
  title: string;
  date_time: string;
  venue_name: string | null;
  category: string;
  image_url: string | null;
  description?: string | null;
  ticket_url?: string | null;
  sub_category?: string | null;
}

export interface CoverPartner {
  name: string;
  logo_url: string | null;
  views: number;
}

// ============ HELPERS ============

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

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

const WEEKDAYS = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];

function getDayLabel(): string { return WEEKDAYS[new Date().getDay()]; }
function getDateShort(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatTime(dt: string) {
  const d = new Date(dt);
  return `${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`;
}

function extractArtist(desc?: string | null): string | null {
  if (!desc) return null;
  const comMatch = desc.match(/\bcom\s+([A-ZÀ-Ú][^\n,.]{2,40})/i);
  if (comMatch) return comMatch[1].trim();
  const djMatch = desc.match(/\b(?:DJ|Dj|dj)\s+([^\n,.]{2,30})/);
  if (djMatch) return `DJ ${djMatch[1].trim()}`;
  return null;
}

function extractPrice(desc?: string | null, ticketUrl?: string | null): string | null {
  if (desc) {
    if (/\b(?:entrada\s+(?:franca|livre|grátis|gratuita)|free|grátis)\b/i.test(desc)) return "ENTRADA GRATUITA";
    const m = desc.match(/R\$\s*(\d+(?:[.,]\d{2})?)/);
    if (m) return `A PARTIR DE R$${m[1]}`;
  }
  if (ticketUrl) return "INGRESSOS DISPONÍVEIS";
  return null;
}

const TITLE_VARIATIONS = [
  "🔥 HOJE EM PRUDENTE",
  "OS MELHORES ROLÊS DE HOJE",
  "O QUE VAI LOTAR HOJE",
  "AGENDA DE HOJE",
  "O QUE ROLA HOJE EM PRUDENTE",
];

function pickTitle(seed: number = 0): string {
  return TITLE_VARIATIONS[seed % TITLE_VARIATIONS.length];
}

// ============ DRAWING PRIMITIVES ============

function drawGrain(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.globalAlpha = 0.025;
  for (let i = 0; i < 2000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#000";
    ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 2, Math.random() * 2);
  }
  ctx.restore();
}

function drawGlow(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, color = ACCENT, alpha = 0.12) {
  const g = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
  g.addColorStop(0, `rgba(233,30,140,${alpha})`);
  g.addColorStop(0.5, `rgba(147,51,234,${alpha * 0.5})`);
  g.addColorStop(1, "rgba(15,10,26,0)");
  ctx.fillStyle = g;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
}

/** Draw a single hero image as full-bleed background with blur-like overlay + gradient */
async function drawHeroBg(ctx: CanvasRenderingContext2D, w: number, h: number, imageUrl: string | null) {
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
      // Draw slightly zoomed (1.08x) for cinematic feel
      const zoom = 0.08;
      const zw = sw * (1 - zoom), zh = sh * (1 - zoom);
      ctx.drawImage(img, sx + (sw - zw) / 2, sy + (sh - zh) / 2, zw, zh, 0, 0, w, h);
    } catch { /* fallback solid */ }
  }

  // Heavy dark overlay for readability
  const ov = ctx.createLinearGradient(0, 0, 0, h);
  ov.addColorStop(0, "rgba(15,10,26,0.55)");
  ov.addColorStop(0.35, "rgba(15,10,26,0.7)");
  ov.addColorStop(0.6, "rgba(15,10,26,0.88)");
  ov.addColorStop(1, "rgba(15,10,26,0.96)");
  ctx.fillStyle = ov;
  ctx.fillRect(0, 0, w, h);

  // Purple/pink tint
  ctx.fillStyle = "rgba(147,51,234,0.04)";
  ctx.fillRect(0, 0, w, h);
}

function drawBadge(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 22) {
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
  ctx.shadowColor = "rgba(233,30,140,0.3)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;
  ctx.fill();
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = WHITE;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 18, y + bh / 2 + 1);
  ctx.restore();
}

function drawIsolatedCTA(ctx: CanvasRenderingContext2D, w: number, h: number, pad: number) {
  // Divider
  const divY = h - 110;
  const divGrad = ctx.createLinearGradient(pad, 0, w - pad, 0);
  divGrad.addColorStop(0, "rgba(233,30,140,0.4)");
  divGrad.addColorStop(0.5, "rgba(147,51,234,0.15)");
  divGrad.addColorStop(1, "rgba(233,30,140,0)");
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad, divY); ctx.lineTo(w - pad, divY); ctx.stroke();

  // CTA text centered
  ctx.save();
  ctx.font = "bold 24px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("🔥 VEJA TODOS OS EVENTOS EM ROXOU.COM.BR", w / 2, divY + 20);
  ctx.restore();

  // Brand
  ctx.save();
  ctx.font = "bold 28px sans-serif";
  const g = ctx.createLinearGradient(w / 2 - 60, 0, w / 2 + 60, 0);
  g.addColorStop(0, ACCENT); g.addColorStop(1, ACCENT_ALT);
  ctx.fillStyle = g;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("ROXOU", w / 2, divY + 56);
  ctx.restore();
}

/** Draw a small support event row (for the bottom list) */
function drawSupportItem(ctx: CanvasRenderingContext2D, e: CoverEvent, x: number, y: number, maxW: number) {
  const time = formatTime(e.date_time);

  // Time in accent
  ctx.save();
  ctx.font = "bold 22px sans-serif";
  ctx.fillStyle = ACCENT;
  ctx.textBaseline = "middle";
  ctx.fillText(time, x, y + 16);
  ctx.restore();

  // Thin separator
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x + 80, y + 6, 1, 20);

  // Title
  ctx.font = "500 20px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.textBaseline = "middle";
  const titleMaxW = maxW - 100;
  const tt = ctx.measureText(e.title).width > titleMaxW ? e.title.slice(0, 30) + "…" : e.title;
  ctx.fillText(tt, x + 92, y + 16);
}

// ============ LEGACY HELPERS (used by Partners, Flyer, Banner) ============

async function drawFlyerBg(ctx: CanvasRenderingContext2D, w: number, h: number, imageUrls: string[], overlayStrength = 0.85) {
  const urls = imageUrls.filter(Boolean).slice(0, 3);
  if (urls.length > 0) {
    const colW = w / urls.length;
    for (let i = 0; i < urls.length; i++) {
      try {
        const img = await loadImage(urls[i]);
        const imgRatio = img.width / img.height;
        const targetRatio = colW / h;
        let sw = img.width, sh = img.height, sx = 0, sy = 0;
        if (imgRatio > targetRatio) { sw = img.height * targetRatio; sx = (img.width - sw) / 2; }
        else { sh = img.width / targetRatio; sy = (img.height - sh) / 2; }
        ctx.drawImage(img, sx, sy, sw, sh, i * colW, 0, colW, h);
      } catch { /* skip */ }
    }
    ctx.fillStyle = `rgba(15,10,26,${overlayStrength * 0.4})`;
    ctx.fillRect(0, 0, w, h);
  }
  const overlay = ctx.createLinearGradient(0, 0, 0, h);
  overlay.addColorStop(0, `rgba(15,10,26,${overlayStrength * 0.7})`);
  overlay.addColorStop(0.3, `rgba(15,10,26,${overlayStrength * 0.85})`);
  overlay.addColorStop(1, `rgba(15,10,26,${overlayStrength})`);
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(147,51,234,0.04)";
  ctx.fillRect(0, 0, w, h);
}

function drawFooterBar(ctx: CanvasRenderingContext2D, w: number, h: number, cta: string, pad: number) {
  const footerY = h - 80;
  const divGrad = ctx.createLinearGradient(pad, 0, w - pad, 0);
  divGrad.addColorStop(0, "rgba(233,30,140,0.4)");
  divGrad.addColorStop(0.5, "rgba(147,51,234,0.2)");
  divGrad.addColorStop(1, "rgba(233,30,140,0)");
  ctx.strokeStyle = divGrad; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad, footerY - 20); ctx.lineTo(w - pad, footerY - 20); ctx.stroke();
  ctx.font = "bold 22px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.textBaseline = "top"; ctx.textAlign = "left";
  ctx.fillText(cta, pad, footerY - 4);
  ctx.font = "400 18px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillText("roxou.com.br", pad, footerY + 22);
  ctx.save();
  ctx.font = "bold 26px sans-serif";
  const g = ctx.createLinearGradient(w - 180, footerY, w - pad, footerY);
  g.addColorStop(0, ACCENT); g.addColorStop(1, ACCENT_ALT);
  ctx.fillStyle = g; ctx.textAlign = "right"; ctx.textBaseline = "top";
  ctx.fillText("ROXOU", w - pad, footerY + 6);
  ctx.restore();
}

// ============ HERO-STYLE COVER RENDERERS ============

export async function renderCoverAgenda(canvas: HTMLCanvasElement, events: CoverEvent[], fmt: ArtFormat = "feed"): Promise<string> {
  const { w: W, h: H } = FORMAT_SIZES[fmt];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const PAD = fmt === "banner" ? 80 : 64;

  const hero = events[0] || null;

  // Single hero image background
  await drawHeroBg(ctx, W, H, hero?.image_url || null);
  drawGrain(ctx, W, H);

  // Glow behind hero area
  drawGlow(ctx, W * 0.5, H * 0.45, 500, ACCENT, 0.1);

  // ---- TOP: Small title ----
  const titleSeed = new Date().getDate();
  const titleText = pickTitle(titleSeed);
  ctx.save();
  ctx.font = "bold 28px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.textBaseline = "top";
  ctx.fillText(titleText, PAD, PAD);
  ctx.restore();

  // Date subtitle
  ctx.font = "bold 22px sans-serif";
  ctx.fillStyle = ACCENT;
  ctx.textBaseline = "top";
  ctx.fillText(`${getDayLabel()} · ${getDateShort()}`, PAD, PAD + 38);

  // ---- CENTER: Hero event (60% of space) ----
  if (hero) {
    const heroY = fmt === "story" ? H * 0.25 : H * 0.22;

    // 🔥 DESTAQUE badge
    drawBadge(ctx, "🔥 DESTAQUE", PAD, heroY, 20);

    // Hero title — HUGE
    const heroTitleSize = fmt === "story" ? 64 : fmt === "banner" ? 68 : 58;
    ctx.save();
    ctx.font = `bold ${heroTitleSize}px sans-serif`;
    ctx.textBaseline = "top";
    const heroLines = wrapText(ctx, hero.title, W - PAD * 2);
    // Strong text shadow
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    heroLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, PAD + 3, heroY + 52 + i * (heroTitleSize + 10) + 3));
    ctx.fillStyle = WHITE;
    heroLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, PAD, heroY + 52 + i * (heroTitleSize + 10)));
    ctx.restore();

    // Hero meta
    const heroMetaY = heroY + 52 + Math.min(heroLines.length, 2) * (heroTitleSize + 10) + 12;

    // Time large
    ctx.save();
    ctx.font = "bold 34px sans-serif";
    ctx.fillStyle = ACCENT;
    ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(233,30,140,0.25)";
    ctx.shadowBlur = 10;
    ctx.fillText(formatTime(hero.date_time), PAD, heroMetaY);
    ctx.shadowBlur = 0;
    ctx.restore();

    // Venue
    if (hero.venue_name) {
      ctx.font = "500 22px sans-serif";
      ctx.fillStyle = MUTED;
      ctx.textBaseline = "top";
      ctx.fillText(`📍 ${hero.venue_name}`, PAD + 110, heroMetaY + 6);
    }

    // Artist
    const artist = extractArtist(hero.description);
    if (artist) {
      ctx.font = "italic 22px sans-serif";
      ctx.fillStyle = "rgba(233,30,140,0.8)";
      ctx.textBaseline = "top";
      ctx.fillText(`✦ ${artist}`, PAD, heroMetaY + 44);
    }

    // Price
    const price = extractPrice(hero.description, hero.ticket_url);
    if (price) {
      const priceY = heroMetaY + (artist ? 78 : 44);
      ctx.save();
      ctx.font = "bold 18px sans-serif";
      const pw = ctx.measureText(price).width + 24;
      ctx.fillStyle = "rgba(233,30,140,0.12)";
      roundRect(ctx, PAD, priceY, pw, 30, 15);
      ctx.fill();
      ctx.fillStyle = ACCENT;
      ctx.textBaseline = "middle";
      ctx.fillText(price, PAD + 12, priceY + 15);
      ctx.restore();
    }
  }

  // ---- BOTTOM: Support list (max 3-4) ----
  const supportEvents = events.slice(1, fmt === "story" ? 5 : 4);
  if (supportEvents.length > 0) {
    const listH = supportEvents.length * 48;
    const listStartY = H - 130 - listH;

    // Subtle label
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.textBaseline = "top";
    ctx.fillText("TAMBÉM HOJE", PAD, listStartY - 24);

    // Thin divider
    ctx.fillStyle = "rgba(233,30,140,0.15)";
    ctx.fillRect(PAD, listStartY - 6, W - PAD * 2, 1);

    for (let i = 0; i < supportEvents.length; i++) {
      drawSupportItem(ctx, supportEvents[i], PAD, listStartY + i * 48, W - PAD * 2);
    }
  }

  // ---- FOOTER: Isolated CTA ----
  drawIsolatedCTA(ctx, W, H, PAD);

  return canvas.toDataURL("image/jpeg", 0.92);
}

export async function renderCoverTopRoles(canvas: HTMLCanvasElement, events: CoverEvent[], fmt: ArtFormat = "feed"): Promise<string> {
  const { w: W, h: H } = FORMAT_SIZES[fmt];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const PAD = fmt === "banner" ? 80 : 64;

  const hero = events[0] || null;

  await drawHeroBg(ctx, W, H, hero?.image_url || null);
  drawGrain(ctx, W, H);
  drawGlow(ctx, W * 0.6, H * 0.4, 500, ACCENT_ALT, 0.1);

  // ---- TOP: Title ----
  ctx.save();
  ctx.font = "bold 26px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.textBaseline = "top";
  ctx.fillText("CONFIRA OS MELHORES ROLÊS", PAD, PAD);
  ctx.restore();

  ctx.font = "400 18px sans-serif";
  ctx.fillStyle = MUTED;
  ctx.textBaseline = "top";
  ctx.fillText("Selecionamos os destaques do dia", PAD, PAD + 34);

  // ---- CENTER: Hero #1 ----
  if (hero) {
    const heroY = fmt === "story" ? H * 0.22 : H * 0.2;
    drawBadge(ctx, "🥇 #1 DO DIA", PAD, heroY, 20);

    const heroTitleSize = fmt === "story" ? 60 : 54;
    ctx.save();
    ctx.font = `bold ${heroTitleSize}px sans-serif`;
    ctx.textBaseline = "top";
    const hLines = wrapText(ctx, hero.title, W - PAD * 2);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    hLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, PAD + 3, heroY + 52 + i * (heroTitleSize + 10) + 3));
    ctx.fillStyle = WHITE;
    hLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, PAD, heroY + 52 + i * (heroTitleSize + 10)));
    ctx.restore();

    const metaY = heroY + 52 + Math.min(hLines.length, 2) * (heroTitleSize + 10) + 12;
    ctx.font = "bold 32px sans-serif"; ctx.fillStyle = ACCENT; ctx.textBaseline = "top";
    ctx.fillText(formatTime(hero.date_time), PAD, metaY);

    if (hero.venue_name) {
      ctx.font = "500 20px sans-serif"; ctx.fillStyle = MUTED; ctx.textBaseline = "top";
      ctx.fillText(`📍 ${hero.venue_name}`, PAD + 100, metaY + 6);
    }

    const artist = extractArtist(hero.description);
    if (artist) {
      ctx.font = "italic 20px sans-serif"; ctx.fillStyle = "rgba(233,30,140,0.8)"; ctx.textBaseline = "top";
      ctx.fillText(`✦ ${artist}`, PAD, metaY + 44);
    }
  }

  // ---- BOTTOM: #2, #3 ----
  const medals = ["🥈 #2", "🥉 #3", "4º"];
  const supportEvents = events.slice(1, 4);
  if (supportEvents.length > 0) {
    const listH = supportEvents.length * 52;
    const listStartY = H - 130 - listH;

    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.textBaseline = "top";
    ctx.fillText("PRÓXIMOS NO RANKING", PAD, listStartY - 24);
    ctx.fillStyle = "rgba(233,30,140,0.15)";
    ctx.fillRect(PAD, listStartY - 6, W - PAD * 2, 1);

    for (let i = 0; i < supportEvents.length; i++) {
      const e = supportEvents[i];
      const y = listStartY + i * 52;
      const medal = medals[i] || `${i + 2}º`;

      // Medal
      ctx.font = "bold 18px sans-serif"; ctx.fillStyle = ACCENT; ctx.textBaseline = "middle";
      ctx.fillText(medal, PAD, y + 16);

      // Time
      ctx.font = "bold 20px sans-serif"; ctx.fillStyle = "rgba(233,30,140,0.7)"; ctx.textBaseline = "middle";
      ctx.fillText(formatTime(e.date_time), PAD + 70, y + 16);

      // Title
      ctx.font = "500 20px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.textBaseline = "middle";
      const maxTW = W - PAD * 2 - 160;
      const tt = ctx.measureText(e.title).width > maxTW ? e.title.slice(0, 28) + "…" : e.title;
      ctx.fillText(tt, PAD + 152, y + 16);
    }
  }

  drawIsolatedCTA(ctx, W, H, PAD);
  return canvas.toDataURL("image/jpeg", 0.92);
}

export async function renderCoverWeekend(canvas: HTMLCanvasElement, events: CoverEvent[], fmt: ArtFormat = "feed"): Promise<string> {
  const { w: W, h: H } = FORMAT_SIZES[fmt];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const PAD = fmt === "banner" ? 80 : 64;

  const hero = events[0] || null;

  await drawHeroBg(ctx, W, H, hero?.image_url || null);
  drawGrain(ctx, W, H);
  drawGlow(ctx, W * 0.4, H * 0.35, 500, ACCENT, 0.1);

  // ---- TOP: Title ----
  ctx.save();
  ctx.font = "bold 26px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.textBaseline = "top";
  ctx.fillText("O QUE ROLA NESTE FIM DE SEMANA", PAD, PAD);
  ctx.restore();

  ctx.font = "bold 22px sans-serif"; ctx.fillStyle = ACCENT; ctx.textBaseline = "top";
  ctx.fillText("SEXTA · SÁBADO · DOMINGO", PAD, PAD + 36);

  // ---- CENTER: Hero event ----
  if (hero) {
    const heroY = fmt === "story" ? H * 0.22 : H * 0.2;
    const wd = WEEKDAYS[new Date(hero.date_time).getDay()];
    drawBadge(ctx, `🔥 ${wd}`, PAD, heroY, 20);

    const heroTitleSize = fmt === "story" ? 60 : 54;
    ctx.save();
    ctx.font = `bold ${heroTitleSize}px sans-serif`;
    ctx.textBaseline = "top";
    const hLines = wrapText(ctx, hero.title, W - PAD * 2);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    hLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, PAD + 3, heroY + 52 + i * (heroTitleSize + 10) + 3));
    ctx.fillStyle = WHITE;
    hLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, PAD, heroY + 52 + i * (heroTitleSize + 10)));
    ctx.restore();

    const metaY = heroY + 52 + Math.min(hLines.length, 2) * (heroTitleSize + 10) + 12;
    ctx.font = "bold 32px sans-serif"; ctx.fillStyle = ACCENT; ctx.textBaseline = "top";
    ctx.fillText(formatTime(hero.date_time), PAD, metaY);

    if (hero.venue_name) {
      ctx.font = "500 20px sans-serif"; ctx.fillStyle = MUTED; ctx.textBaseline = "top";
      ctx.fillText(`📍 ${hero.venue_name}`, PAD + 100, metaY + 6);
    }
  }

  // ---- BOTTOM: Support events with day labels ----
  const supportEvents = events.slice(1, fmt === "story" ? 5 : 4);
  if (supportEvents.length > 0) {
    const listH = supportEvents.length * 52;
    const listStartY = H - 130 - listH;

    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.textBaseline = "top";
    ctx.fillText("MAIS NO FIM DE SEMANA", PAD, listStartY - 24);
    ctx.fillStyle = "rgba(233,30,140,0.15)";
    ctx.fillRect(PAD, listStartY - 6, W - PAD * 2, 1);

    for (let i = 0; i < supportEvents.length; i++) {
      const e = supportEvents[i];
      const y = listStartY + i * 52;
      const d = new Date(e.date_time);
      const dayShort = WEEKDAYS[d.getDay()].slice(0, 3);

      // Day label
      ctx.save();
      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = "rgba(233,30,140,0.12)";
      roundRect(ctx, PAD, y + 2, 44, 24, 12);
      ctx.fill();
      ctx.fillStyle = ACCENT; ctx.textBaseline = "middle";
      ctx.fillText(dayShort, PAD + 6, y + 14);
      ctx.restore();

      // Time
      ctx.font = "bold 20px sans-serif"; ctx.fillStyle = "rgba(233,30,140,0.7)"; ctx.textBaseline = "middle";
      ctx.fillText(formatTime(e.date_time), PAD + 54, y + 16);

      // Title
      ctx.font = "500 20px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.textBaseline = "middle";
      const maxTW = W - PAD * 2 - 160;
      const tt = ctx.measureText(e.title).width > maxTW ? e.title.slice(0, 28) + "…" : e.title;
      ctx.fillText(tt, PAD + 140, y + 16);
    }
  }

  drawIsolatedCTA(ctx, W, H, PAD);
  return canvas.toDataURL("image/jpeg", 0.92);
}

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

  drawFooterBar(ctx, W, H, "DESCUBRA MAIS EM ROXOU.COM.BR", PAD);
  return canvas.toDataURL("image/jpeg", 0.92);
}

// ============ FLYER INDIVIDUAL ============

export async function renderFlyer(canvas: HTMLCanvasElement, event: CoverEvent, badge = "HOJE"): Promise<string> {
  const W = 1080, H = 1350;
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
  grad.addColorStop(0.75, "rgba(15,10,26,0.92)");
  grad.addColorStop(1, "rgba(15,10,26,0.98)");
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

  drawFooterBar(ctx, W, H, "CONFIRA NA ROXOU", PAD);
  return canvas.toDataURL("image/jpeg", 0.92);
}

// ============ BANNER FESTIVAL (1920x1080) ============

export async function renderBannerFestival(canvas: HTMLCanvasElement, events: CoverEvent[]): Promise<string> {
  const W = 1920, H = 1080;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const PAD = 80;

  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  const imageUrls = events.map(e => e.image_url).filter(Boolean) as string[];
  await drawFlyerBg(ctx, W, H, imageUrls, 0.9);
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

  return canvas.toDataURL("image/jpeg", 0.92);
}

// ============ CTA SLIDE ============

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

  return canvas.toDataURL("image/jpeg", 0.92);
}
