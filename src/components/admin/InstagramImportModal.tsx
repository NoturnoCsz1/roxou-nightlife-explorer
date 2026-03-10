import { useState } from "react";
import { Instagram, Loader2, X, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (data: ExtractedEvent) => void;
}

const InstagramImportModal = ({ open, onClose, onImport }: Props) => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ExtractedEvent | null>(null);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleAnalyze() {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setPreview(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("import-instagram", {
        body: { url: url.trim() },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      if (data?.extracted) {
        setPreview(data.extracted);
        toast.success("Post analisado com sucesso!");
      } else {
        setError("Não foi possível extrair dados do post.");
      }
    } catch (err: any) {
      console.error("Import error:", err);
      setError(err.message || "Erro ao analisar post");
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
    setPreview(null);
    setError("");
    setLoading(false);
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
          {/* URL Input */}
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
            onClick={handleAnalyze}
            disabled={loading || !url.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analisando...
              </>
            ) : (
              "Analisar Post"
            )}
          </button>

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
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
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
                  onClick={handleClose}
                  className="flex-1 rounded-lg border border-border/50 px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary/50 transition"
                >
                  Cancelar
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
