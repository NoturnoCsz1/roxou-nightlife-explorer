import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Loader2, X, Sparkles, Instagram } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ImageUpload from "@/components/admin/ImageUpload";

interface AuraCreateEventModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AuraCreateEventModal({ open, onClose }: AuraCreateEventModalProps) {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleOrganize() {
    if (text.trim().length < 10) {
      toast.error("Cole pelo menos algumas linhas com info do evento.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("aura-organize-event", {
        body: { text, instagram_url: instagramUrl || undefined, image_url: imageUrl || undefined },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const a = data as any;
      const dt = a.date_iso && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(a.date_iso) ? a.date_iso.slice(0, 16) : "";
      const auraPhrase = (a.aura_phrase || "").trim();
      const richDesc = [a.description, auraPhrase ? `\n\n💜 Aura: ${auraPhrase}` : ""].join("");

      const duplicate = {
        title: a.title || "",
        description: richDesc,
        date_time: dt,
        venue_name: a.venue_name || "",
        address: a.address || "",
        instagram: a.instagram || instagramUrl || "",
        category: a.category || "festa",
        sub_category: a.sub_category || "",
        image_url: imageUrl || "",
        verification_source: a.verification_source || "Instagram",
        opportunity_tags: Array.isArray(a.opportunity_tags) ? a.opportunity_tags : [],
        ticket_url: "",
        partner_id: "",
        status: "draft",
        featured: false,
      };

      toast.success("Aura organizou o evento. Revise os campos antes de salvar.");
      onClose();
      navigate("/admin/eventos/novo", { state: { duplicate } });
    } catch (err: any) {
      toast.error(err?.message || "Falha ao organizar com a Aura");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    setText("");
    setInstagramUrl("");
    setImageUrl("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={handleClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-primary/30 bg-card shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_0_40px_hsl(var(--primary)/0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border/40 bg-card/95 backdrop-blur-xl px-5 py-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="shrink-0 rounded-xl bg-primary/15 border border-primary/40 p-2">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-foreground">Criar evento com Aura</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cole as informações do evento e a Aura organiza tudo para você.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Texto do evento *
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Cole aqui o texto do flyer, legenda do Instagram ou informações do evento..."
              rows={8}
              className="mt-1 w-full rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/40 resize-y"
              disabled={loading}
            />
            <p className="text-[10px] text-muted-foreground mt-1">{text.length} caracteres</p>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Instagram className="h-3 w-3" /> Link do Instagram (opcional)
            </label>
            <input
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/p/... ou @perfildoevento"
              className="mt-1 w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary/60"
              disabled={loading}
            />
          </div>

          <div>
            <ImageUpload
              folder="events"
              currentUrl={imageUrl}
              onUploaded={(url) => setImageUrl(url)}
              label="Flyer / imagem do evento (opcional)"
            />
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border/40 bg-card/95 backdrop-blur-xl px-5 py-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="rounded-xl border border-border/60 bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground hover:bg-secondary/80 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleOrganize}
            disabled={loading || text.trim().length < 10}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_0_18px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.6),0_0_28px_hsl(var(--primary)/0.6)] disabled:opacity-50 disabled:shadow-none"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {loading ? "Aura organizando..." : "Organizar com Aura"}
          </button>
        </div>
      </div>
    </div>
  );
}
