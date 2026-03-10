import { useState } from "react";
import { Instagram, Loader2, X, AlertCircle, Link2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ImageUpload from "@/components/admin/ImageUpload";

interface ExtractedEvent {
  title: string;
  description: string;
  date: string;
  time: string;
  venue_name: string;
  category: string;
  city: string;
  instagram: string;
  ticket_url: string;
  image_url: string;
  confidence?: "high" | "medium" | "low";
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (data: ExtractedEvent) => void;
}

type Mode = "url" | "manual";

const InstagramImportModal = ({ open, onClose, onImport }: Props) => {
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ExtractedEvent | null>(null);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleAnalyzeUrl() {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setPreview(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("import-instagram", {
        body: { url: url.trim() },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error && data?.weak_metadata) {
        // Weak/blocked metadata - switch to manual
        setMode("manual");
        setError(data.error);
        toast.warning("Troque para o modo manual para continuar.");
        return;
      }
      if (data?.error) throw new Error(data.error);

      if (data?.extracted && data.extracted.title) {
        setPreview({ ...data.extracted, confidence: data.confidence || "medium" });
        toast.success("Post analisado com sucesso!");
      } else {
        setMode("manual");
        setError("Não foi possível ler o post automaticamente com confiança. Use o modo manual.");
      }
    } catch (err: any) {
      console.error("Import error:", err);
      // Auto-switch to manual mode on failure
      setMode("manual");
      setError("Não foi possível ler o post automaticamente. Cole a legenda abaixo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyzeCaption() {
    if (!caption.trim()) return;
    setLoading(true);
    setError("");
    setPreview(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("import-instagram", {
        body: { caption: caption.trim() },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      if (data?.extracted) {
        // Override image with manually uploaded one
        if (manualImageUrl) {
          data.extracted.image_url = manualImageUrl;
        }
        setPreview(data.extracted);
        toast.success("Legenda analisada com sucesso!");
      } else {
        setError("Não foi possível extrair dados da legenda.");
      }
    } catch (err: any) {
      console.error("Manual import error:", err);
      setError(err.message || "Erro ao analisar legenda");
    } finally {
      setLoading(false);
    }
  }

  function handleConfirm() {
    if (preview) {
      onImport(preview);
      handleClose();
    }
  }

  function handleClose() {
    setUrl("");
    setCaption("");
    setManualImageUrl("");
    setPreview(null);
    setError("");
    setLoading(false);
    setMode("url");
    onClose();
  }

  const fieldLabel = (label: string, value: string) => (
    <div className="flex items-start gap-2">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide shrink-0 w-20 pt-0.5">
        {label}
      </span>
      <span className="text-xs text-foreground break-words min-w-0">
        {value || <span className="text-muted-foreground/50 italic">não encontrado</span>}
      </span>
    </div>
  );

  const tabClass = (m: Mode) =>
    `flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
      mode === m
        ? "bg-primary text-primary-foreground"
        : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
      <div className="bg-card border border-border/40 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <div className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Importar do Instagram</h2>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-secondary/50 transition">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Mode tabs */}
          {!preview && (
            <div className="flex gap-1.5">
              <button onClick={() => { setMode("url"); setError(""); }} className={tabClass("url")}>
                <Link2 className="h-3.5 w-3.5" /> URL do Post
              </button>
              <button onClick={() => { setMode("manual"); setError(""); }} className={tabClass("manual")}>
                <FileText className="h-3.5 w-3.5" /> Colar Legenda
              </button>
            </div>
          )}

          {/* URL mode */}
          {mode === "url" && !preview && (
            <>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">URL do Post</label>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.instagram.com/p/..."
                  className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 transition"
                  disabled={loading}
                />
              </div>
              <button
                onClick={handleAnalyzeUrl}
                disabled={loading || !url.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analisando...</> : "Analisar Post"}
              </button>
            </>
          )}

          {/* Manual mode */}
          {mode === "manual" && !preview && (
            <>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Legenda do Post</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Cole aqui a legenda do post do Instagram..."
                  className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 transition min-h-[120px] resize-y"
                  disabled={loading}
                />
              </div>
              <ImageUpload
                folder="events"
                currentUrl={manualImageUrl}
                onUploaded={(url) => setManualImageUrl(url)}
                label="Flyer do Evento (opcional)"
              />
              <button
                onClick={handleAnalyzeCaption}
                disabled={loading || !caption.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analisando...</> : "Analisar Legenda"}
              </button>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide border-b border-border/30 pb-1">
                Dados Extraídos
              </p>

              {preview.image_url && (
                <div className="rounded-lg overflow-hidden border border-border/30">
                  <img
                    src={preview.image_url}
                    alt="Flyer"
                    className="w-full h-40 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                {fieldLabel("Título", preview.title)}
                {fieldLabel("Data", preview.date)}
                {fieldLabel("Horário", preview.time)}
                {fieldLabel("Local", preview.venue_name)}
                {fieldLabel("Categoria", preview.category)}
                {fieldLabel("Instagram", preview.instagram ? `@${preview.instagram}` : "")}
                {fieldLabel("Ingresso", preview.ticket_url)}
                {fieldLabel("Descrição", preview.description?.substring(0, 150) + (preview.description?.length > 150 ? "..." : ""))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setPreview(null)}
                  className="flex-1 rounded-lg border border-border/50 px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary/50 transition"
                >
                  Voltar
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition"
                >
                  Usar dados
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstagramImportModal;
