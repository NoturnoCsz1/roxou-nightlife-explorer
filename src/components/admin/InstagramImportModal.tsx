import { useState } from "react";
import { Instagram, Loader2, X, AlertCircle, Link2, FileText, ImagePlus, Sparkles, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ImageUpload from "@/components/admin/ImageUpload";
import ImportDebugPanel from "@/components/admin/ImportDebugPanel";

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

type Mode = "manual" | "url";

const InstagramImportModal = ({ open, onClose, onImport }: Props) => {
  const [mode, setMode] = useState<Mode>("manual");
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ExtractedEvent | null>(null);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState<any>(null);

  if (!open) return null;

  async function handleAnalyzeUrl() {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setPreview(null);
    setDebugInfo(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("import-instagram", {
        body: { url: url.trim() },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.debug) setDebugInfo(data.debug);
      if (data?.error && data?.weak_metadata) {
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
    setDebugInfo(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("import-instagram", {
        body: { caption: caption.trim() },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.debug) setDebugInfo(data.debug);
      if (data?.error) throw new Error(data.error);

      if (data?.extracted) {
        if (manualImageUrl) {
          data.extracted.image_url = manualImageUrl;
        }
        setPreview({ ...data.extracted, confidence: data.confidence || "medium" });
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
    setDebugInfo(null);
    setLoading(false);
    setMode("manual");
    onClose();
  }

  const fieldLabel = (label: string, value: string) => (
    <div className="flex items-start gap-2.5 py-1 border-b border-border/10 last:border-0">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 w-20 pt-0.5">
        {label}
      </span>
      <span className="text-xs text-foreground break-words min-w-0 leading-relaxed">
        {value || <span className="text-muted-foreground/40 italic">não encontrado</span>}
      </span>
    </div>
  );

  const tabClass = (m: Mode) =>
    `flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 ${
      mode === m
        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
        : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70"
    }`;

  const confidenceBadge = (conf: "high" | "medium" | "low") => {
    const label = conf === "high" ? "Alta confiança" : conf === "medium" ? "Média confiança" : "Baixa confiança";
    const cls = conf === "high"
      ? "bg-green-500/15 text-green-500 border-green-500/30"
      : conf === "medium"
      ? "bg-yellow-500/15 text-yellow-500 border-yellow-500/30"
      : "bg-destructive/10 text-destructive border-destructive/30";
    return (
      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${cls}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-3">
      <div className="bg-card border border-border/40 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm flex items-center justify-between p-4 border-b border-border/30">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Instagram className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground leading-tight">Importar do Instagram</h2>
              <p className="text-[10px] text-muted-foreground">Preencha o evento com dados do post</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-xl hover:bg-secondary/50 transition">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Mode tabs */}
          {!preview && (
            <div className="flex gap-1.5 p-1 bg-secondary/20 rounded-xl">
              <button onClick={() => { setMode("manual"); setError(""); }} className={tabClass("manual")}>
                <FileText className="h-3.5 w-3.5" /> Colar Legenda
              </button>
              <button onClick={() => { setMode("url"); setError(""); }} className={tabClass("url")}>
                <FlaskConical className="h-3.5 w-3.5" /> URL do Post
              </button>
            </div>
          )}

          {/* ── Manual mode (primary) ── */}
          {mode === "manual" && !preview && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-xl bg-primary/5 border border-primary/10 p-3">
                <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Cole a legenda do Instagram e envie o flyer para preencher automaticamente.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Legenda do Post</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder={"Cole aqui a legenda completa do post do Instagram...\n\nExemplo:\n🎉 FESTA NEON — 15/03\n📍 Club XYZ\n🎟️ Ingressos: link.com/neon\n\nDJs: Fulano, Ciclano\n#balada #sp"}
                  className="w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition min-h-[160px] resize-y placeholder:text-muted-foreground/30 leading-relaxed"
                  disabled={loading}
                />
                <p className="text-[10px] text-muted-foreground/50">
                  Quanto mais completa a legenda, melhor a extração automática.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ImagePlus className="h-3.5 w-3.5 text-muted-foreground" />
                  Flyer do Evento
                </label>
                <ImageUpload
                  folder="events"
                  currentUrl={manualImageUrl}
                  onUploaded={(u) => setManualImageUrl(u)}
                  label="Enviar flyer (opcional)"
                />
              </div>

              <button
                onClick={handleAnalyzeCaption}
                disabled={loading || !caption.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-40 shadow-lg shadow-primary/20"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Analisando...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Extrair Dados</>
                )}
              </button>
            </div>
          )}

          {/* ── URL mode (experimental) ── */}
          {mode === "url" && !preview && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-xl bg-yellow-500/5 border border-yellow-500/15 p-3">
                <FlaskConical className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Modo experimental. Alguns links do Instagram podem não ser suportados.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">URL do Post</label>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.instagram.com/p/..."
                  className="w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
                  disabled={loading}
                />
              </div>
              <button
                onClick={handleAnalyzeUrl}
                disabled={loading || !url.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-40 shadow-lg shadow-primary/20"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Analisando...</>
                ) : (
                  <><Link2 className="h-4 w-4" /> Analisar Post</>
                )}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive leading-relaxed">{error}</p>
            </div>
          )}

          {/* Debug panel (dev only) */}
          <ImportDebugPanel debug={debugInfo} />

          {/* ── Preview card ── */}
          {preview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground">
                  Dados Extraídos
                </p>
                {preview.confidence && confidenceBadge(preview.confidence)}
              </div>

              {preview.confidence === "low" && (
                <div className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-[11px] text-destructive leading-relaxed">
                    Confiança baixa na extração. Revise os dados com atenção antes de usar.
                  </p>
                </div>
              )}

              {/* Flyer preview */}
              {preview.image_url && (
                <div className="rounded-xl overflow-hidden border border-border/30 shadow-lg">
                  <img
                    src={preview.image_url}
                    alt="Flyer do evento"
                    className="w-full h-44 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}

              {/* Fields */}
              <div className="rounded-xl border border-border/20 bg-secondary/10 p-3 space-y-0.5">
                {fieldLabel("Título", preview.title)}
                {fieldLabel("Data", preview.date)}
                {fieldLabel("Horário", preview.time)}
                {fieldLabel("Local", preview.venue_name)}
                {fieldLabel("Categoria", preview.category)}
                {fieldLabel("Instagram", preview.instagram ? `@${preview.instagram}` : "")}
                {fieldLabel("Ingresso", preview.ticket_url)}
                {fieldLabel("Descrição", preview.description?.substring(0, 200) + ((preview.description?.length ?? 0) > 200 ? "…" : ""))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setPreview(null)}
                  className="flex-1 rounded-xl border border-border/50 px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-secondary/50 transition"
                >
                  Voltar
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition shadow-lg shadow-primary/20"
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
