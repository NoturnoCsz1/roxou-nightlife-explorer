import { STORY_BG, STORY_LILAC, type CoverEvent } from "../types";
import { drawGrain } from "../canvas";
import { roundRect, tryLoadImage, wrapText } from "../utils";

export async function renderStoryV3(
  canvas: HTMLCanvasElement,
  event: CoverEvent & { aura_phrase?: string | null }
): Promise<string> {
  const W = 1080, H = 1920;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const PAD = 80; // mais respiro lateral

  // 1) Solid dark base (fallback se não tiver imagem)
  ctx.fillStyle = STORY_BG;
  ctx.fillRect(0, 0, W, H);

  // 2) FLYER COMO PROTAGONISTA — sem blur, contraste preservado
  if (event.image_url) {
    const img = await tryLoadImage(event.image_url);
    if (img) {
      const imgR = img.width / img.height;
      const canR = W / H;
      let sw = img.width, sh = img.height, sx = 0, sy = 0;
      if (imgR > canR) { sw = img.height * canR; sx = (img.width - sw) / 2; }
      else { sh = img.width / canR; sy = (img.height - sh) / 2; }
      ctx.save();
      // Praticamente sem blur, brilho total — o flyer é o herói
      ctx.filter = "blur(0.6px) brightness(1.0) saturate(1.05)";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
      ctx.filter = "none";
      ctx.restore();
    }
  }

  // 3) Gradiente cinematográfico apenas na BASE (preserva o centro/artista)
  const pg = ctx.createLinearGradient(0, H, 0, 0);
  pg.addColorStop(0, "rgba(0,0,0,0.88)");
  pg.addColorStop(0.30, "rgba(0,0,0,0.45)");
  pg.addColorStop(0.60, "rgba(0,0,0,0.12)");
  pg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = pg;
  ctx.fillRect(0, 0, W, H);

  // Top fade muito leve só atrás do badge (não escurece o flyer)
  const tg = ctx.createLinearGradient(0, 0, 0, 240);
  tg.addColorStop(0, "rgba(0,0,0,0.42)");
  tg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = tg;
  ctx.fillRect(0, 0, W, 240);

  // Vinheta cinematográfica suave nos cantos
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.32)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // Glow roxo cinematográfico discreto na base
  const purpleGlow = ctx.createRadialGradient(W / 2, H - 200, 0, W / 2, H - 200, W * 0.7);
  purpleGlow.addColorStop(0, "rgba(168,85,247,0.18)");
  purpleGlow.addColorStop(1, "rgba(168,85,247,0)");
  ctx.fillStyle = purpleGlow;
  ctx.fillRect(0, 0, W, H);

  drawGrain(ctx, W, H);

  // 4) Frames laterais neon — mais sutis
  ctx.save();
  ctx.strokeStyle = "rgba(168,85,247,0.85)";
  ctx.lineWidth = 1.5;
  ctx.shadowColor = "rgba(168,85,247,0.6)";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(1, 0); ctx.lineTo(1, H);
  ctx.moveTo(W - 1, 0); ctx.lineTo(W - 1, H);
  ctx.stroke();
  ctx.restore();

  // 5) Badge superior "💜 AURA INDICA" — glass premium
  const badgeText = "💜 AURA INDICA";
  ctx.save();
  ctx.font = "700 24px sans-serif";
  const bw = ctx.measureText(badgeText).width + 42;
  const bh = 52;
  const bx = PAD;
  const by = PAD + 16;
  ctx.shadowColor = "rgba(168,85,247,0.4)";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "rgba(20,10,35,0.42)";
  roundRect(ctx, bx, by, bw, bh, bh / 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(168,85,247,0.55)";
  ctx.lineWidth = 1;
  roundRect(ctx, bx, by, bw, bh, bh / 2);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, bx + bw / 2, by + bh / 2 + 1);
  ctx.restore();

  // 5b) DIA DA SEMANA — pill glass discreto no canto superior direito
  {
    const wDate = new Date(event.date_time);
    const weekdayFull = ["DOMINGO","SEGUNDA","TERÇA","QUARTA","QUINTA","SEXTA","SÁBADO"];
    const weekdayText = weekdayFull[wDate.getDay()];
    ctx.save();
    ctx.font = "700 22px sans-serif";
    const wTextW = ctx.measureText(weekdayText).width;
    // Tracking simulado: aumenta padding lateral
    const wpw = wTextW + 36;
    const wph = 42;
    const wpx = W - PAD - wpw;
    const wpy = PAD + 16 + (52 - wph) / 2; // alinhado com badge AURA
    // Garante não sobrepor o badge (gap mínimo de 16px)
    const minLeft = bx + bw + 16;
    const finalX = Math.max(wpx, minLeft);
    if (finalX + wpw <= W - PAD) {
      ctx.shadowColor = "rgba(255,255,255,0.08)";
      ctx.shadowBlur = 6;
      ctx.fillStyle = "rgba(10,10,20,0.22)";
      roundRect(ctx, finalX, wpy, wpw, wph, wph / 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      roundRect(ctx, finalX, wpy, wpw, wph, wph / 2);
      ctx.stroke();
      // Texto com letter-spacing manual
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const letters = weekdayText.split("");
      const spacing = 2.5;
      const totalLetterW = letters.reduce((s, l) => s + ctx.measureText(l).width, 0) + spacing * (letters.length - 1);
      let lx = finalX + (wpw - totalLetterW) / 2;
      const ly = wpy + wph / 2 + 1;
      letters.forEach((l) => {
        ctx.fillText(l, lx, ly);
        lx += ctx.measureText(l).width + spacing;
      });
    }
    ctx.restore();
  }

  // 6) TÍTULO — peso reduzido, hierarquia mais elegante
  const titleMaxW = W - PAD * 2;
  ctx.save();
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  let titleSize = 78; // reduzido de 96
  let titleLines: string[] = [];
  for (; titleSize >= 48; titleSize -= 4) {
    ctx.font = `800 ${titleSize}px sans-serif`;
    const lines = wrapText(ctx, event.title, titleMaxW);
    if (lines.length <= 2 && lines.every(l => ctx.measureText(l).width <= titleMaxW)) {
      titleLines = lines;
      break;
    }
  }
  if (!titleLines.length) {
    // Permite até 3 linhas mas com peso menor
    for (titleSize = 64; titleSize >= 44; titleSize -= 3) {
      ctx.font = `800 ${titleSize}px sans-serif`;
      const lines = wrapText(ctx, event.title, titleMaxW);
      if (lines.length <= 3) { titleLines = lines; break; }
    }
    if (!titleLines.length) {
      ctx.font = `800 ${titleSize}px sans-serif`;
      titleLines = wrapText(ctx, event.title, titleMaxW).slice(0, 3);
      let last = titleLines[2] || "";
      while (ctx.measureText(last + "…").width > titleMaxW && last.length > 4) last = last.slice(0, -2);
      if (titleLines[2]) titleLines[2] = last.trim() + "…";
    }
  }
  ctx.font = `800 ${titleSize}px sans-serif`;
  const lineH = Math.round(titleSize * 1.05); // line-height mais apertado
  const titleBlockH = titleLines.length * lineH;
  const titleY = H - 130 - 124 - 36 - 110 - 28 - titleBlockH;
  // Sombra mais leve — não cria bloco escuro atrás do texto
  ctx.fillStyle = "#FFFFFF";
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 2;
  titleLines.forEach((l, i) => ctx.fillText(l, PAD, titleY + i * lineH));
  ctx.restore();

  // 7) INFO CARD — glassmorphism premium, leve
  const d = new Date(event.date_time);
  const months = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
  const weekdays = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];
  const mins = d.getMinutes();
  const timeStr = mins ? `${String(d.getHours()).padStart(2,"0")}h${String(mins).padStart(2,"0")}` : `${String(d.getHours()).padStart(2,"0")}h`;
  const dateStr = `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;

  const segments: { icon: string; text: string }[] = [
    { icon: "🕒", text: timeStr },
    { icon: "📅", text: dateStr },
  ];
  if (event.venue_name) segments.push({ icon: "📍", text: event.venue_name });

  const cardH = 70; // mais leve
  const cardX = PAD;
  const cardY = H - 130 - 124 - 36 - cardH;
  const cardW = W - PAD * 2;

  ctx.save();
  // Glow sutil atrás do card
  ctx.shadowColor = "rgba(168,85,247,0.25)";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "rgba(10,5,20,0.32)";
  roundRect(ctx, cardX, cardY, cardW, cardH, 16);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1;
  roundRect(ctx, cardX, cardY, cardW, cardH, 16);
  ctx.stroke();
  ctx.restore();

  // Texto do info card
  ctx.save();
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const ry = cardY + cardH / 2;
  const sepW = 18;
  let textSize = 24;
  const measure = (size: number) => {
    ctx.font = `600 ${size}px sans-serif`;
    let total = 0;
    segments.forEach((s, i) => {
      total += ctx.measureText(s.icon).width + 10 + ctx.measureText(s.text).width;
      if (i < segments.length - 1) total += sepW + 16;
    });
    return total;
  };
  while (textSize > 16 && measure(textSize) > cardW - 40) textSize -= 1;
  if (measure(textSize) > cardW - 40 && segments[2]) {
    while (measure(textSize) > cardW - 40 && segments[2].text.length > 6) {
      segments[2].text = segments[2].text.slice(0, -2);
    }
    segments[2].text = segments[2].text.trim() + "…";
  }
  ctx.font = `600 ${textSize}px sans-serif`;
  let cx = cardX + 22;
  segments.forEach((s, i) => {
    ctx.fillStyle = STORY_LILAC;
    ctx.fillText(s.icon, cx, ry);
    cx += ctx.measureText(s.icon).width + 10;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(s.text, cx, ry);
    cx += ctx.measureText(s.text).width;
    if (i < segments.length - 1) {
      ctx.fillStyle = "rgba(168,85,247,0.45)";
      ctx.fillText("|", cx + 8, ry);
      cx += sepW + 16;
    }
  });
  ctx.restore();

  // 8) CTA — premium com glow neon roxo refinado
  const ctaText = "🔥 VEJA MAIS EM ROXOU.COM.BR";
  const safeW = W - PAD * 2;
  const ctaW = Math.round(safeW * 0.92);
  const ctaH = 118;
  const ctaX = (W - ctaW) / 2;
  const ctaYpos = H - ctaH - 130;

  ctx.save();
  // Halo neon refinado — sombra mais difusa, menos arcade
  ctx.shadowColor = "rgba(168,85,247,0.32)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;
  // Gradiente sofisticado — roxo profundo, menos vibrante
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaYpos, ctaX + ctaW, ctaYpos + ctaH);
  ctaGrad.addColorStop(0, "#A855F7");
  ctaGrad.addColorStop(0.5, "#9333EA");
  ctaGrad.addColorStop(1, "#7E22CE");
  ctx.fillStyle = ctaGrad;
  roundRect(ctx, ctaX, ctaYpos, ctaW, ctaH, ctaH / 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Camada glass leve por cima — refina e suaviza saturação
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  roundRect(ctx, ctaX, ctaYpos, ctaW, ctaH, ctaH / 2);
  ctx.fill();

  // Inner highlight (glass top) — mais suave
  const innerGrad = ctx.createLinearGradient(0, ctaYpos, 0, ctaYpos + ctaH / 2);
  innerGrad.addColorStop(0, "rgba(255,255,255,0.12)");
  innerGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = innerGrad;
  roundRect(ctx, ctaX + 2, ctaYpos + 2, ctaW - 4, ctaH / 2, ctaH / 2);
  ctx.fill();

  // Borda glass branca — mais discreta
  ctx.strokeStyle = "rgba(255,255,255,0.20)";
  ctx.lineWidth = 1.2;
  roundRect(ctx, ctaX + 1, ctaYpos + 1, ctaW - 2, ctaH - 2, (ctaH - 2) / 2);
  ctx.stroke();

  // Texto CTA
  let ctaSize = 38;
  ctx.font = `900 ${ctaSize}px sans-serif`;
  while (ctx.measureText(ctaText).width > ctaW - 60 && ctaSize > 22) {
    ctaSize -= 1;
    ctx.font = `900 ${ctaSize}px sans-serif`;
  }
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 6;
  ctx.fillText(ctaText.toUpperCase(), W / 2, ctaYpos + ctaH / 2 + 2);
  ctx.restore();

  // 9) Footer
  ctx.save();
  ctx.font = "500 22px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("roxou.com.br", W / 2, H - 48);
  ctx.restore();

  return canvas.toDataURL("image/png");
}
