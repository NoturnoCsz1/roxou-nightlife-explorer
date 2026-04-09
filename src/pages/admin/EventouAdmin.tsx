import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Loader2, Plus, Eye, XCircle, Trash2, ExternalLink, RefreshCw, MapPin, Calendar } from "lucide-react";
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

interface EventouRow {
  id: string;
  eventou_url: string;
  external_id: string | null;
  title: string;
  description: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  date_time: string | null;
  image_url: string | null;
  partner_id: string | null;
  import_status: string;
  event_id: string | null;
  created_at: string;
  partner_name?: string;
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "text-yellow-400 bg-yellow-400/10" },
  approved: { label: "Aprovado", cls: "text-green-400 bg-green-400/10" },
  skipped: { label: "Ignorado", cls: "text-muted-foreground bg-secondary/50" },
  error: { label: "Erro", cls: "text-destructive bg-destructive/10" },
};

const EventouAdmin = () => {
  const navigate = useNavigate();
  const { cityFilter } = useAdminProfile();
  const [items, setItems] = useState<EventouRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EventouRow | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    const { data } = await supabase
      .from("eventou_imports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

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
      setItems(data.map(d => ({ ...d, partner_name: d.partner_id ? partnerMap[d.partner_id] : undefined })) as EventouRow[]);
    } else {
      setItems([]);
    }
    setLoading(false);
  }

  async function handleScan() {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("eventou-scraper", { body: {} });
      if (error) throw error;
      if (data?.success) {
        const s = data.stats;
        toast.success(`Scan concluído: ${s.newInserted} novos, ${s.duplicates} duplicados, ${s.errors} erros`);
      } else {
        toast.error("Erro no scan", { description: data?.error || "Falha" });
      }
    } catch (err: any) {
      toast.error("Erro ao executar scan", { description: err.message });
    } finally {
      setScanning(false);
      loadItems();
    }
  }

  function handleApprove(row: EventouRow) {
    const slug = (row.title || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);

    navigate("/admin/eventos/novo", {
      state: {
        duplicate: {
          title: row.title || "",
          description: row.description || "",
          category: "",
          venue_name: row.venue_name || "",
          address: "",
          instagram: "",
          image_url: row.image_url || "",
          partner_id: row.partner_id || "",
          date_time: row.date_time ? row.date_time.slice(0, 16) : "",
          verification_source: "Eventou",
          slug,
        },
        eventou_import_id: row.id,
      },
    });
  }

  async function handleSkip(row: EventouRow) {
    await supabase
      .from("eventou_imports")
      .update({ import_status: "skipped" })
      .eq("id", row.id);
    toast.success("Evento ignorado");
    loadItems();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from("eventou_imports").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    toast.success("Registro removido");
    loadItems();
  }

  const pending = items.filter(i => i.import_status === "pending");
  const others = items.filter(i => i.import_status !== "pending");

  return (
    <div className="space-y-4 md:ml-44">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Globe className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Eventou</h1>
            <p className="text-[10px] text-muted-foreground">Eventos importados automaticamente</p>
          </div>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
        >
          {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {scanning ? "Importando…" : "Importar agora"}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-card p-8 text-center">
          <Globe className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum evento importado ainda.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Clique em "Importar agora" para buscar eventos do Eventou.
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
                  <EventouCard
                    key={row.id}
                    row={row}
                    onApprove={() => handleApprove(row)}
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
                  <EventouCard
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

function EventouCard({
  row,
  onApprove,
  onSkip,
  onDelete,
}: {
  row: EventouRow;
  onApprove?: () => void;
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
            className="h-16 w-16 rounded-lg object-cover shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-foreground line-clamp-1">{row.title}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${status.cls}`}>
              {status.label}
            </span>
          </div>

          {row.venue_name && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-2.5 w-2.5 shrink-0" /> {row.venue_name}
            </p>
          )}

          {row.partner_name && (
            <p className="text-[10px] text-primary mt-0.5">Parceiro: {row.partner_name}</p>
          )}

          {row.description && (
            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {row.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1">
            {row.date_time && (
              <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
                <Calendar className="h-2.5 w-2.5" />
                {new Date(row.date_time).toLocaleDateString("pt-BR")} {new Date(row.date_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <a
              href={row.eventou_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-primary flex items-center gap-0.5 hover:underline"
            >
              <ExternalLink className="h-2.5 w-2.5" /> Ver original
            </a>
          </div>
        </div>
      </div>

      {row.import_status === "pending" && (onApprove || onSkip) && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-border/20">
          {onApprove && (
            <button
              onClick={onApprove}
              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition"
            >
              <Eye className="h-3 w-3" /> Aprovar
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

export default EventouAdmin;
