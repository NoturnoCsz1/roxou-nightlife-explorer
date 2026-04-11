import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckSquare, ChevronDown, Copy, Download, Layers, Loader2, MousePointerClick, Plus, Search, Square, Star, StarOff, Trash2, X } from "lucide-react";
import { downloadEventsZip } from "@/lib/downloadEventsZip";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { getCategoryLabel } from "@/lib/categoryConfig";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface EventRow {
  id: string;
  title: string;
  slug: string;
  venue_name: string | null;
  date_time: string;
  category: string;
  sub_category: string | null;
  status: string;
  featured: boolean;
  image_url: string | null;
}

const EventosList = () => {
  const navigate = useNavigate();
  const { cityFilter } = useAdminProfile();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<EventRow | null>(null);
  const [pastOpen, setPastOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState({ current: 0, total: 0 });

  async function handleDuplicate(eventId: string) {
    const { data } = await supabase.from("events").select("*").eq("id", eventId).single();
    if (!data) { toast.error("Erro ao carregar evento"); return; }
    navigate("/admin/eventos/novo", {
      state: {
        duplicate: {
          title: data.title,
          description: data.description || "",
          category: data.category,
          venue_name: data.venue_name || "",
          address: data.address || "",
          instagram: data.instagram || "",
          image_url: data.image_url || "",
          partner_id: data.partner_id || "",
          ticket_url: (data as any).ticket_url || "",
          _sub: (data as any).sub_category || data.category,
        },
      },
    });
  }

  useEffect(() => {
    loadEvents();
    loadClickCounts();
  }, []);

  async function loadEvents() {
    setLoading(true);
    let query = supabase
      .from("events")
      .select("id, title, slug, venue_name, date_time, category, sub_category, status, featured, image_url")
      .order("date_time", { ascending: false });
    if (cityFilter) query = query.eq("city", cityFilter);
    const { data } = await query;
    setEvents(data || []);
    setLoading(false);
  }

  async function loadClickCounts() {
    const { data } = await supabase.from("ticket_clicks").select("event_id");
    if (!data) return;
    const counts: Record<string, number> = {};
    data.forEach((row) => {
      if (row.event_id) counts[row.event_id] = (counts[row.event_id] || 0) + 1;
    });
    setClickCounts(counts);
  }

  async function toggleFeatured(id: string, current: boolean) {
    await supabase.from("events").update({ featured: !current }).eq("id", id);
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, featured: !current } : e)));
    toast.success(!current ? "Marcado como destaque" : "Removido do destaque");
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from("events").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    if (error) {
      toast.error("Erro ao excluir evento. Tente novamente.");
    } else {
      toast.success("Evento excluído com sucesso.");
      loadEvents();
    }
  }

  const filtered = events
    .filter((e) => e.title.toLowerCase().includes(search.toLowerCase()))
    .filter((e) => !activeCategory || e.category === activeCategory)
    .filter((e) => !activeStatus || e.status === activeStatus);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const todayEvents = filtered.filter((e) => e.date_time.slice(0, 10) === todayStr);
  const upcomingEvents = filtered.filter((e) => e.date_time.slice(0, 10) > todayStr);
  const pastEvents = filtered.filter((e) => e.date_time.slice(0, 10) < todayStr);

  const CATEGORIES = ["balada", "show", "bar", "festival", "sertanejo", "funk", "eletronica", "festa"] as const;
  const categoryCounts = CATEGORIES.map((c) => ({
    key: c,
    label: c === "eletronica" ? "Eletrônica" : c.charAt(0).toUpperCase() + c.slice(1),
    count: events.filter((e) => e.category === c).length,
  }));

  const categoryBadge: Record<string, string> = {
    balada: "badge-balada",
    show: "badge-show",
    bar: "badge-bar",
    festival: "badge-festival",
    sertanejo: "badge-sertanejo",
    funk: "badge-funk",
    eletronica: "badge-eletronica",
    festa: "badge-balada",
  };

  const renderEventRow = (e: EventRow) => (
    <div key={e.id} className="flex items-center justify-between rounded-xl border border-border/40 bg-card p-3">
      <Link to={`/admin/eventos/${e.id}/editar`} className="min-w-0 flex-1">
        <span className="text-sm font-semibold text-foreground truncate block">{e.title}</span>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`${categoryBadge[e.category] || "bg-secondary"} rounded px-1.5 py-0.5 text-[9px] font-bold uppercase`}>
            {getCategoryLabel(e.category, e.sub_category)}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {new Date(e.date_time).toLocaleDateString("pt-BR")}
          </span>
          {e.venue_name && <span className="text-[10px] text-muted-foreground">• {e.venue_name}</span>}
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${e.status === "published" ? "text-green-400 bg-green-400/10" : "text-yellow-400 bg-yellow-400/10"}`}>
            {e.status === "published" ? "Publicado" : "Rascunho"}
          </span>
          {clickCounts[e.id] > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded text-primary bg-primary/10 flex items-center gap-0.5">
              <MousePointerClick className="h-2.5 w-2.5" />
              {clickCounts[e.id]}
            </span>
          )}
        </div>
      </Link>
      <div className="flex items-center shrink-0 ml-2 gap-0.5">
        <button
          onClick={() => handleDuplicate(e.id)}
          className="p-1.5 rounded-lg hover:bg-secondary/50 transition"
          title="Duplicar evento"
        >
          <Copy className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={() => toggleFeatured(e.id, e.featured)}
          className="p-1.5 rounded-lg hover:bg-secondary/50 transition"
          title={e.featured ? "Remover destaque" : "Destacar"}
        >
          {e.featured ? <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" /> : <StarOff className="h-4 w-4 text-muted-foreground" />}
        </button>
        <button
          onClick={() => setDeleteTarget(e)}
          className="p-1.5 rounded-lg hover:bg-red-500/10 transition"
          title="Excluir evento"
        >
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-400" />
        </button>
      </div>
    </div>
  );

  const renderSection = (title: string, items: EventRow[], emoji: string) => {
    if (items.length === 0) return null;
    return (
      <div>
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
          {emoji} {title} ({items.length})
        </h2>
        <div className="space-y-2">{items.map(renderEventRow)}</div>
      </div>
    );
  };

  return (
    <div className="space-y-4 md:ml-44">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Eventos</h1>
        <div className="flex items-center gap-1.5">
          <Link
            to="/admin/eventos/novo/lote"
            className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition"
          >
            <Layers className="h-3.5 w-3.5" /> Lote
          </Link>
          <Link
            to="/admin/eventos/novo"
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Novo
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-card px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar evento..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { key: null, label: "Todos", count: events.length },
          { key: "published", label: "Publicado", count: events.filter((e) => e.status === "published").length },
          { key: "draft", label: "Rascunho", count: events.filter((e) => e.status === "draft").length },
        ].map((s) => (
          <button
            key={s.key ?? "all"}
            onClick={() => setActiveStatus(activeStatus === s.key ? null : s.key)}
            className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition ${
              activeStatus === s.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            {s.label} <span className="ml-0.5 opacity-70">{s.count}</span>
          </button>
        ))}
        <span className="w-px h-4 bg-border/40 shrink-0 mx-0.5" />
        {categoryCounts.map((c) => (
          <button
            key={c.key}
            onClick={() => setActiveCategory(activeCategory === c.key ? null : c.key)}
            className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition ${
              activeCategory === c.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            {c.label} <span className="ml-0.5 opacity-70">{c.count}</span>
          </button>
        ))}
        {(search || activeCategory || activeStatus) && (
          <>
            <span className="w-px h-4 bg-border/40 shrink-0 mx-0.5" />
            <button
              onClick={() => { setSearch(""); setActiveCategory(null); setActiveStatus(null); }}
              className="shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
            >
              <X className="h-3 w-3" /> Limpar
            </button>
          </>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-8">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">Nenhum evento encontrado.</p>
      ) : (
        <div className="space-y-6">
          {renderSection("Hoje", todayEvents, "📌")}
          {renderSection("Próximos", upcomingEvents, "🔜")}

          {pastEvents.length > 0 && (
            <Collapsible open={pastOpen} onOpenChange={setPastOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full group">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  📂 Eventos Passados ({pastEvents.length})
                </h2>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${pastOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="space-y-2">{pastEvents.map(renderEventRow)}</div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>"{deleteTarget?.title}"</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventosList;
