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
  ctx.globalAlpha = 0.02;
  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#000";
    ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 2, Math.random() * 2);
  }
  ctx.restore();
}

function drawGlow(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, _color = ACCENT, alpha = 0.12) {
  const g = ctx.createRadialGradient(cx, cy, radius * 0.05, cx, cy, radius);
  g.addColorStop(0, `rgba(233,30,140,${alpha})`);
  g.addColorStop(0.4, `rgba(147,51,234,${alpha * 0.4})`);
  g.addColorStop(1, "rgba(15,10,26,0)");
  ctx.fillStyle = g;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
}

/** Single hero image bg — very heavy overlay so text dominates */
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
function drawGlassPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
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
function drawPremiumCTA(ctx: CanvasRenderingContext2D, w: number, h: number, text: string, pad: number) {
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
function drawGhostItem(ctx: CanvasRenderingContext2D, label: string, title: string, x: number, y: number, maxW: number) {
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

// ============ PREMIUM COVER RENDERERS ============

export async function renderCoverAgenda(canvas: HTMLCanvasElement, events: CoverEvent[], fmt: ArtFormat = "feed"): Promise<string> {
  const { w: W, h: H } = FORMAT_SIZES[fmt];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const PAD = fmt === "banner" ? 80 : 72;
  const hero = events[0] || null;

  await drawHeroBg(ctx, W, H, hero?.image_url || null);
  drawGrain(ctx, W, H);

  // Central glow behind hero
  const glowCY = fmt === "story" ? H * 0.38 : H * 0.4;
  drawGlow(ctx, W * 0.5, glowCY, 600, ACCENT, 0.14);

  // ---- TOP: Minimal headline ----
  const titleSeed = new Date().getDate();
  const titleText = pickTitle(titleSeed);
  ctx.save();
  ctx.font = "bold 24px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.textBaseline = "top";
  ctx.fillText(titleText, PAD, PAD);
  ctx.restore();
  ctx.font = "bold 18px sans-serif";
  ctx.fillStyle = "rgba(233,30,140,0.6)";
  ctx.textBaseline = "top";
  ctx.fillText(`${getDayLabel()} · ${getDateShort()}`, PAD, PAD + 32);

  // ---- HERO BLOCK ----
  if (hero) {
    const heroY = fmt === "story" ? H * 0.24 : H * 0.2;
    const heroTitleSize = fmt === "story" ? 72 : fmt === "banner" ? 74 : 66;

    // Measure hero content height for glass panel
    ctx.font = `bold ${heroTitleSize}px sans-serif`;
    const heroLines = wrapText(ctx, hero.title, W - PAD * 2 - 40);
    const lineH = heroTitleSize + 12;
    const titleBlockH = Math.min(heroLines.length, 2) * lineH;
    const artist = extractArtist(hero.description);
    const price = extractPrice(hero.description, hero.ticket_url);
    let metaH = 50; // time + venue
    if (artist) metaH += 34;
    if (price) metaH += 38;
    const panelH = 56 + titleBlockH + metaH + 32; // badge + title + meta + padding

    // Glass panel
    drawGlassPanel(ctx, PAD - 20, heroY - 16, W - PAD * 2 + 40, panelH);

    // Badge
    drawBadge(ctx, "🔥 DESTAQUE", PAD, heroY, 20);

    // Title — HUGE with strong shadow
    ctx.save();
    ctx.font = `bold ${heroTitleSize}px sans-serif`;
    ctx.textBaseline = "top";
    // Double shadow for depth
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    heroLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, PAD + 4, heroY + 56 + i * lineH + 4));
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    heroLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, PAD + 2, heroY + 56 + i * lineH + 2));
    ctx.fillStyle = WHITE;
    heroLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, PAD, heroY + 56 + i * lineH));
    ctx.restore();

    // Meta below title
    const metaY = heroY + 56 + titleBlockH + 8;

    // Time — prominent
    ctx.save();
    ctx.font = "bold 36px sans-serif";
    ctx.fillStyle = ACCENT;
    ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(233,30,140,0.3)"; ctx.shadowBlur = 12;
    ctx.fillText(formatTime(hero.date_time), PAD, metaY);
    ctx.shadowBlur = 0; ctx.restore();

    // Venue inline
    if (hero.venue_name) {
      ctx.font = "500 20px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.textBaseline = "top";
      ctx.fillText(`📍 ${hero.venue_name}`, PAD + 120, metaY + 8);
    }

    let extraY = metaY + 46;
    if (artist) {
      ctx.font = "italic 20px sans-serif";
      ctx.fillStyle = "rgba(233,30,140,0.7)";
      ctx.textBaseline = "top";
      ctx.fillText(`✦ ${artist}`, PAD, extraY);
      extraY += 34;
    }
    if (price) {
      ctx.save();
      ctx.font = "bold 16px sans-serif";
      const pw = ctx.measureText(price).width + 22;
      ctx.fillStyle = "rgba(233,30,140,0.1)";
      roundRect(ctx, PAD, extraY, pw, 28, 14);
      ctx.fill();
      ctx.fillStyle = "rgba(233,30,140,0.7)";
      ctx.textBaseline = "middle";
      ctx.fillText(price, PAD + 11, extraY + 14);
      ctx.restore();
    }
  }

  // ---- BOTTOM: Ghost support list (max 3 feed, 4 story) ----
  const maxSupport = fmt === "story" ? 4 : 3;
  const supportEvents = events.slice(1, 1 + maxSupport);
  if (supportEvents.length > 0) {
    const itemH = 38;
    const listH = supportEvents.length * itemH;
    const listStartY = H - 140 - listH;

    // Very subtle label
    ctx.font = "600 12px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.textBaseline = "top";
    ctx.fillText("TAMBÉM HOJE", PAD, listStartY - 18);

    for (let i = 0; i < supportEvents.length; i++) {
      drawGhostItem(ctx, formatTime(supportEvents[i].date_time), supportEvents[i].title, PAD, listStartY + i * itemH, W - PAD * 2);
    }
  }

  // ---- CTA ----
  drawPremiumCTA(ctx, W, H, "CONFIRA A AGENDA COMPLETA EM ROXOU.COM.BR", PAD);

  return canvas.toDataURL("image/png");
}

