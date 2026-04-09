import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Loader2, Plus, Eye, XCircle, Trash2, ExternalLink, RefreshCw, MapPin, Calendar, Copy, Instagram, Star, AlertTriangle, CheckCircle2, Ban } from "lucide-react";
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
  priority_score?: number;
  priority_tier?: "high" | "normal" | "low";
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "text-yellow-400 bg-yellow-400/10" },
  auto_ready: { label: "Pronto", cls: "text-primary bg-primary/10" },
  approved: { label: "Aprovado", cls: "text-green-400 bg-green-400/10" },
  skipped: { label: "Ignorado", cls: "text-muted-foreground bg-secondary/50" },
  error: { label: "Erro", cls: "text-destructive bg-destructive/10" },
};

const tierConfig: Record<string, { label: string; cls: string; emoji: string }> = {
  high: { label: "Alta", cls: "text-primary bg-primary/10", emoji: "🔥" },
  normal: { label: "Normal", cls: "text-muted-foreground bg-secondary/50", emoji: "📋" },
  low: { label: "Baixa", cls: "text-destructive/70 bg-destructive/5", emoji: "⚠️" },
};

/* ── Priority scoring (frontend-only, no DB changes) ── */
function calcPriority(row: EventouRow): { score: number; tier: "high" | "normal" | "low" } {
  let score = 0;
  if (row.image_url) score += 2;
  if (row.date_time) {
    score += 2;
    const diff = new Date(row.date_time).getTime() - Date.now();
    if (diff > 0 && diff < 7 * 86400000) score += 1; // within 7 days
  }
  if (row.partner_id) score += 2;
  if (row.description && row.description.length > 30) score += 1;
  if (row.venue_name) score += 1;
  if (row.city) score += 1;

  const tier = score >= 7 ? "high" : score >= 4 ? "normal" : "low";
  return { score, tier };
}

