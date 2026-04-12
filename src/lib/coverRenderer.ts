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
  const glow = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
  glow.addColorStop(0, color.replace(")", `,${alpha})`).replace("rgb", "rgba").replace("#e91e8c", `rgba(233,30,140,${alpha})`));
  glow.addColorStop(1, "rgba(15,10,26,0)");
  // Simplified: just use ACCENT
  const g = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
  g.addColorStop(0, `rgba(233,30,140,${alpha})`);
  g.addColorStop(0.5, `rgba(147,51,234,${alpha * 0.5})`);
  g.addColorStop(1, "rgba(15,10,26,0)");
  ctx.fillStyle = g;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
}

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
    // Blur effect via multiple overlays
    ctx.fillStyle = `rgba(15,10,26,${overlayStrength * 0.4})`;
    ctx.fillRect(0, 0, w, h);
  }

  // Gradient overlay
  const overlay = ctx.createLinearGradient(0, 0, 0, h);
  overlay.addColorStop(0, `rgba(15,10,26,${overlayStrength * 0.7})`);
  overlay.addColorStop(0.3, `rgba(15,10,26,${overlayStrength * 0.85})`);
  overlay.addColorStop(1, `rgba(15,10,26,${overlayStrength})`);
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, w, h);

  // Purple tint
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
  // Glow shadow
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

function drawFooterBar(ctx: CanvasRenderingContext2D, w: number, h: number, cta: string, pad: number) {
  const footerY = h - 80;
  // Divider
  const divGrad = ctx.createLinearGradient(pad, 0, w - pad, 0);
  divGrad.addColorStop(0, "rgba(233,30,140,0.4)");
  divGrad.addColorStop(0.5, "rgba(147,51,234,0.2)");
  divGrad.addColorStop(1, "rgba(233,30,140,0)");
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad, footerY - 20); ctx.lineTo(w - pad, footerY - 20); ctx.stroke();

  ctx.font = "bold 22px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText(cta, pad, footerY - 4);

  ctx.font = "400 18px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillText("roxou.com.br", pad, footerY + 22);

  // ROXOU brand right
  ctx.save();
  ctx.font = "bold 26px sans-serif";
  const g = ctx.createLinearGradient(w - 180, footerY, w - pad, footerY);
  g.addColorStop(0, ACCENT); g.addColorStop(1, ACCENT_ALT);
  ctx.fillStyle = g;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText("ROXOU", w - pad, footerY + 6);
  ctx.restore();
}

// ============ FEED COVERS (1080x1350) ============

