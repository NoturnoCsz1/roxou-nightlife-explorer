import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Star, StarOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  const filtered = events.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

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
        <div className="space-y-2">
          {filtered.map((e) => (
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
              <button
                onClick={() => toggleFeatured(e.id, e.featured)}
                className="shrink-0 ml-2 p-1.5 rounded-lg hover:bg-secondary/50 transition"
                title={e.featured ? "Remover destaque" : "Destacar"}
              >
                {e.featured ? <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" /> : <StarOff className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventosList;