function generateCaption(row: EventouRow): string {
  const br = "\n";
  const date = row.date_time
    ? new Date(row.date_time).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
    : "";
  const time = row.date_time
    ? new Date(row.date_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "";

  return [
    `🎉 ${row.title}`,
    "",
    date && `📅 ${date}${time ? ` às ${time}` : ""}`,
    row.venue_name && `📍 ${row.venue_name}`,
    row.city && `🏙️ ${row.city}`,
    "",
    row.description ? row.description.slice(0, 200) + (row.description.length > 200 ? "…" : "") : "",
    "",
    "Veja mais no Roxou! Link na bio 🔗",
    "",
    "#roxou #eventos #presidenteprudente",
  ]
    .filter(Boolean)
    .join(br);
}

interface ScanStats {
  pagesScraped: number;
  eventsFound: number;
  newInserted: number;
  duplicates: number;
  errors: number;
  urlsDiscovered: number;
  skippedNonCity: number;
  timeMs: number;
  phase: string;
}

const EventouAdmin = () => {
  const navigate = useNavigate();
  const { cityFilter } = useAdminProfile();
  const [items, setItems] = useState<EventouRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EventouRow | null>(null);
  const [captionPreview, setCaptionPreview] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [lastScan, setLastScan] = useState<ScanStats | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    const { data } = await supabase
      .from("eventou_imports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (data && data.length > 0) {
      const partnerIds = [...new Set(data.filter((d) => d.partner_id).map((d) => d.partner_id!))];
      let partnerMap: Record<string, string> = {};
      if (partnerIds.length > 0) {
        const { data: partners } = await supabase.from("partners").select("id, name").in("id", partnerIds);
        if (partners) partnerMap = Object.fromEntries(partners.map((p) => [p.id, p.name]));
      }
      setItems(
        data.map((d) => {
          const { score, tier } = calcPriority(d as EventouRow);
          const isAutoReady = score >= 6 && d.partner_id && d.import_status === "pending";
          return {
            ...d,
            partner_name: d.partner_id ? partnerMap[d.partner_id] : undefined,
            priority_score: score,
            priority_tier: tier,
            import_status: isAutoReady ? "auto_ready" : d.import_status,
          } as EventouRow;
        })
      );
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
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
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

  function handleCreatePartner(row: EventouRow) {
    navigate("/admin/parceiros/novo", {
      state: {
        prefill: {
          name: row.venue_name || "",
          city: row.city || "Presidente Prudente",
        },
      },
    });
  }

  async function handleSkip(row: EventouRow) {
    await supabase.from("eventou_imports").update({ import_status: "skipped" }).eq("id", row.id);
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

  function handleCopyCaption(row: EventouRow) {
    const text = generateCaption(row);
    navigator.clipboard.writeText(text);
    toast.success("Legenda copiada!");
  }

  function handlePreviewCaption(row: EventouRow) {
    setCaptionPreview(generateCaption(row));
  }

  // Stats
  const stats = {
    total: items.length,
    pending: items.filter((i) => i.import_status === "pending").length,
    autoReady: items.filter((i) => i.import_status === "auto_ready").length,
    approved: items.filter((i) => i.import_status === "approved").length,
    skipped: items.filter((i) => i.import_status === "skipped").length,
    error: items.filter((i) => i.import_status === "error").length,
    high: items.filter((i) => i.priority_tier === "high").length,
  };

  // Group by tier for pending/auto_ready
  const actionable = items.filter((i) => i.import_status === "pending" || i.import_status === "auto_ready");
  const highPriority = actionable.filter((i) => i.priority_tier === "high");
  const normalPriority = actionable.filter((i) => i.priority_tier === "normal");
  const lowPriority = actionable.filter((i) => i.priority_tier === "low");

  const history = items.filter((i) => i.import_status !== "pending" && i.import_status !== "auto_ready");
  const filteredHistory = statusFilter === "all" ? history : history.filter((i) => i.import_status === statusFilter);

  return (
    <div className="space-y-4 md:ml-44">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Globe className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Eventou</h1>
            <p className="text-[10px] text-muted-foreground">Importação automática com priorização</p>
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

      {/* Stats bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: "Novos", value: stats.pending, icon: AlertTriangle, cls: "text-yellow-400" },
          { label: "Prontos", value: stats.autoReady, icon: CheckCircle2, cls: "text-primary" },
          { label: "Alta Prior.", value: stats.high, icon: Star, cls: "text-primary" },
          { label: "Aprovados", value: stats.approved, icon: Eye, cls: "text-green-400" },
          { label: "Ignorados", value: stats.skipped, icon: Ban, cls: "text-muted-foreground" },
          { label: "Erros", value: stats.error, icon: XCircle, cls: "text-destructive" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border/30 bg-card p-2.5 text-center">
            <s.icon className={`h-3.5 w-3.5 mx-auto mb-1 ${s.cls}`} />
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[9px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Caption preview modal */}
      {captionPreview && (
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Instagram className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Preview da Legenda</h3>
            </div>
            <button onClick={() => setCaptionPreview(null)} className="text-xs text-muted-foreground hover:text-foreground">
              ✕
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-xs text-foreground bg-card rounded-lg p-3 border border-border/30 font-sans leading-relaxed">
            {captionPreview}
          </pre>
          <button
            onClick={() => {
              navigator.clipboard.writeText(captionPreview);
              toast.success("Legenda copiada!");
            }}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            <Copy className="h-3.5 w-3.5" /> COPIAR
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-card p-8 text-center">
          <Globe className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum evento importado ainda.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Importar agora" para buscar eventos do Eventou.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Priority groups */}
          {[
            { items: highPriority, tier: "high" as const },
            { items: normalPriority, tier: "normal" as const },
            { items: lowPriority, tier: "low" as const },
          ]
            .filter((g) => g.items.length > 0)
            .map((group) => {
              const tc = tierConfig[group.tier];
              return (
                <div key={group.tier}>
                  <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                    {tc.emoji} Prioridade {tc.label} ({group.items.length})
                  </h2>
                  <div className="space-y-2">
                    {group.items.map((row) => (
                      <EventouCard
                        key={row.id}
                        row={row}
                        onApprove={() => handleApprove(row)}
                        onSkip={() => handleSkip(row)}
                        onDelete={() => setDeleteTarget(row)}
                        onGeneratePost={() => handlePreviewCaption(row)}
                        onCopyCaption={() => handleCopyCaption(row)}
                        onCreatePartner={!row.partner_id && row.venue_name ? () => handleCreatePartner(row) : undefined}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

          {/* History */}
          {history.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  📋 Histórico ({history.length})
                </h2>
                <div className="flex gap-1">
                  {["all", "approved", "skipped", "error"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`text-[9px] px-2 py-0.5 rounded-full font-medium transition ${
                        statusFilter === f ? "bg-primary/20 text-primary" : "bg-secondary/30 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f === "all" ? "Todos" : statusConfig[f]?.label || f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {filteredHistory.map((row) => (
                  <EventouCard key={row.id} row={row} onDelete={() => setDeleteTarget(row)} />
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
            <AlertDialogDescription>Tem certeza que deseja remover este registro de importação?</AlertDialogDescription>
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
  onGeneratePost,
  onCopyCaption,
  onCreatePartner,
}: {
  row: EventouRow;
  onApprove?: () => void;
  onSkip?: () => void;
  onDelete?: () => void;
  onGeneratePost?: () => void;
  onCopyCaption?: () => void;
  onCreatePartner?: () => void;
}) {
  const status = statusConfig[row.import_status] || statusConfig.pending;
  const tier = row.priority_tier ? tierConfig[row.priority_tier] : null;
  const isActionable = row.import_status === "pending" || row.import_status === "auto_ready";

  return (
    <div
      className={`rounded-xl border bg-card p-3 space-y-2 ${
        row.import_status === "auto_ready" ? "border-primary/40" : "border-border/40"
      }`}
    >
      <div className="flex items-start gap-3">
        {row.image_url && (
          <img
            src={row.image_url}
            alt=""
            className="h-16 w-16 rounded-lg object-cover shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-foreground line-clamp-1">{row.title}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${status.cls}`}>{status.label}</span>
            {tier && (
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${tier.cls}`}>
                {tier.emoji} {row.priority_score}pts
              </span>
            )}
          </div>

          {row.venue_name && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-2.5 w-2.5 shrink-0" /> {row.venue_name}
              {!row.partner_id && onCreatePartner && (
                <button
                  onClick={onCreatePartner}
                  className="text-[9px] text-primary ml-1 flex items-center gap-0.5 hover:underline"
                >
                  <Plus className="h-2.5 w-2.5" /> Criar parceiro
                </button>
              )}
            </p>
          )}

          {row.partner_name && <p className="text-[10px] text-primary mt-0.5">Parceiro: {row.partner_name}</p>}

          {row.description && (
            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{row.description}</p>
          )}

          <div className="flex items-center gap-2 mt-1">
            {row.date_time && (
              <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
                <Calendar className="h-2.5 w-2.5" />
                {new Date(row.date_time).toLocaleDateString("pt-BR")}{" "}
                {new Date(row.date_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
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

      {isActionable && (
        <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/20 flex-wrap">
          {onApprove && (
            <button
              onClick={onApprove}
              className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition"
            >
              <Eye className="h-3 w-3" /> Aprovar
            </button>
          )}
          {onGeneratePost && (
            <button
              onClick={onGeneratePost}
              className="flex items-center gap-1 rounded-lg bg-accent/15 px-2.5 py-1.5 text-[11px] font-semibold text-accent hover:bg-accent/25 transition"
            >
              <Instagram className="h-3 w-3" /> Gerar Post
            </button>
          )}
          {onCopyCaption && (
            <button
              onClick={onCopyCaption}
              className="flex items-center gap-1 rounded-lg bg-secondary/50 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition"
            >
              <Copy className="h-3 w-3" /> Copiar Copy
            </button>
          )}
          {onSkip && (
            <button
              onClick={onSkip}
              className="flex items-center gap-1 rounded-lg bg-secondary/30 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition"
            >
              <XCircle className="h-3 w-3" /> Ignorar
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="flex items-center rounded-lg px-1.5 py-1.5 hover:bg-destructive/10 transition ml-auto">
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          )}
        </div>
      )}

      {!isActionable && onDelete && (
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
