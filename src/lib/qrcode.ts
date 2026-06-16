/**
 * QR Code helper — Fase 10E
 *
 * Gera SVG de QR code a partir de string. Usado nas páginas públicas de
 * confirmação da Lista VIP e no comprovante para o porteiro.
 */
import QRCode from "qrcode";

export async function generateQrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, {
    type: "svg",
    margin: 1,
    width: 240,
    color: { dark: "#000000", light: "#ffffff" },
  });
}
