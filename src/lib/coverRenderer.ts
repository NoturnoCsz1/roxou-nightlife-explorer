/**
 * Canvas-based cover renderers for Instagram covers (1080x1080 feed format).
 * Renders "Agenda do Dia", "Melhores Rolês", "Fim de Semana", "Parceiros em Alta".
 */

const W = 1080;
const H = 1080;
const BG = "#0f0a1a";
const ACCENT = "#e91e8c";
const ACCENT_ALT = "#9333ea";
const WHITE = "#ffffff";
const MUTED = "rgba(255,255,255,0.5)";
const PAD = 64;

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

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function drawGrain(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.globalAlpha = 0.02;
  for (let i = 0; i < 1500; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#000";
    ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 2, Math.random() * 2);
  }
  ctx.restore();
}

function drawFooter(ctx: CanvasRenderingContext2D, cta: string) {
  // Divider
  const divGrad = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
  divGrad.addColorStop(0, "rgba(233,30,140,0.4)");
  divGrad.addColorStop(0.5, "rgba(147,51,234,0.2)");
  divGrad.addColorStop(1, "rgba(233,30,140,0)");
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, H - 110);
  ctx.lineTo(W - PAD, H - 110);
  ctx.stroke();

  // CTA
  ctx.font = "bold 24px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.textBaseline = "top";
  ctx.fillText(cta, PAD, H - 90);

  // URL
  ctx.font = "400 20px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillText("roxou.com.br", PAD, H - 60);

  // ROXOU brand
  ctx.save();
  ctx.font = "bold 28px sans-serif";
  const grad = ctx.createLinearGradient(W - 180, H - 80, W - PAD, H - 80);
  grad.addColorStop(0, ACCENT);
  grad.addColorStop(1, ACCENT_ALT);
  ctx.fillStyle = grad;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText("ROXOU", W - PAD, H - 80);
  ctx.restore();
}

/** Draw a collage of event flyers as background */
async function drawFlyerCollage(ctx: CanvasRenderingContext2D, imageUrls: string[]) {
  const urls = imageUrls.filter(Boolean).slice(0, 3);
  if (urls.length === 0) return;

  const colW = W / urls.length;
  for (let i = 0; i < urls.length; i++) {
    try {
      const img = await loadImage(urls[i]);
      const imgRatio = img.width / img.height;
      const targetRatio = colW / H;
      let sw = img.width, sh = img.height, sx = 0, sy = 0;
      if (imgRatio > targetRatio) {
        sw = img.height * targetRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / targetRatio;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, i * colW, 0, colW, H);
    } catch { /* skip */ }
  }

  // Heavy overlay
  const overlay = ctx.createLinearGradient(0, 0, 0, H);
  overlay.addColorStop(0, "rgba(15,10,26,0.6)");
  overlay.addColorStop(0.4, "rgba(15,10,26,0.8)");
  overlay.addColorStop(1, "rgba(15,10,26,0.95)");
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, W, H);

  // Purple tint
  ctx.fillStyle = "rgba(147,51,234,0.05)";
  ctx.fillRect(0, 0, W, H);
}

function drawBadge(ctx: CanvasRenderingContext2D, text: string) {
  ctx.save();
  ctx.font = "bold 22px sans-serif";
  const bw = ctx.measureText(text).width + 36;
  const bh = 40;
  const grad = ctx.createLinearGradient(PAD, PAD, PAD + bw, PAD);
  grad.addColorStop(0, ACCENT);
  grad.addColorStop(1, ACCENT_ALT);
  ctx.fillStyle = grad;
  roundRect(ctx, PAD, PAD, bw, bh, 20);
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.textBaseline = "middle";
  ctx.fillText(text, PAD + 18, PAD + bh / 2 + 1);
  ctx.restore();
}

// ============ COVER TYPES ============

export interface CoverEvent {
  title: string;
  date_time: string;
  venue_name: string | null;
  category: string;
  image_url: string | null;
}

export interface CoverPartner {
  name: string;
  logo_url: string | null;
  views: number;
}