export async function renderCoverTopRoles(canvas: HTMLCanvasElement, events: CoverEvent[], fmt: ArtFormat = "feed"): Promise<string> {
  const { w: W, h: H } = FORMAT_SIZES[fmt];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const PAD = fmt === "banner" ? 80 : 72;
  const hero = events[0] || null;

  await drawHeroBg(ctx, W, H, hero?.image_url || null);
  drawGrain(ctx, W, H);
  drawGlow(ctx, W * 0.5, H * 0.38, 600, ACCENT_ALT, 0.12);

  // ---- TOP: Subtle headline ----
  ctx.save();
  ctx.font = "bold 24px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.textBaseline = "top";
  ctx.fillText("OS MELHORES ROLÊS", PAD, PAD);
  ctx.restore();
  ctx.font = "400 16px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.textBaseline = "top";
  ctx.fillText("Selecionamos os destaques do dia", PAD, PAD + 30);

  // ---- HERO #1 ----
  if (hero) {
    const heroY = fmt === "story" ? H * 0.22 : H * 0.2;
    const heroTitleSize = fmt === "story" ? 68 : 62;

    ctx.font = `bold ${heroTitleSize}px sans-serif`;
    const hLines = wrapText(ctx, hero.title, W - PAD * 2 - 40);
    const lineH = heroTitleSize + 12;
    const titleBlockH = Math.min(hLines.length, 2) * lineH;
    const artist = extractArtist(hero.description);
    let metaH = 50;
    if (artist) metaH += 34;
    const panelH = 56 + titleBlockH + metaH + 24;

    drawGlassPanel(ctx, PAD - 20, heroY - 16, W - PAD * 2 + 40, panelH);
    drawBadge(ctx, "🥇 #1 DO DIA", PAD, heroY, 20);

    ctx.save();
    ctx.font = `bold ${heroTitleSize}px sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    hLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, PAD + 4, heroY + 56 + i * lineH + 4));
    ctx.fillStyle = WHITE;
    hLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, PAD, heroY + 56 + i * lineH));
    ctx.restore();

    const metaY = heroY + 56 + titleBlockH + 8;
    ctx.save();
    ctx.font = "bold 34px sans-serif"; ctx.fillStyle = ACCENT; ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(233,30,140,0.3)"; ctx.shadowBlur = 12;
    ctx.fillText(formatTime(hero.date_time), PAD, metaY);
    ctx.shadowBlur = 0; ctx.restore();

    if (hero.venue_name) {
      ctx.font = "500 20px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.textBaseline = "top";
      ctx.fillText(`📍 ${hero.venue_name}`, PAD + 110, metaY + 8);
    }
    if (artist) {
      ctx.font = "italic 20px sans-serif"; ctx.fillStyle = "rgba(233,30,140,0.65)"; ctx.textBaseline = "top";
      ctx.fillText(`✦ ${artist}`, PAD, metaY + 46);
    }
  }

  // ---- BOTTOM: #2 #3 ghost style ----
  const medals = ["🥈 #2", "🥉 #3"];
  const maxSupport = fmt === "story" ? 3 : 2;
  const supportEvents = events.slice(1, 1 + maxSupport);
  if (supportEvents.length > 0) {
    const itemH = 38;
    const listH = supportEvents.length * itemH;
    const listStartY = H - 140 - listH;

    ctx.font = "600 12px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.textBaseline = "top";
    ctx.fillText("PRÓXIMOS NO RANKING", PAD, listStartY - 18);

    for (let i = 0; i < supportEvents.length; i++) {
      const e = supportEvents[i];
      const medal = medals[i] || `${i + 2}º`;
      drawGhostItem(ctx, `${medal}  ${formatTime(e.date_time)}`, e.title, PAD, listStartY + i * itemH, W - PAD * 2);
    }
  }

  drawPremiumCTA(ctx, W, H, "VEJA O RANKING COMPLETO EM ROXOU.COM.BR", PAD);
  return canvas.toDataURL("image/png");
}

export async function renderCoverWeekend(canvas: HTMLCanvasElement, events: CoverEvent[], fmt: ArtFormat = "feed"): Promise<string> {
  const { w: W, h: H } = FORMAT_SIZES[fmt];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const PAD = fmt === "banner" ? 80 : 72;
  const hero = events[0] || null;

  await drawHeroBg(ctx, W, H, hero?.image_url || null);
  drawGrain(ctx, W, H);
  drawGlow(ctx, W * 0.45, H * 0.35, 600, ACCENT, 0.12);

  // ---- TOP ----
  ctx.save();
  ctx.font = "bold 24px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.textBaseline = "top";
  ctx.fillText("FIM DE SEMANA EM PRUDENTE", PAD, PAD);
  ctx.restore();
  ctx.font = "bold 18px sans-serif";
  ctx.fillStyle = "rgba(233,30,140,0.6)";
  ctx.textBaseline = "top";
  ctx.fillText("SEXTA · SÁBADO · DOMINGO", PAD, PAD + 32);

  // ---- HERO ----
  if (hero) {
    const heroY = fmt === "story" ? H * 0.22 : H * 0.2;
    const wd = WEEKDAYS[new Date(hero.date_time).getDay()];
    const heroTitleSize = fmt === "story" ? 68 : 62;

    ctx.font = `bold ${heroTitleSize}px sans-serif`;
    const hLines = wrapText(ctx, hero.title, W - PAD * 2 - 40);
    const lineH = heroTitleSize + 12;
    const titleBlockH = Math.min(hLines.length, 2) * lineH;
    const panelH = 56 + titleBlockH + 58 + 24;

    drawGlassPanel(ctx, PAD - 20, heroY - 16, W - PAD * 2 + 40, panelH);
    drawBadge(ctx, `🔥 ${wd}`, PAD, heroY, 20);

    ctx.save();
    ctx.font = `bold ${heroTitleSize}px sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    hLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, PAD + 4, heroY + 56 + i * lineH + 4));
    ctx.fillStyle = WHITE;
    hLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, PAD, heroY + 56 + i * lineH));
    ctx.restore();

    const metaY = heroY + 56 + titleBlockH + 8;
    ctx.save();
    ctx.font = "bold 34px sans-serif"; ctx.fillStyle = ACCENT; ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(233,30,140,0.3)"; ctx.shadowBlur = 12;
    ctx.fillText(formatTime(hero.date_time), PAD, metaY);
    ctx.shadowBlur = 0; ctx.restore();

    if (hero.venue_name) {
      ctx.font = "500 20px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.textBaseline = "top";
      ctx.fillText(`📍 ${hero.venue_name}`, PAD + 110, metaY + 8);
    }
  }

  // ---- BOTTOM: Ghost support ----
  const maxSupport = fmt === "story" ? 4 : 3;
  const supportEvents = events.slice(1, 1 + maxSupport);
  if (supportEvents.length > 0) {
    const itemH = 38;
    const listH = supportEvents.length * itemH;
    const listStartY = H - 140 - listH;

    ctx.font = "600 12px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.textBaseline = "top";
    ctx.fillText("MAIS NO FIM DE SEMANA", PAD, listStartY - 18);

    for (let i = 0; i < supportEvents.length; i++) {
      const e = supportEvents[i];
      const d = new Date(e.date_time);
      const dayShort = WEEKDAYS[d.getDay()].slice(0, 3);
      drawGhostItem(ctx, `${dayShort} ${formatTime(e.date_time)}`, e.title, PAD, listStartY + i * itemH, W - PAD * 2);
    }
  }

  drawPremiumCTA(ctx, W, H, "DESCUBRA TUDO NA ROXOU.COM.BR", PAD);
  return canvas.toDataURL("image/png");
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

  drawPremiumCTA(ctx, W, H, "DESCUBRA MAIS EM ROXOU.COM.BR", PAD);
  return canvas.toDataURL("image/png");
}