export async function renderCoverAgenda(canvas: HTMLCanvasElement, events: CoverEvent[], fmt: ArtFormat = "feed"): Promise<string> {
  const { w: W, h: H } = FORMAT_SIZES[fmt];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const PAD = fmt === "banner" ? 80 : 64;

  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  const imageUrls = events.map(e => e.image_url).filter(Boolean) as string[];
  await drawFlyerBg(ctx, W, H, imageUrls, 0.88);
  drawGrain(ctx, W, H);
  drawGlow(ctx, W * 0.3, H * 0.2, 400, ACCENT, 0.08);

  drawBadge(ctx, "AGENDA DO DIA", PAD, PAD);

  // Dynamic title with variation
  const titleSeed = new Date().getDate();
  const titleText = pickTitle(titleSeed);

  const titleSize = fmt === "banner" ? 64 : fmt === "story" ? 60 : 52;
  ctx.save();
  ctx.font = `bold ${titleSize}px sans-serif`;
  ctx.fillStyle = WHITE;
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 16;
  const titleY = PAD + 60;
  const titleLines = wrapText(ctx, titleText, W - PAD * 2);
  titleLines.forEach((l, i) => ctx.fillText(l, PAD, titleY + i * (titleSize + 12)));
  ctx.shadowBlur = 0; ctx.restore();

  // Subtitle
  const subY = titleY + titleLines.length * (titleSize + 12) + 8;
  ctx.font = "bold 28px sans-serif";
  ctx.fillStyle = ACCENT;
  ctx.textBaseline = "top";
  ctx.fillText(`${getDayLabel()} · ${getDateShort()}`, PAD, subY);

  // Featured event (first one)
  let listStartY = subY + 50;
  if (events.length > 0 && events[0].image_url) {
    const feat = events[0];
    const featH = fmt === "story" ? 300 : 220;
    const featW = W - PAD * 2;
    // Featured card background
    ctx.save();
    ctx.fillStyle = "rgba(233,30,140,0.06)";
    roundRect(ctx, PAD, listStartY, featW, featH, 20);
    ctx.fill();
    // Border
    ctx.strokeStyle = "rgba(233,30,140,0.2)";
    ctx.lineWidth = 1;
    roundRect(ctx, PAD, listStartY, featW, featH, 20);
    ctx.stroke();
    ctx.restore();

    // Featured badge
    drawBadge(ctx, "🔥 DESTAQUE", PAD + 16, listStartY + 16, 18);

    // Featured title
    ctx.save();
    ctx.font = "bold 36px sans-serif";
    ctx.fillStyle = WHITE;
    ctx.textBaseline = "top";
    const fLines = wrapText(ctx, feat.title, featW - 40);
    fLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, PAD + 20, listStartY + 60 + i * 44));
    ctx.restore();

    // Featured meta
    const fMetaY = listStartY + 60 + Math.min(fLines.length, 2) * 44 + 8;
    ctx.font = "bold 24px sans-serif";
    ctx.fillStyle = ACCENT;
    ctx.textBaseline = "top";
    ctx.fillText(formatTime(feat.date_time), PAD + 20, fMetaY);
    if (feat.venue_name) {
      ctx.font = "500 20px sans-serif";
      ctx.fillStyle = MUTED;
      ctx.fillText(`📍 ${feat.venue_name}`, PAD + 120, fMetaY + 2);
    }
    const artist = extractArtist(feat.description);
    if (artist) {
      ctx.font = "italic 20px sans-serif";
      ctx.fillStyle = "rgba(233,30,140,0.8)";
      ctx.fillText(`✦ ${artist}`, PAD + 20, fMetaY + 32);
    }

    listStartY += featH + 20;
  }

  // Event list
  const itemH = fmt === "story" ? 52 : 46;
  const maxItems = Math.min(events.length - 1, fmt === "story" ? 6 : fmt === "banner" ? 8 : 5);
  const remaining = events.slice(1);
  for (let i = 0; i < maxItems && i < remaining.length; i++) {
    const e = remaining[i];
    const y = listStartY + i * itemH;
    const time = formatTime(e.date_time);

    // Time pill
    ctx.save();
    ctx.fillStyle = "rgba(233,30,140,0.12)";
    roundRect(ctx, PAD, y, 88, 34, 17);
    ctx.fill();
    ctx.fillStyle = ACCENT;
    ctx.font = "bold 18px sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(time, PAD + 12, y + 17);
    ctx.restore();

    // Title
    ctx.fillStyle = WHITE;
    ctx.font = "500 20px sans-serif";
    ctx.textBaseline = "middle";
    const maxTW = W - PAD * 2 - 110;
    const tt = ctx.measureText(e.title).width > maxTW ? e.title.slice(0, 32) + "…" : e.title;
    ctx.fillText(tt, PAD + 98, y + 17);
  }

  drawFooterBar(ctx, W, H, "🔥 CONFIRA TODOS OS EVENTOS EM ROXOU.COM.BR", PAD);
  return canvas.toDataURL("image/jpeg", 0.92);
}

export async function renderCoverTopRoles(canvas: HTMLCanvasElement, events: CoverEvent[], fmt: ArtFormat = "feed"): Promise<string> {
  const { w: W, h: H } = FORMAT_SIZES[fmt];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const PAD = fmt === "banner" ? 80 : 64;

  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  const imageUrls = events.slice(0, 3).map(e => e.image_url).filter(Boolean) as string[];
  await drawFlyerBg(ctx, W, H, imageUrls, 0.85);
  drawGrain(ctx, W, H);
  drawGlow(ctx, W * 0.7, H * 0.3, 500, ACCENT_ALT, 0.1);

  drawBadge(ctx, "TOP ROLÊS", PAD, PAD);

  const titleSize = fmt === "banner" ? 60 : 52;
  ctx.save();
  ctx.font = `bold ${titleSize}px sans-serif`;
  ctx.fillStyle = WHITE;
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 12;
  ctx.fillText("CONFIRA OS MELHORES", PAD, PAD + 60);
  ctx.fillText("ROLÊS", PAD, PAD + 60 + titleSize + 8);
  ctx.shadowBlur = 0; ctx.restore();

  ctx.font = "400 22px sans-serif";
  ctx.fillStyle = MUTED;
  ctx.textBaseline = "top";
  ctx.fillText("Selecionamos os destaques do dia", PAD, PAD + 60 + (titleSize + 8) * 2 + 8);

  // Ranked cards
  const medals = ["🥇", "🥈", "🥉", "4º", "5º"];
  const cardH = fmt === "story" ? 150 : fmt === "banner" ? 120 : 130;
  const startY = PAD + 60 + (titleSize + 8) * 2 + 50;
  const maxCards = Math.min(events.length, fmt === "story" ? 5 : 3);

  for (let i = 0; i < maxCards; i++) {
    const e = events[i];
    const y = startY + i * (cardH + 12);
    const time = formatTime(e.date_time);

    ctx.save();
    ctx.fillStyle = i === 0 ? "rgba(233,30,140,0.1)" : "rgba(255,255,255,0.03)";
    roundRect(ctx, PAD, y, W - PAD * 2, cardH, 16);
    ctx.fill();
    if (i === 0) {
      ctx.strokeStyle = "rgba(233,30,140,0.2)";
      ctx.lineWidth = 1;
      roundRect(ctx, PAD, y, W - PAD * 2, cardH, 16);
      ctx.stroke();
    }
    ctx.restore();

    // Medal
    ctx.font = "44px sans-serif"; ctx.textBaseline = "top";
    ctx.fillText(medals[i], PAD + 16, y + (cardH - 44) / 2);

    // Title
    ctx.font = i === 0 ? "bold 28px sans-serif" : "bold 24px sans-serif";
    ctx.fillStyle = WHITE; ctx.textBaseline = "top";
    const tLines = wrapText(ctx, e.title, W - PAD * 2 - 120);
    tLines.slice(0, 2).forEach((l, li) => ctx.fillText(l, PAD + 80, y + 18 + li * 32));

    // Meta
    ctx.font = "400 18px sans-serif"; ctx.fillStyle = ACCENT; ctx.textBaseline = "top";
    const metaY = y + 18 + Math.min(tLines.length, 2) * 32 + 4;
    ctx.fillText(`${time}${e.venue_name ? `  ·  📍 ${e.venue_name}` : ""}`, PAD + 80, metaY);

    const artist = extractArtist(e.description);
    if (artist) {
      ctx.font = "italic 16px sans-serif";
      ctx.fillStyle = "rgba(233,30,140,0.7)";
      ctx.fillText(`✦ ${artist}`, PAD + 80, metaY + 24);
    }
  }

  drawFooterBar(ctx, W, H, "VEJA TUDO EM ROXOU.COM.BR", PAD);
  return canvas.toDataURL("image/jpeg", 0.92);
}