const WEEKDAYS = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];

function getDayLabel(): string {
  const d = new Date();
  return WEEKDAYS[d.getDay()];
}

function getDateShort(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function renderCoverAgenda(
  canvas: HTMLCanvasElement,
  events: CoverEvent[]
): Promise<string> {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const imageUrls = events.map(e => e.image_url).filter(Boolean) as string[];
  await drawFlyerCollage(ctx, imageUrls);
  drawGrain(ctx, W, H);
  drawBadge(ctx, "AGENDA DO DIA");

  // Title
  ctx.save();
  ctx.font = "bold 56px sans-serif";
  ctx.fillStyle = WHITE;
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 12;
  const lines = wrapText(ctx, "O QUE ROLA HOJE EM PRUDENTE", W - PAD * 2);
  lines.forEach((l, i) => ctx.fillText(l, PAD, 160 + i * 66));
  ctx.shadowBlur = 0;
  ctx.restore();

  // Subtitle
  ctx.font = "bold 30px sans-serif";
  ctx.fillStyle = ACCENT;
  ctx.textBaseline = "top";
  ctx.fillText(`${getDayLabel()} · ${getDateShort()}`, PAD, 160 + lines.length * 66 + 10);

  // Event list
  const listY = 160 + lines.length * 66 + 60;
  ctx.font = "500 24px sans-serif";
  ctx.textBaseline = "top";
  const maxItems = Math.min(events.length, 6);
  for (let i = 0; i < maxItems; i++) {
    const e = events[i];
    const h = new Date(e.date_time);
    const time = `${String(h.getHours()).padStart(2, "0")}h${String(h.getMinutes()).padStart(2, "0")}`;
    const y = listY + i * 52;

    // Time badge
    ctx.save();
    ctx.fillStyle = "rgba(233,30,140,0.15)";
    roundRect(ctx, PAD, y, 90, 36, 18);
    ctx.fill();
    ctx.fillStyle = ACCENT;
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(time, PAD + 14, y + 9);
    ctx.restore();

    // Event name
    ctx.fillStyle = WHITE;
    ctx.font = "500 22px sans-serif";
    const maxTitleW = W - PAD * 2 - 110;
    const titleText = ctx.measureText(e.title).width > maxTitleW
      ? e.title.slice(0, 35) + "…" : e.title;
    ctx.fillText(titleText, PAD + 100, y + 9);
  }

  drawFooter(ctx, "ACESSE ROXOU.COM.BR E FIQUE POR DENTRO");
  return canvas.toDataURL("image/jpeg", 0.92);
}

export async function renderCoverTopRoles(
  canvas: HTMLCanvasElement,
  events: CoverEvent[]
): Promise<string> {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const imageUrls = events.slice(0, 3).map(e => e.image_url).filter(Boolean) as string[];
  await drawFlyerCollage(ctx, imageUrls);
  drawGrain(ctx, W, H);
  drawBadge(ctx, "TOP ROLÊS");

  // Title
  ctx.save();
  ctx.font = "bold 52px sans-serif";
  ctx.fillStyle = WHITE;
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 10;
  ctx.fillText("CONFIRA OS MELHORES", PAD, 150);
  ctx.fillText("ROLÊS", PAD, 210);
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.font = "400 24px sans-serif";
  ctx.fillStyle = MUTED;
  ctx.fillText("Selecionamos os destaques do dia", PAD, 275);

  // Ranked events
  const medals = ["🥇", "🥈", "🥉"];
  const rankY = 340;
  for (let i = 0; i < Math.min(events.length, 3); i++) {
    const e = events[i];
    const y = rankY + i * 140;
    const h = new Date(e.date_time);
    const time = `${String(h.getHours()).padStart(2, "0")}h${String(h.getMinutes()).padStart(2, "0")}`;

    // Card bg
    ctx.save();
    ctx.fillStyle = i === 0 ? "rgba(233,30,140,0.12)" : "rgba(255,255,255,0.04)";
    roundRect(ctx, PAD, y, W - PAD * 2, 120, 16);
    ctx.fill();
    ctx.restore();

    // Medal
    ctx.font = "48px sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(medals[i], PAD + 16, y + 28);

    // Title
    ctx.font = i === 0 ? "bold 30px sans-serif" : "bold 26px sans-serif";
    ctx.fillStyle = WHITE;
    ctx.textBaseline = "top";
    const titleLines = wrapText(ctx, e.title, W - PAD * 2 - 120);
    titleLines.slice(0, 2).forEach((l, li) => ctx.fillText(l, PAD + 80, y + 20 + li * 34));

    // Time + venue
    ctx.font = "400 20px sans-serif";
    ctx.fillStyle = ACCENT;
    ctx.fillText(`${time}${e.venue_name ? `  ·  ${e.venue_name}` : ""}`, PAD + 80, y + 20 + Math.min(titleLines.length, 2) * 34 + 6);
  }

  drawFooter(ctx, "VEJA TUDO EM ROXOU.COM.BR");
  return canvas.toDataURL("image/jpeg", 0.92);
}

export async function renderCoverWeekend(
  canvas: HTMLCanvasElement,
  events: CoverEvent[]
): Promise<string> {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const imageUrls = events.map(e => e.image_url).filter(Boolean) as string[];
  await drawFlyerCollage(ctx, imageUrls);
  drawGrain(ctx, W, H);
  drawBadge(ctx, "FIM DE SEMANA");

  // Title
  ctx.save();
  ctx.font = "bold 54px sans-serif";
  ctx.fillStyle = WHITE;
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 10;
  const titleLines = wrapText(ctx, "O QUE ROLA NESTE FIM DE SEMANA", W - PAD * 2);
  titleLines.forEach((l, i) => ctx.fillText(l, PAD, 150 + i * 64));
  ctx.shadowBlur = 0;
  ctx.restore();

  // Days pill
  ctx.font = "bold 28px sans-serif";
  ctx.fillStyle = ACCENT;
  ctx.textBaseline = "top";
  ctx.fillText("SEXTA · SÁBADO · DOMINGO", PAD, 150 + titleLines.length * 64 + 12);

  // Event grid (compact)
  const gridY = 150 + titleLines.length * 64 + 70;
  const maxItems = Math.min(events.length, 6);
  for (let i = 0; i < maxItems; i++) {
    const e = events[i];
    const h = new Date(e.date_time);
    const time = `${String(h.getHours()).padStart(2, "0")}h`;
    const dayName = WEEKDAYS[h.getDay()].slice(0, 3);
    const y = gridY + i * 48;

    ctx.save();
    ctx.font = "bold 18px sans-serif";
    ctx.fillStyle = "rgba(233,30,140,0.7)";
    ctx.textBaseline = "top";
    ctx.fillText(`${dayName} ${time}`, PAD, y + 4);

    ctx.font = "500 22px sans-serif";
    ctx.fillStyle = WHITE;
    const maxTW = W - PAD * 2 - 140;
    const tt = ctx.measureText(e.title).width > maxTW ? e.title.slice(0, 30) + "…" : e.title;
    ctx.fillText(tt, PAD + 130, y + 4);
    ctx.restore();
  }

  drawFooter(ctx, "DESCUBRA TUDO NA ROXOU");
  return canvas.toDataURL("image/jpeg", 0.92);
}

export async function renderCoverPartners(
  canvas: HTMLCanvasElement,
  partners: CoverPartner[]
): Promise<string> {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  drawGrain(ctx, W, H);

  // Purple glow circle
  const glow = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 500);
  glow.addColorStop(0, "rgba(147,51,234,0.08)");
  glow.addColorStop(1, "rgba(15,10,26,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  drawBadge(ctx, "PARCEIROS EM ALTA");

  // Title
  ctx.save();
  ctx.font = "bold 52px sans-serif";
  ctx.fillStyle = WHITE;
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 10;
  ctx.fillText("PARCEIROS EM ALTA", PAD, 150);
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.font = "400 24px sans-serif";
  ctx.fillStyle = MUTED;
  ctx.fillText("Os locais mais acessados da semana", PAD, 218);

  // Partner ranking
  const rankY = 300;
  for (let i = 0; i < Math.min(partners.length, 5); i++) {
    const p = partners[i];
    const y = rankY + i * 120;

    // Card
    ctx.save();
    ctx.fillStyle = i === 0 ? "rgba(233,30,140,0.1)" : "rgba(255,255,255,0.03)";
    roundRect(ctx, PAD, y, W - PAD * 2, 100, 14);
    ctx.fill();
    ctx.restore();

    // Rank number
    ctx.save();
    ctx.font = "bold 36px sans-serif";
    const rankGrad = ctx.createLinearGradient(PAD + 16, y, PAD + 60, y);
    rankGrad.addColorStop(0, ACCENT);
    rankGrad.addColorStop(1, ACCENT_ALT);
    ctx.fillStyle = rankGrad;
    ctx.textBaseline = "top";
    ctx.fillText(`#${i + 1}`, PAD + 16, y + 28);
    ctx.restore();

    // Logo circle placeholder
    if (p.logo_url) {
      try {
        const img = await loadImage(p.logo_url);
        ctx.save();
        ctx.beginPath();
        ctx.arc(PAD + 120, y + 50, 30, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, PAD + 90, y + 20, 60, 60);
        ctx.restore();
      } catch {
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.beginPath();
        ctx.arc(PAD + 120, y + 50, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Name
    ctx.font = "bold 26px sans-serif";
    ctx.fillStyle = WHITE;
    ctx.textBaseline = "top";
    ctx.fillText(p.name, PAD + 170, y + 24);

    // Views
    ctx.font = "400 18px sans-serif";
    ctx.fillStyle = MUTED;
    ctx.fillText(`${p.views} acessos`, PAD + 170, y + 58);
  }

  drawFooter(ctx, "DESCUBRA MAIS EM ROXOU.COM.BR");
  return canvas.toDataURL("image/jpeg", 0.92);
}

/** Render a CTA final slide for carousels */
export async function renderCTASlide(canvas: HTMLCanvasElement): Promise<string> {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  drawGrain(ctx, W, H);

  // Central glow
  const glow = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 400);
  glow.addColorStop(0, "rgba(233,30,140,0.12)");
  glow.addColorStop(0.5, "rgba(147,51,234,0.06)");
  glow.addColorStop(1, "rgba(15,10,26,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ROXOU big
  ctx.save();
  ctx.font = "bold 80px sans-serif";
  const brandGrad = ctx.createLinearGradient(W / 2 - 150, H / 2 - 120, W / 2 + 150, H / 2 - 120);
  brandGrad.addColorStop(0, ACCENT);
  brandGrad.addColorStop(1, ACCENT_ALT);
  ctx.fillStyle = brandGrad;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ROXOU", W / 2, H / 2 - 100);
  ctx.restore();

  // CTA text
  ctx.save();
  ctx.font = "bold 36px sans-serif";
  ctx.fillStyle = WHITE;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const ctaLines = wrapText(ctx, "ACESSE ROXOU.COM.BR E DESCUBRA TUDO QUE ROLA EM PRUDENTE", W - PAD * 3);
  ctaLines.forEach((l, i) => ctx.fillText(l, W / 2, H / 2 + i * 46));
  ctx.restore();

  // Arrow / swipe hint
  ctx.save();
  ctx.font = "400 22px sans-serif";
  ctx.fillStyle = MUTED;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("👆 Deslize para ver os eventos", W / 2, H / 2 + ctaLines.length * 46 + 50);
  ctx.restore();

  // URL
  ctx.save();
  ctx.font = "bold 28px sans-serif";
  ctx.fillStyle = ACCENT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("roxou.com.br", W / 2, H - 100);
  ctx.restore();

  return canvas.toDataURL("image/jpeg", 0.92);
}
