import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import EventCard from "@/components/EventCard";
import type { SupabaseEvent } from "@/components/EventCard";
import BottomNav from "@/components/BottomNav";
import DesktopNav from "@/components/DesktopNav";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";

const PER_PAGE = 12;

const LocalEventos = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [partnerName, setPartnerName] = useState("");
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [events, setEvents] = useState<SupabaseEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("partners")
      .select("id, name")
      .eq("slug", slug)
      .eq("active", true)
      .single()
      .then(({ data }) => {
        if (!data) {
          setLoading(false);
          return;
        }
        setPartnerName(data.name);
        setPartnerId(data.id);
      });
  }, [slug]);

  useEffect(() => {
    if (!partnerId) return;
    setLoading(true);
    const now = new Date().toISOString();
    const from = page * PER_PAGE;
    const to = from + PER_PAGE - 1;

    Promise.all([
      supabase
        .from("events")
        .select("id, title, slug, description, date_time, category, venue_name, address, instagram, image_url, featured, status, partner_id")
        .eq("status", "published")
        .eq("partner_id", partnerId)
        .lt("date_time", now)
        .order("date_time", { ascending: false })
        .range(from, to),
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .eq("partner_id", partnerId)
        .lt("date_time", now),
    ]).then(([{ data: evts }, { count }]) => {
      setEvents(evts || []);
      setTotal(count || 0);
      setLoading(false);
    });
  }, [partnerId, page]);

  const totalPages = Math.ceil(total / PER_PAGE);

  function goPage(p: number) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <SEO
        title={`Eventos realizados — ${partnerName || "Parceiro"}`}
        description={`Todos os eventos já realizados por ${partnerName || "este parceiro"}.`}
      />
      <DesktopNav />
      <header className="sticky top-0 z-40 glass border-b border-border/30 px-4 pt-4 pb-3 md:hidden">
        <div className="mx-auto max-w-lg flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-full bg-secondary p-2">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <h1 className="text-lg font-black font-display text-foreground truncate">
            Eventos realizados
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg md:max-w-4xl px-4 md:px-6 mt-5 md:mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">
            {partnerName ? `${partnerName} — Eventos já realizados (${total})` : "Carregando..."}
          </h2>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-8">Carregando...</p>
        ) : events.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Nenhum evento passado encontrado.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {events.map((e, i) => (
                <EventCard key={e.id} event={e} index={i} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  onClick={() => goPage(page - 1)}
                  disabled={page === 0}
                  className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-40 hover:bg-secondary/80 transition"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </button>
                <span className="text-xs text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => goPage(page + 1)}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-40 hover:bg-secondary/80 transition"
                >
                  Próxima
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
};

export default LocalEventos;