// ============ FLYER INDIVIDUAL ============

export async function renderFlyer(canvas: HTMLCanvasElement, event: CoverEvent & { aura_phrase?: string | null }, badge = "HOJE", fmt: ArtFormat = "feed"): Promise<string> {
  // Story uses the new Roxou V3 template (Aura protagonist).
  if (fmt === "story") {
    return renderStoryV3(canvas, event);
  }
  const { w: W, h: H } = FORMAT_SIZES[fmt === "banner" ? "feed" : fmt];
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
  grad.addColorStop(0.75, "rgba(15,10,26,0.96)");
  grad.addColorStop(1, "rgba(15,10,26,1)");
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

  drawPremiumCTA(ctx, W, H, "CONFIRA NA ROXOU.COM.BR", PAD);
  return canvas.toDataURL("image/png");
}

// ============ BANNER FESTIVAL (1920x1080) ============

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

// ============ EVENTO EM DESTAQUE (Story-optimized single event) ============

export async function renderCoverDestaque(canvas: HTMLCanvasElement, event: CoverEvent, fmt: ArtFormat = "story"): Promise<string> {
  const { w: W, h: H } = FORMAT_SIZES[fmt];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const PAD = 72;

  // Full-bleed hero background with lighter overlay to show the event image
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  if (event.image_url) {
    try {
      const img = await loadImage(event.image_url);
      const imgR = img.width / img.height;
      const canR = W / H;
      let sw = img.width, sh = img.height, sx = 0, sy = 0;
      if (imgR > canR) { sw = img.height * canR; sx = (img.width - sw) / 2; }
      else { sh = img.width / canR; sy = (img.height - sh) / 2; }
      const z = 0.08;
      const zw = sw * (1 - z), zh = sh * (1 - z);
      ctx.drawImage(img, sx + (sw - zw) / 2, sy + (sh - zh) / 2, zw, zh, 0, 0, W, H);
    } catch { /* solid fallback */ }
  }

  // Gradient overlay — lighter top to show image, heavy bottom for text
  const ov = ctx.createLinearGradient(0, 0, 0, H);
  ov.addColorStop(0, "rgba(15,10,26,0.25)");
  ov.addColorStop(0.35, "rgba(15,10,26,0.35)");
  ov.addColorStop(0.55, "rgba(15,10,26,0.65)");
  ov.addColorStop(0.75, "rgba(15,10,26,0.9)");
  ov.addColorStop(1, "rgba(15,10,26,0.98)");
  ctx.fillStyle = ov; ctx.fillRect(0, 0, W, H);

  // Vignette
  const vigL = ctx.createLinearGradient(0, 0, W * 0.12, 0);
  vigL.addColorStop(0, "rgba(15,10,26,0.4)"); vigL.addColorStop(1, "rgba(15,10,26,0)");
  ctx.fillStyle = vigL; ctx.fillRect(0, 0, W * 0.12, H);
  const vigR = ctx.createLinearGradient(W * 0.88, 0, W, 0);
  vigR.addColorStop(0, "rgba(15,10,26,0)"); vigR.addColorStop(1, "rgba(15,10,26,0.4)");
  ctx.fillStyle = vigR; ctx.fillRect(W * 0.88, 0, W * 0.12, H);

  drawGrain(ctx, W, H);

  // Glow behind content area
  const glowY = fmt === "story" ? H * 0.6 : H * 0.55;
  drawGlow(ctx, W * 0.5, glowY, 500, ACCENT, 0.18);
  drawGlow(ctx, W * 0.3, glowY - 100, 300, ACCENT_ALT, 0.08);

  // ---- TOP: ROXOU branding + badge ----
  ctx.save();
  ctx.font = "bold 28px sans-serif";
  const brandGrad = ctx.createLinearGradient(PAD, 0, PAD + 120, 0);
  brandGrad.addColorStop(0, ACCENT); brandGrad.addColorStop(1, ACCENT_ALT);
  ctx.fillStyle = brandGrad; ctx.textBaseline = "top";
  ctx.fillText("ROXOU", PAD, PAD);
  ctx.restore();

  // Weekday chip top-right
  const wd = WEEKDAYS[new Date(event.date_time).getDay()];
  const d = new Date(event.date_time);
  const months = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
  const dateLabel = `${d.getDate()} ${months[d.getMonth()]} · ${wd}`;
  ctx.save();
  ctx.font = "bold 18px sans-serif";
  const dlW = ctx.measureText(dateLabel).width + 28;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  roundRect(ctx, W - PAD - dlW, PAD, dlW, 36, 18);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.textBaseline = "middle";
  ctx.fillText(dateLabel, W - PAD - dlW + 14, PAD + 18);
  ctx.restore();

  // ---- CONTENT BLOCK (bottom half) ----
  const isStory = fmt === "story";
  const contentY = isStory ? H * 0.52 : H * 0.42;

  // Glass panel
  const titleSize = isStory ? 78 : 64;
  ctx.font = `bold ${titleSize}px sans-serif`;
  const titleLines = wrapText(ctx, event.title, W - PAD * 2 - 20);
  const lineH = titleSize + 14;
  const visibleLines = Math.min(titleLines.length, 3);
  const titleBlockH = visibleLines * lineH;

  const artist = extractArtist(event.description);
  const price = extractPrice(event.description, event.ticket_url);
  let metaH = 60; // time
  if (event.venue_name) metaH += 40;
  if (artist) metaH += 40;
  if (price) metaH += 44;

  const panelH = 60 + titleBlockH + metaH + 40;
  drawGlassPanel(ctx, PAD - 24, contentY - 20, W - PAD * 2 + 48, panelH);

  // Badge
  const catLabel = event.sub_category || event.category || "EVENTO";
  drawBadge(ctx, `🔥 ${catLabel.toUpperCase()}`, PAD, contentY, 22);

  // Title — MASSIVE
  ctx.save();
  ctx.font = `bold ${titleSize}px sans-serif`;
  ctx.textBaseline = "top";
  // Triple shadow for depth
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  titleLines.slice(0, visibleLines).forEach((l, i) => ctx.fillText(l, PAD + 5, contentY + 60 + i * lineH + 5));
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  titleLines.slice(0, visibleLines).forEach((l, i) => ctx.fillText(l, PAD + 2, contentY + 60 + i * lineH + 2));
  ctx.fillStyle = WHITE;
  titleLines.slice(0, visibleLines).forEach((l, i) => ctx.fillText(l, PAD, contentY + 60 + i * lineH));
  ctx.restore();

  // Meta
  let metaY = contentY + 60 + titleBlockH + 12;

  // Time — BIG accent
  ctx.save();
  ctx.font = "bold 42px sans-serif"; ctx.fillStyle = ACCENT; ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(233,30,140,0.4)"; ctx.shadowBlur = 16;
  ctx.fillText(formatTime(event.date_time), PAD, metaY);
  ctx.shadowBlur = 0; ctx.restore();

  // Venue
  if (event.venue_name) {
    ctx.font = "500 22px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.textBaseline = "top";
    ctx.fillText(`📍 ${event.venue_name}`, PAD, metaY + 50);
    metaY += 40;
  }

  // Artist
  if (artist) {
    ctx.font = "italic 24px sans-serif"; ctx.fillStyle = "rgba(233,30,140,0.8)"; ctx.textBaseline = "top";
    ctx.fillText(`✦ ${artist}`, PAD, metaY + 52);
    metaY += 40;
  }

  // Price pill
  if (price) {
    const priceY = metaY + 56;
    ctx.save();
    ctx.font = "bold 18px sans-serif";
    const pw = ctx.measureText(price).width + 30;
    const priceGrad = ctx.createLinearGradient(PAD, priceY, PAD + pw, priceY);
    priceGrad.addColorStop(0, "rgba(233,30,140,0.15)"); priceGrad.addColorStop(1, "rgba(147,51,234,0.1)");
    ctx.fillStyle = priceGrad;
    roundRect(ctx, PAD, priceY, pw, 36, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(233,30,140,0.2)"; ctx.lineWidth = 1;
    roundRect(ctx, PAD, priceY, pw, 36, 18); ctx.stroke();
    ctx.fillStyle = ACCENT; ctx.textBaseline = "middle";
    ctx.fillText(price, PAD + 15, priceY + 18);
    ctx.restore();
  }

  // ---- CTA bottom ----
  drawPremiumCTA(ctx, W, H, "SAIBA MAIS EM ROXOU.COM.BR", PAD);

  return canvas.toDataURL("image/png");
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

  return canvas.toDataURL("image/png");
}

// ============ STORY V3 (Roxou template w/ Aura) ============

const STORY_BG = "#09090B";
const STORY_PURPLE = "#7C3AED";
const STORY_VIOLET = "#A855F7";
const STORY_LILAC = "#C084FC";

async function tryLoadImage(src: string): Promise<HTMLImageElement | null> {
  try { return await loadImage(src); } catch { return null; }
}

export async function renderStoryV3(
  canvas: HTMLCanvasElement,
  event: CoverEvent & { aura_phrase?: string | null }
): Promise<string> {
  const W = 1080, H = 1920;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const PAD = 64;

  // 1) Solid dark base
  ctx.fillStyle = STORY_BG;
  ctx.fillRect(0, 0, W, H);

  // 2) Event flyer as MAIN BACKGROUND — visible, almost no blur
  if (event.image_url) {
    const img = await tryLoadImage(event.image_url);
    if (img) {
      const imgR = img.width / img.height;
      const canR = W / H;
      let sw = img.width, sh = img.height, sx = 0, sy = 0;
      if (imgR > canR) { sw = img.height * canR; sx = (img.width - sw) / 2; }
      else { sh = img.width / canR; sy = (img.height - sh) / 2; }
      ctx.save();
      ctx.filter = "blur(2px) brightness(0.85)";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
      ctx.filter = "none";
      ctx.restore();
    }
  }

  // 3) Light dark overlay (improve readability without hiding flyer)
  ctx.fillStyle = "rgba(9,9,11,0.32)";
  ctx.fillRect(0, 0, W, H);

  // 4) Vertical gradient — darker at top/bottom for text legibility
  const pg = ctx.createLinearGradient(0, 0, 0, H);
  pg.addColorStop(0, "rgba(9,9,11,0.78)");
  pg.addColorStop(0.28, "rgba(9,9,11,0.05)");
  pg.addColorStop(0.72, "rgba(9,9,11,0.15)");
  pg.addColorStop(1, "rgba(9,9,11,0.92)");
  ctx.fillStyle = pg;
  ctx.fillRect(0, 0, W, H);

  drawGrain(ctx, W, H);

  // 5) Top badge — small "💜 AURA INDICA", left-aligned
  const badgeText = "💜 AURA INDICA";
  ctx.save();
  ctx.font = "bold 24px sans-serif";
  const bw = ctx.measureText(badgeText).width + 40;
  const bh = 52;
  const bx = PAD;
  const by = PAD + 20;
  const bg = ctx.createLinearGradient(bx, by, bx + bw, by);
  bg.addColorStop(0, STORY_PURPLE);
  bg.addColorStop(1, STORY_VIOLET);
  ctx.fillStyle = bg;
  roundRect(ctx, bx, by, bw, bh, bh / 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, bx + bw / 2, by + bh / 2 + 1);
  ctx.restore();

  // 7) Aura mascot — RIGHT, secondary, max 65% height, anchored bottom-right
  const aura = (await tryLoadImage("/aura-story.png")) || (await tryLoadImage("/src/assets/aura-mascot.png"));
  let auraLeft = W; // for title wrapping reference
  let auraTop = H;
  if (aura) {
    const maxH = Math.round(H * 0.65);
    const naturalRatio = aura.width / aura.height;
    const drawH = maxH;
    const drawW = Math.round(drawH * naturalRatio);
    const ax = W - drawW + 40; // slight overflow right
    const ay = H - drawH - 240; // sits above CTA
    auraLeft = ax;
    auraTop = ay;

    ctx.save();
    ctx.shadowColor = "rgba(168,85,247,0.45)";
    ctx.shadowBlur = 24;
    ctx.drawImage(aura, ax, ay, drawW, drawH);
    ctx.restore();
  }

  // 6) Title — LEFT side, large, max 3 lines, wrapped to leave room for Aura
  const titleY = by + bh + 60;
  ctx.save();
  ctx.font = "bold 78px sans-serif";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  const titleMaxW = Math.max(420, Math.min(W - PAD * 2, auraLeft - PAD - 40));
  const titleLines = wrapText(ctx, event.title, titleMaxW).slice(0, 3);
  const lineH = 86;
  // shadow for legibility
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  titleLines.forEach((l, i) => ctx.fillText(l, PAD + 3, titleY + i * lineH + 4));
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "#ffffff";
  titleLines.forEach((l, i) => ctx.fillText(l, PAD, titleY + i * lineH));
  ctx.restore();

  // 9) Info card — bottom-left, compact glass
  const d = new Date(event.date_time);
  const months = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
  const mins = d.getMinutes();
  const timeStr = mins ? `${String(d.getHours()).padStart(2,"0")}h${String(mins).padStart(2,"0")}` : `${String(d.getHours()).padStart(2,"0")}h`;
  const dateStr = `${d.getDate()} ${months[d.getMonth()]}`;

  const infoLines: { icon: string; text: string }[] = [
    { icon: "🕒", text: timeStr },
    { icon: "📅", text: dateStr },
  ];
  if (event.venue_name) infoLines.push({ icon: "📍", text: event.venue_name });

  const cardW = 540;
  const rowH = 54;
  const cardH = 28 + infoLines.length * rowH;
  const cardX = PAD;
  const cardY = H - cardH - 280;

  ctx.save();
  ctx.fillStyle = "rgba(9,9,11,0.78)";
  roundRect(ctx, cardX, cardY, cardW, cardH, 22);
  ctx.fill();
  ctx.strokeStyle = "rgba(168,85,247,0.4)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, cardX, cardY, cardW, cardH, 22);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  infoLines.forEach((row, i) => {
    const ry = cardY + 14 + rowH / 2 + i * rowH;
    ctx.font = "600 30px sans-serif";
    ctx.fillStyle = STORY_LILAC;
    ctx.fillText(row.icon, cardX + 26, ry);
    ctx.font = "600 28px sans-serif";
    ctx.fillStyle = "#ffffff";
    let txt = row.text;
    const maxW = cardW - 100;
    while (ctx.measureText(txt).width > maxW && txt.length > 4) txt = txt.slice(0, -2);
    if (txt !== row.text) txt = txt.trim() + "…";
    ctx.fillText(txt, cardX + 80, ry);
  });
  ctx.restore();

  // 10) CTA — premium, centered bottom
  const ctaText = "👉 CONFERE ESSE ROLÊ HOJE";
  ctx.save();
  ctx.font = "bold 34px sans-serif";
  const ctaW = Math.min(ctx.measureText(ctaText).width + 80, W - PAD * 2);
  const ctaH = 100;
  const ctaX = (W - ctaW) / 2;
  const ctaYpos = H - ctaH - 140;
  ctx.shadowColor = "rgba(168,85,247,0.6)";
  ctx.shadowBlur = 28;
  const cg = ctx.createLinearGradient(ctaX, ctaYpos, ctaX + ctaW, ctaYpos);
  cg.addColorStop(0, STORY_PURPLE);
  cg.addColorStop(1, STORY_VIOLET);
  ctx.fillStyle = cg;
  roundRect(ctx, ctaX, ctaYpos, ctaW, ctaH, ctaH / 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ctaText, W / 2, ctaYpos + ctaH / 2 + 2);
  ctx.restore();

  // 11) Footer — roxou.com.br
  ctx.save();
  ctx.font = "600 24px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("roxou.com.br", W / 2, H - 50);
  ctx.restore();

  return canvas.toDataURL("image/png");
}
