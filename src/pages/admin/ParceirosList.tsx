import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, CheckCircle, Trash2, CalendarDays, Eye, ExternalLink, AlertTriangle, RefreshCw, Sparkles, Instagram } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
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

type Partner = Tables<"partners">;

interface PartnerMetrics {
  eventCount: number;
  viewCount: number;
  lastEventDate: string | null;
}

const ParceirosList = () => {
  const { cityFilter } = useAdminProfile();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [metrics, setMetrics] = useState<Record<string, PartnerMetrics>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null);
  const [hasLinkedEvents, setHasLinkedEvents] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive" | "dormant">("");
  const [syncingAll, setSyncingAll] = useState(false);

  async function handleSyncAll() {
    setSyncingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke("partner-instagram-sync", {
        body: { all: true, stale_hours: 24 },
      });
      if (error) throw error;
      const s = (data as any)?.summary;
      if (s) toast.success(`Sync: ${s.synced}/${s.total} ok • ${s.not_found} não encontrados • ${s.no_permission} sem permissão`);
      else toast.success("Sincronização concluída");
      loadPartners();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao sincronizar");
    } finally {
      setSyncingAll(false);
    }
  }

  useEffect(() => {
    loadPartners();
  }, []);

  async function loadPartners() {
    setLoading(true);
    let query = supabase
      .from("partners")
      .select("*")
      .order("created_at", { ascending: false });
    if (cityFilter) query = query.eq("city", cityFilter);
    const { data } = await query;
    const partnerList = data || [];
    setPartners(partnerList);

    // Load metrics in parallel
    if (partnerList.length > 0) {
      const ids = partnerList.map(p => p.id);

      const [eventsRes, viewsRes] = await Promise.all([
        supabase
          .from("events")
          .select("partner_id, date_time")
          .in("partner_id", ids),
        supabase
          .from("page_views")
          .select("partner_id")
          .in("partner_id", ids),
      ]);

      const m: Record<string, PartnerMetrics> = {};
      ids.forEach(id => { m[id] = { eventCount: 0, viewCount: 0, lastEventDate: null }; });

      (eventsRes.data || []).forEach(e => {
        if (!e.partner_id) return;
        m[e.partner_id].eventCount++;
        if (!m[e.partner_id].lastEventDate || e.date_time > m[e.partner_id].lastEventDate!) {
          m[e.partner_id].lastEventDate = e.date_time;
        }
      });

      (viewsRes.data || []).forEach(v => {
        if (!v.partner_id) return;
        m[v.partner_id].viewCount++;
      });

      setMetrics(m);
    }

    setLoading(false);
  }

  async function handleDeleteClick(partner: Partner) {
    const { count } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", partner.id);

    setHasLinkedEvents(!!(count && count > 0));
    setDeleteTarget(partner);
  }

  async function handleDelete() {
    if (!deleteTarget || hasLinkedEvents) return;
    const { error } = await supabase.from("partners").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    if (error) {
      toast.error("Erro ao excluir parceiro.");
    } else {
      toast.success("Parceiro excluído.");
      loadPartners();
    }
  }

  function getPartnerStatus(p: Partner): "active" | "inactive" | "dormant" {
    if (!p.active) return "inactive";
    const m = metrics[p.id];
    if (!m || !m.lastEventDate) return "dormant";
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (new Date(m.lastEventDate) < thirtyDaysAgo) return "dormant";
    return "active";
  }

  const filtered = partners.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.type || "").toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === "") return true;
    return getPartnerStatus(p) === statusFilter;
  });

  const dormantCount = partners.filter(p => getPartnerStatus(p) === "dormant").length;

  const statusFilters = [
    { label: "Todos", value: "" as const },
    { label: "Ativos", value: "active" as const },
    { label: "Inativos", value: "inactive" as const },
    { label: "Sem eventos", value: "dormant" as const },
  ];

  return (
    <div className="space-y-4 md:ml-44">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Parceiros</h1>
        <Link
          to="/admin/parceiros/novo"
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Novo
        </Link>
      </div>

      {/* Alert for dormant partners */}
      {!loading && dormantCount > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-3">
          <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-yellow-400">
              {dormantCount} parceiro{dormantCount > 1 ? "s" : ""} sem eventos nos últimos 30 dias
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Considere criar eventos ou verificar se ainda estão ativos.
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-card px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar parceiro..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Status filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {statusFilters.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
              statusFilter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-8">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">Nenhum parceiro encontrado.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const m = metrics[p.id] || { eventCount: 0, viewCount: 0, lastEventDate: null };
            const status = getPartnerStatus(p);

            return (
              <div
                key={p.id}
                className="rounded-xl border border-border/40 bg-card p-3 hover:border-primary/30 transition space-y-2"
              >
                {/* Top row: name + status */}
                <div className="flex items-center justify-between">
                  <Link to={`/admin/parceiros/${p.id}/editar`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground truncate">{p.name}</span>
                      {p.verified_partner && <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{p.type} • {p.city}</span>
                  </Link>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <StatusBadge status={status} />
                    <button
                      onClick={() => handleDeleteClick(p)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>

                {/* Metrics row */}
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {m.eventCount} evento{m.eventCount !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {m.viewCount} view{m.viewCount !== 1 ? "s" : ""}
                  </span>
                  {m.lastEventDate && (
                    <span className="text-muted-foreground/60">
                      Último: {new Date(m.lastEventDate).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-border/20">
                  <Link
                    to={`/admin/eventos/novo?partner_id=${p.id}`}
                    className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary hover:bg-primary/20 transition"
                  >
                    <Plus className="h-3 w-3" /> Criar evento
                  </Link>
                  <a
                    href={`/local/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg bg-secondary/50 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-secondary transition"
                  >
                    <ExternalLink className="h-3 w-3" /> Ver página
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hasLinkedEvents ? "Não é possível excluir" : "Excluir parceiro"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {hasLinkedEvents ? (
                <>Este parceiro possui eventos vinculados. Remova ou reatribua os eventos antes de excluí-lo.</>
              ) : (
                <>Tem certeza que deseja excluir <strong>"{deleteTarget?.name}"</strong>? Esta ação não pode ser desfeita.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {!hasLinkedEvents && (
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function StatusBadge({ status }: { status: "active" | "inactive" | "dormant" }) {
  const config = {
    active: { label: "Ativo", cls: "text-green-400 bg-green-400/10" },
    inactive: { label: "Inativo", cls: "text-destructive bg-destructive/10" },
    dormant: { label: "Sem eventos", cls: "text-yellow-400 bg-yellow-400/10" },
  };
  const c = config[status];
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${c.cls}`}>
      {c.label}
    </span>
  );
}

export default ParceirosList;
