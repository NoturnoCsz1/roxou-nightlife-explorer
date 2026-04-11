import JSZip from "jszip";

interface DownloadableEvent {
  title: string;
  slug?: string;
  image_url: string | null;
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function getExtension(url: string): string {
  try {
    const path = new URL(url).pathname;
    const ext = path.split(".").pop()?.toLowerCase();
    if (ext && ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return ext;
  } catch {}
  return "jpg";
}

export async function downloadEventsZip(
  events: DownloadableEvent[],
  onProgress?: (current: number, total: number) => void
) {
  const zip = new JSZip();
  const total = events.filter((e) => e.image_url).length;
  let done = 0;

  for (const event of events) {
    if (!event.image_url) continue;
    const folder = event.slug || toSlug(event.title);
    const ext = getExtension(event.image_url);

    try {
      const res = await fetch(event.image_url);
      if (!res.ok) continue;
      const blob = await res.blob();
      zip.file(`${folder}/imagem.${ext}`, blob);
    } catch {
      // skip failed fetches
    }

    done++;
    onProgress?.(done, total);
  }

  if (Object.keys(zip.files).length === 0) {
    throw new Error("Nenhuma imagem disponível para download.");
  }

  const today = new Date().toISOString().slice(0, 10);
  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = `roxou-imagens-${today}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
