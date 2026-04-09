import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lightbulb, Loader2, Plus, Eye, XCircle, Trash2, ExternalLink, Link as LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SuggestionRow {
  id: string;
  partner_id: string | null;
  instagram_handle: string;
  post_url: string;
  caption: string | null;
  image_url: string | null;
  import_status: string;
  event_id: string | null;
  confidence: string | null;
  error_detail: string | null;
  created_at: string;
  partner_name?: string;
}

/* ── helpers ── */

function extractInstagramHandle(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[0] || "";
  } catch {
    return "";
  }
}

function isValidInstagramUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.includes("instagram.com") && u.pathname.length > 1;
  } catch {
    return false;
  }
}

/* ── component ── */

const Sugestoes = () => {
  const navigate = useNavigate();
  const { cityFilter } = useAdminProfile();

  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<SuggestionRow | null>(null);

  // new suggestion form
  const [newUrl, setNewUrl] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, []);

  async function loadSuggestions() {
    setLoading(true);
    let query = supabase
      .from("instagram_imports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (cityFilter) {
      const { data: cityPartners } = await supabase
        .from("partners")
        .select("id")
        .eq("city", cityFilter);
      const ids = (cityPartners || []).map(p => p.id);
      if (ids.length > 0) {
        query = query.in("partner_id", ids);
      } else {
        setSuggestions([]);
        setLoading(false);
        return;
      }
    }

    const { data } = await query;

    if (data && data.length > 0) {
      const partnerIds = [...new Set(data.filter(d => d.partner_id).map(d => d.partner_id!))];
      let partnerMap: Record<string, string> = {};
      if (partnerIds.length > 0) {
        const { data: partners } = await supabase
          .from("partners")
          .select("id, name")
          .in("id", partnerIds);
        if (partners) {
          partnerMap = Object.fromEntries(partners.map(p => [p.id, p.name]));
        }
      }
      setSuggestions(data.map(d => ({ ...d, partner_name: d.partner_id ? partnerMap[d.partner_id] : undefined })));
    } else {
      setSuggestions([]);
    }
    setLoading(false);
  }

  async function handleAddSuggestion() {
    if (!newUrl.trim()) {
      toast.error("Cole o link do post do Instagram");
      return;
    }
    if (!isValidInstagramUrl(newUrl.trim())) {
      toast.error("Link inválido. Use um link do Instagram (ex: https://www.instagram.com/p/...)");
      return;
    }

    setSaving(true);
    const handle = extractInstagramHandle(newUrl.trim());

    // Try to match a partner by instagram handle
    let partnerId: string | null = null;
    if (handle) {
      const { data: matchedPartners } = await supabase
        .from("partners")
        .select("id")
        .ilike("instagram", `%${handle}%`)
        .limit(1);
      if (matchedPartners && matchedPartners.length > 0) {
        partnerId = matchedPartners[0].id;
      }
    }

    const { error } = await supabase.from("instagram_imports").insert({
      post_url: newUrl.trim(),
      instagram_handle: handle || "manual",
      caption: newCaption.trim() || null,
      import_status: "pending",
      partner_id: partnerId,
    });

    if (error) {
      toast.error("Erro ao salvar sugestão", { description: error.message });
    } else {
      toast.success("Sugestão adicionada!");
      setNewUrl("");
      setNewCaption("");
      setShowForm(false);
      loadSuggestions();
    }
    setSaving(false);
  }

  function handleCreateDraft(row: SuggestionRow) {
    navigate("/admin/eventos/novo", {
      state: {
        duplicate: {
          title: "",
          description: row.caption || "",
          category: "",
          venue_name: "",
          address: "",
          instagram: row.instagram_handle || "",
          image_url: row.image_url || "",
          partner_id: row.partner_id || "",
        },
        instagram_import_id: row.id,
      },
    });
  }

  async function handleSkip(row: SuggestionRow) {
    await supabase
      .from("instagram_imports")
      .update({ import_status: "skipped" })
      .eq("id", row.id);
    toast.success("Sugestão ignorada");
    loadSuggestions();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from("instagram_imports").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    toast.success("Registro removido");
    loadSuggestions();
  }

  const pending = suggestions.filter(i => i.import_status === "pending");
  const others = suggestions.filter(i => i.import_status !== "pending");

  return (
    <div className="space-y-4 md:ml-44">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Lightbulb className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Sugestões de Eventos</h1>
            <p className="text-[10px] text-muted-foreground">Cole links do Instagram para criar eventos rapidamente</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition"
        >
          <Plus className="h-3.5 w-3.5" />
          Nova sugestão
        </button>
      </div>

      {/* Add suggestion form */}
      {showForm && (
        <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Link do post (Instagram)</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="url"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="https://www.instagram.com/p/..."
                  className="w-full rounded-lg border border-border/60 bg-background pl-8 pr-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Observação (opcional)</label>
            <textarea
              value={newCaption}
              onChange={e => setNewCaption(e.target.value)}
              placeholder="Ex: Show de MPB no sábado, verificar horário..."
              rows={2}
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddSuggestion}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Salvar sugestão
            </button>
            <button
              onClick={() => { setShowForm(false); setNewUrl(""); setNewCaption(""); }}
              className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-secondary/50 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : suggestions.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-card p-8 text-center">
          <Lightbulb className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma sugestão ainda.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Cole links de posts do Instagram para começar a curadoria.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                ⏳ Pendentes ({pending.length})
              </h2>
              <div className="space-y-2">
                {pending.map(row => (
                  <SuggestionCard
                    key={row.id}
                    row={row}
                    onCreateDraft={() => handleCreateDraft(row)}
                    onSkip={() => handleSkip(row)}
                    onDelete={() => setDeleteTarget(row)}
                  />
                ))}
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                📋 Histórico ({others.length})
              </h2>
              <div className="space-y-2">
                {others.map(row => (
                  <SuggestionCard
                    key={row.id}
                    row={row}
                    onDelete={() => setDeleteTarget(row)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover sugestão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta sugestão?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* ── Card ── */

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "text-yellow-400 bg-yellow-400/10" },
  imported: { label: "Criado", cls: "text-green-400 bg-green-400/10" },
  skipped: { label: "Ignorado", cls: "text-muted-foreground bg-secondary/50" },
  error: { label: "Erro", cls: "text-destructive bg-destructive/10" },
};

function SuggestionCard({
  row,
  onCreateDraft,
  onSkip,
  onDelete,
}: {
  row: SuggestionRow;
  onCreateDraft?: () => void;
  onSkip?: () => void;
  onDelete?: () => void;
}) {
  const status = statusConfig[row.import_status] || statusConfig.pending;

  return (
    <div className="rounded-xl border border-border/40 bg-card p-3 space-y-2">
      <div className="flex items-start gap-3">
        {row.image_url && (
          <img
            src={row.image_url}
            alt=""
            className="h-14 w-14 rounded-lg object-cover shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {row.instagram_handle && row.instagram_handle !== "manual" && (
              <span className="text-xs font-bold text-foreground">@{row.instagram_handle}</span>
            )}
            {row.partner_name && (
              <span className="text-[10px] text-muted-foreground">• {row.partner_name}</span>
            )}
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${status.cls}`}>
              {status.label}
            </span>
          </div>
          {row.caption && (
            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {row.caption}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground/60">
              {new Date(row.created_at).toLocaleDateString("pt-BR")} {new Date(row.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <a
              href={row.post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-primary flex items-center gap-0.5 hover:underline"
            >
              <ExternalLink className="h-2.5 w-2.5" /> Ver post
            </a>
          </div>
        </div>
      </div>

      {row.import_status === "pending" && (onCreateDraft || onSkip) && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-border/20">
          {onCreateDraft && (
            <button
              onClick={onCreateDraft}
              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition"
            >
              <Eye className="h-3 w-3" /> Criar evento
            </button>
          )}
          {onSkip && (
            <button
              onClick={onSkip}
              className="flex items-center justify-center gap-1 rounded-lg bg-secondary/50 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-secondary transition"
            >
              <XCircle className="h-3 w-3" /> Ignorar
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex items-center justify-center rounded-lg px-2 py-1.5 hover:bg-destructive/10 transition"
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          )}
        </div>
      )}

      {row.import_status !== "pending" && onDelete && (
        <div className="flex justify-end pt-1 border-t border-border/20">
          <button
            onClick={onDelete}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
          >
            <Trash2 className="h-3 w-3" /> Remover
          </button>
        </div>
      )}
    </div>
  );
}

export default Sugestoes;
