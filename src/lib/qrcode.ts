/**
 * QR Code helpers — Fase 10E/10F
 *
 * - generateQrSvg(payload) → string SVG
 * - generateQrPngDataUrl(payload, size) → data URL PNG para download
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

export async function generateQrPngDataUrl(
  payload: string,
  size = 720,
): Promise<string> {
  return QRCode.toDataURL(payload, {
    type: "image/png",
    margin: 2,
    width: size,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

export function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
