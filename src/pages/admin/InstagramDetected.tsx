import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Instagram, Loader2, CheckCircle, XCircle, Clock, ExternalLink, Trash2, Eye, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

interface ImportRow {
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

const statusConfig: Record<string, { label: string; icon: typeof Clock; cls: string }> = {
  pending: { label: "Pendente", icon: Clock, cls: "text-yellow-400 bg-yellow-400/10" },
  imported: { label: "Importado", icon: CheckCircle, cls: "text-green-400 bg-green-400/10" },
  skipped: { label: "Ignorado", icon: XCircle, cls: "text-muted-foreground bg-secondary/50" },
  error: { label: "Erro", icon: XCircle, cls: "text-destructive bg-destructive/10" },
};

const InstagramDetected = () => {
  const navigate = useNavigate();
  const [imports, setImports] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ImportRow | null>(null);

  async function handleScanNow() {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-scraper", { body: {} });
      if (error) throw error;
      if (data?.success) {
        const s = data.stats;
        toast.success(`Scan concluído`, {
          description: `Parceiros: ${s.partnersProcessed} · Posts: ${s.postsFound} · Novos: ${s.newInserted} · Erros: ${s.errors}`,
        });
      } else {
        toast.error("Erro no scan", { description: data?.error || "Falha desconhecida" });
      }
    } catch (err: any) {
      toast.error("Erro ao executar scan", { description: err.message || "Falha na requisição" });
    } finally {
      setScanning(false);
      loadImports();
    }
  }

  useEffect(() => {
    loadImports();
  }, []);

  async function loadImports() {
    setLoading(true);
    const { data } = await supabase
      .from("instagram_imports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      // Fetch partner names
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
      setImports(data.map(d => ({ ...d, partner_name: d.partner_id ? partnerMap[d.partner_id] : undefined })));
    } else {
      setImports([]);
    }
    setLoading(false);
  }

  async function handleCreateDraft(row: ImportRow) {
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

  async function handleSkip(row: ImportRow) {
    await supabase
      .from("instagram_imports")
      .update({ import_status: "skipped" })
      .eq("id", row.id);
    toast.success("Post marcado como ignorado");
    loadImports();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from("instagram_imports").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    toast.success("Registro removido");
    loadImports();
  }

  const pending = imports.filter(i => i.import_status === "pending");
  const others = imports.filter(i => i.import_status !== "pending");

  return (
    <div className="space-y-4 md:ml-44">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Instagram className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Eventos Detectados</h1>
            <p className="text-[10px] text-muted-foreground">Posts do Instagram dos parceiros</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : imports.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-card p-8 text-center">
          <Instagram className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum post detectado ainda.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Posts dos parceiros aparecerão aqui quando detectados.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending section */}
          {pending.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                ⏳ Pendentes ({pending.length})
              </h2>
              <div className="space-y-2">
                {pending.map(row => (
                  <ImportCard
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

          {/* Other statuses */}
          {others.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                📋 Histórico ({others.length})
              </h2>
              <div className="space-y-2">
                {others.map(row => (
                  <ImportCard
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
            <AlertDialogTitle>Remover registro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este registro de importação?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function ImportCard({
  row,
  onCreateDraft,
  onSkip,
  onDelete,
}: {
  row: ImportRow;
  onCreateDraft?: () => void;
  onSkip?: () => void;
  onDelete?: () => void;
}) {
  const status = statusConfig[row.import_status] || statusConfig.pending;
  const StatusIcon = status.icon;

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
            <span className="text-xs font-bold text-foreground">@{row.instagram_handle}</span>
            {row.partner_name && (
              <span className="text-[10px] text-muted-foreground">• {row.partner_name}</span>
            )}
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-0.5 ${status.cls}`}>
              <StatusIcon className="h-2.5 w-2.5" />
              {status.label}
            </span>
            {row.confidence && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                row.confidence === "high" ? "text-green-400 bg-green-400/10" :
                row.confidence === "medium" ? "text-yellow-400 bg-yellow-400/10" :
                "text-destructive bg-destructive/10"
              }`}>
                {row.confidence === "high" ? "Alta" : row.confidence === "medium" ? "Média" : "Baixa"}
              </span>
            )}
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

      {/* Actions for pending items */}
      {row.import_status === "pending" && (onCreateDraft || onSkip) && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-border/20">
          {onCreateDraft && (
            <button
              onClick={onCreateDraft}
              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition"
            >
              <Eye className="h-3 w-3" /> Criar rascunho
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

export default InstagramDetected;
