import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, Copy, Plus, Search, Star, StarOff, Trash2 } from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface EventRow {
  id: string;
  title: string;
  venue_name: string | null;
  date_time: string;
  category: string;
  status: string;
  featured: boolean;
}

const EventosList = () => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<EventRow | null>(null);
  const [pastOpen, setPastOpen] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setLoading(true);
    const { data } = await supabase
      .from("events")
      .select("id, title, venue_name, date_time, category, status, featured")
      .order("date_time", { ascending: false });
    setEvents(data || []);
    setLoading(false);
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

  const filtered = events.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const todayEvents = filtered.filter((e) => e.date_time.slice(0, 10) === todayStr);
  const upcomingEvents = filtered.filter((e) => e.date_time.slice(0, 10) > todayStr);
  const pastEvents = filtered.filter((e) => e.date_time.slice(0, 10) < todayStr);

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
            {e.category}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {new Date(e.date_time).toLocaleDateString("pt-BR")}
          </span>
          {e.venue_name && <span className="text-[10px] text-muted-foreground">• {e.venue_name}</span>}
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${e.status === "published" ? "text-green-400 bg-green-400/10" : "text-yellow-400 bg-yellow-400/10"}`}>
            {e.status === "published" ? "Publicado" : "Rascunho"}
          </span>
        </div>
      </Link>
      <div className="flex items-center shrink-0 ml-2 gap-0.5">
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
        <Link
          to="/admin/eventos/novo"
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Novo
        </Link>
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
