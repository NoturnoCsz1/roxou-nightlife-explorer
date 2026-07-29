/**
 * Processamento de foto no cliente antes do envio.
 * O redesenho em canvas remove metadados EXIF e limita dimensões.
 */

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

async function drawToDataUrl(file: File, maxSide: number, quality: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", quality);
}

export async function preparePhoto(file: File): Promise<{ original: string; optimized: string }> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Formato não permitido. Envie JPG, PNG ou WEBP.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Imagem muito grande. Limite de 8 MB.");
  }
  const original = await drawToDataUrl(file, 1280, 0.86);
  const optimized = await drawToDataUrl(file, 480, 0.78);
  return { original, optimized };
}