export async function renderCoverWeekend(canvas: HTMLCanvasElement, events: CoverEvent[], fmt: ArtFormat = "feed"): Promise<string> {
  const { w: W, h: H } = FORMAT_SIZES[fmt];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const PAD = fmt === "banner" ? 80 : 64;

  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  const imageUrls = events.map(e => e.image_url).filter(Boolean) as string[];
  await drawFlyerBg(ctx, W, H, imageUrls, 0.82);
  drawGrain(ctx, W, H);
  drawGlow(ctx, W * 0.5, H * 0.15, 500, ACCENT_ALT, 0.1);

  drawBadge(ctx, "FIM DE SEMANA", PAD, PAD);

  const titleSize = fmt === "banner" ? 58 : 50;
  ctx.save();
  ctx.font = `bold ${titleSize}px sans-serif`;
  ctx.fillStyle = WHITE; ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 12;
  const tLines = wrapText(ctx, "O QUE ROLA NESTE FIM DE SEMANA", W - PAD * 2);
  tLines.forEach((l, i) => ctx.fillText(l, PAD, PAD + 60 + i * (titleSize + 10)));
  ctx.shadowBlur = 0; ctx.restore();

  const subY = PAD + 60 + tLines.length * (titleSize + 10) + 8;
  ctx.font = "bold 28px sans-serif"; ctx.fillStyle = ACCENT; ctx.textBaseline = "top";
  ctx.fillText("SEXTA · SÁBADO · DOMINGO", PAD, subY);

  // Event grid
  const gridY = subY + 50;
  const maxItems = Math.min(events.length, fmt === "story" ? 8 : fmt === "banner" ? 10 : 6);
  const itemH = fmt === "story" ? 52 : 44;

  for (let i = 0; i < maxItems; i++) {
    const e = events[i];
    const y = gridY + i * itemH;
    const d = new Date(e.date_time);
    const dayName = WEEKDAYS[d.getDay()].slice(0, 3);
    const time = formatTime(e.date_time);

    ctx.save();
    ctx.font = "bold 16px sans-serif";
    ctx.fillStyle = ACCENT; ctx.textBaseline = "middle";
    // Day+time pill
    ctx.fillStyle = "rgba(233,30,140,0.1)";
    roundRect(ctx, PAD, y, 120, 34, 17);
    ctx.fill();
    ctx.fillStyle = ACCENT;
    ctx.font = "bold 15px sans-serif";
    ctx.fillText(`${dayName} ${time}`, PAD + 10, y + 17);
    ctx.restore();

    ctx.font = "500 20px sans-serif";
    ctx.fillStyle = WHITE; ctx.textBaseline = "middle";
    const maxTW = W - PAD * 2 - 140;
    const tt = ctx.measureText(e.title).width > maxTW ? e.title.slice(0, 28) + "…" : e.title;
    ctx.fillText(tt, PAD + 130, y + 17);
  }

  drawFooterBar(ctx, W, H, "DESCUBRA TUDO NA ROXOU", PAD);
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
