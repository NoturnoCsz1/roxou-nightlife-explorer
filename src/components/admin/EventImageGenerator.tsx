import { useCallback, useRef, useState } from "react";
import { Loader2, Download, Image as ImageIcon, Send } from "lucide-react";
import { toast } from "sonner";
import { renderFlyer, loadImage, type ArtFormat, FORMAT_SIZES } from "@/lib/coverRenderer";

function buildDownloadName(title: string, dateTime: string, fmt: ArtFormat) {
  const date = new Date(dateTime).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }).replace("/", "-");
  const safeTitle = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(0, 48) || "EVENTO";
  return `ROXOU_${date}_${safeTitle}_${fmt.toUpperCase()}.jpg`;
}

export type ImageFormat = ArtFormat;

interface EventData {
  title: string;
  date_time: string;
  venue_name: string | null;
  category: string;
  sub_category?: string | null;
  image_url: string | null;
  description?: string | null;
  ticket_url?: string | null;
}

interface Props {
  event: EventData;
  badge?: string;
  initialImage?: string;
  onImageGenerated?: (dataUrl: string) => void;
  onSendToDraft?: (imageDataUrl: string) => void;
}

/** Render an individual event card — uses renderFlyer which handles all formats */
async function renderEventCard(
  canvas: HTMLCanvasElement,
  event: EventData,
  badge: string,
  fmt: ArtFormat = "feed"
): Promise<string> {
  return renderFlyer(canvas, event, badge, fmt);
}

export default function EventImageGenerator({ event, badge = "HOJE NA ROXOU", initialImage, onImageGenerated, onSendToDraft }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generating, setGenerating] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(initialImage || null);
  const [fmt, setFmt] = useState<ArtFormat>("feed");

  const generate = useCallback(async () => {
    if (!canvasRef.current) return;
    setGenerating(true);
    try {
      const dataUrl = await renderEventCard(canvasRef.current, event, badge, fmt);
      setImageDataUrl(dataUrl);
      onImageGenerated?.(dataUrl);
      toast.success("Imagem gerada!");
    } catch (err: any) {
      toast.error("Erro ao gerar imagem", { description: err.message });
    } finally {
      setGenerating(false);
    }
  }, [event, badge, fmt, onImageGenerated]);

  const download = useCallback(() => {
    if (!imageDataUrl) return;
    const a = document.createElement("a");
    a.href = imageDataUrl;
    a.download = buildDownloadName(event.title, event.date_time, fmt);
    a.click();
    toast.success("Download iniciado!");
  }, [imageDataUrl, event.title, event.date_time, fmt]);

  const availableFormats: ArtFormat[] = ["feed", "story", "flyer"];

  return (
    <div className="space-y-2">
      <canvas ref={canvasRef} className="hidden" />

      {/* Format toggle */}
      <div className="flex gap-1">
        {availableFormats.map(key => (
          <button
            key={key}
            onClick={() => { setFmt(key); setImageDataUrl(null); }}
            className={`text-[9px] px-2 py-1 rounded-full font-semibold transition ${fmt === key ? "bg-primary/20 text-primary" : "bg-secondary/30 text-muted-foreground hover:text-foreground"}`}
          >
            {FORMAT_SIZES[key].label}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={generate}
          disabled={generating}
          className="flex items-center gap-1 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
        >
          {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
          Gerar imagem
        </button>

        {imageDataUrl && (
          <>
            <button
              onClick={download}
              className="flex items-center gap-1 rounded-md bg-secondary/50 px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition"
            >
              <Download className="h-3 w-3" /> Baixar
            </button>
            {onSendToDraft && (
              <button
                onClick={() => onSendToDraft(imageDataUrl)}
                className="flex items-center gap-1 rounded-md bg-primary/15 px-2.5 py-1.5 text-[10px] font-semibold text-primary hover:bg-primary/25 transition"
              >
                <Send className="h-3 w-3" /> Enviar p/ publicação
              </button>
            )}
          </>
        )}
      </div>

      {imageDataUrl && (
        <div className="rounded-lg overflow-hidden border border-border/30 max-w-[280px]">
          <img src={imageDataUrl} alt="Preview" className="w-full" />
        </div>
      )}
    </div>
  );
}

// Export the render function for bulk generation
export { renderEventCard, loadImage };
export type { EventData };
