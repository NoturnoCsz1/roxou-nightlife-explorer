/**
 * Text/date/parsing helpers for Roxou cover renderers.
 * Extracted verbatim from the original src/lib/coverRenderer.ts.
 */

import { WEEKDAYS } from "./types";

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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

export async function tryLoadImage(src: string): Promise<HTMLImageElement | null> {
  try { return await loadImage(src); } catch { return null; }
}

export function getDayLabel(): string { return WEEKDAYS[new Date().getDay()]; }

export function getDateShort(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatTime(dt: string) {
  const d = new Date(dt);
  return `${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`;
}

export function extractArtist(desc?: string | null): string | null {
  if (!desc) return null;
  const comMatch = desc.match(/\bcom\s+([A-ZÀ-Ú][^\n,.]{2,40})/i);
  if (comMatch) return comMatch[1].trim();
  const djMatch = desc.match(/\b(?:DJ|Dj|dj)\s+([^\n,.]{2,30})/);
  if (djMatch) return `DJ ${djMatch[1].trim()}`;
  return null;
}

export function extractPrice(desc?: string | null, ticketUrl?: string | null): string | null {
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

export function pickTitle(seed: number = 0): string {
  return TITLE_VARIATIONS[seed % TITLE_VARIATIONS.length];
}
