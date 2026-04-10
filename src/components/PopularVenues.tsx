import { useEffect, useState, useMemo } from "react";
import { TrendingUp, Crown, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface PopularVenue {
  id: string;
  name: string;
  slug: string;
  type: string;
  logo_url: string | null;
  score: number;
}

type Period = "today" | "week" | "month";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Hoje",
  week: "Semana",
  month: "Mês",
};

function getPeriodStart(period: Period): string {
  const now = new Date();
  if (period === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  }
  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }
  const d = new Date(now);
  d.setDate(d.getDate() - 30);
  return d.toISOString();
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    bar: "Bar",
    balada: "Balada",
    restaurante: "Restaurante",
    casa_de_shows: "Casa de Shows",
    espaco_eventos: "Espaço de Eventos",
    pub: "Pub",
    lounge: "Lounge",
  };
  return map[type] || type;
}

const PopularVenues = () => {
  const [venues, setVenues] = useState<PopularVenue[]>([]);
  const [period, setPeriod] = useState<Period>("week");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: partners } = await supabase
        .from("partners")
        .select("id, name, slug, type, logo_url")
        .eq("active", true);

      if (!partners || partners.length === 0) {
        setVenues([]);
        setLoading(false);
        return;
      }

      const periodStart = getPeriodStart(period);

      const { data: views } = await supabase
        .from("page_views")
        .select("page_path")
        .gte("created_at", periodStart);

      const { data: events } = await supabase
        .from("events")
        .select("slug, partner_id")
        .eq("status", "published")
        .not("partner_id", "is", null);

      const partnerSlugMap = new Map(partners.map((p) => [p.slug, p.id]));
      const eventToPartner = new Map(
        (events || []).filter((e) => e.partner_id).map((e) => [e.slug, e.partner_id!])
      );

      const scoreMap: Record<string, number> = {};
      partners.forEach((p) => (scoreMap[p.id] = 0));

      (views || []).forEach((v) => {
        const path = v.page_path;
        const localMatch = path.match(/^\/local\/(.+)$/);
        if (localMatch) {
          const pid = partnerSlugMap.get(localMatch[1]);
          if (pid) scoreMap[pid] = (scoreMap[pid] || 0) + 1;
        }
        const eventMatch = path.match(/^\/evento\/(.+)$/);
        if (eventMatch) {
          const pid = eventToPartner.get(eventMatch[1]);
          if (pid && scoreMap[pid] !== undefined) scoreMap[pid] = (scoreMap[pid] || 0) + 1;
        }
      });

      const hasAnalytics = Object.values(scoreMap).some((v) => v > 0);

      if (!hasAnalytics) {
        const eventCountMap: Record<string, number> = {};
        (events || []).forEach((e) => {
          if (e.partner_id) eventCountMap[e.partner_id] = (eventCountMap[e.partner_id] || 0) + 1;
        });
        const ranked = partners
          .map((p) => ({ ...p, score: eventCountMap[p.id] || 0 }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
        setVenues(ranked);
        setLoading(false);
        return;
      }

      const ranked = partners
        .map((p) => ({ ...p, score: scoreMap[p.id] || 0 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      setVenues(ranked);
      setLoading(false);
    }
    load();
  }, [period]);

  if (!loading && venues.length === 0) return null;

  const maxScore = venues[0]?.score || 1;
  const top1 = venues[0];
  const rest = venues.slice(1);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black font-display text-foreground tracking-tight flex items-center gap-1.5">
            🔥 EM ALTA AGORA
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Os lugares mais acessados no Roxou
          </p>
        </div>
        {/* Period pills */}
        <div className="flex gap-1 bg-secondary/30 rounded-full p-0.5">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition ${
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-40 rounded-2xl bg-card animate-pulse" />
      ) : (
        <>
          {/* #1 — Featured card */}
          {top1 && (
            <button
              onClick={() => navigate(`/local/${top1.slug}`)}
              className="group relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-card to-card border border-primary/20 p-4 text-left transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_30px_hsl(var(--primary)/0.15)]"
            >
              {/* Glow effect */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center gap-3 relative z-10">
                {/* Avatar */}
                <div className="relative">
                  {top1.logo_url ? (
                    <img
                      src={top1.logo_url}
                      alt={top1.name}
                      className="h-16 w-16 rounded-xl object-cover border-2 border-primary/30"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border-2 border-primary/30">
                      <span className="text-xl font-black font-display text-primary">
                        {top1.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="absolute -top-1.5 -left-1.5 flex items-center justify-center h-6 w-6 rounded-full bg-primary shadow-lg">
                    <Crown className="h-3 w-3 text-primary-foreground" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Eye className="h-2.5 w-2.5" />
                      Mais visto
                    </span>
                  </div>
                  <h3 className="text-base font-black font-display text-foreground truncate group-hover:text-primary transition-colors">
                    {top1.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {typeLabel(top1.type)}
                  </p>
                </div>

                <div className="shrink-0 flex flex-col items-center">
                  <span className="text-2xl font-black font-display text-primary">#1</span>
                  <span className="text-[9px] text-muted-foreground">{top1.score} views</span>
                </div>
              </div>
            </button>
          )}

          {/* #2-5 — Compact list */}
          {rest.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {rest.map((v, i) => {
                const position = i + 2;
                const pct = Math.max((v.score / maxScore) * 100, 8);
                return (
                  <button
                    key={v.id}
                    onClick={() => navigate(`/local/${v.slug}`)}
                    className="group flex items-center gap-2.5 rounded-xl bg-card border border-border/30 p-3 text-left transition-all duration-200 hover:border-primary/30 hover:bg-card/80"
                  >
                    {/* Position + Avatar */}
                    <div className="relative shrink-0">
                      {v.logo_url ? (
                        <img
                          src={v.logo_url}
                          alt={v.name}
                          className="h-10 w-10 rounded-lg object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-secondary/60 flex items-center justify-center">
                          <span className="text-sm font-bold font-display text-muted-foreground">
                            {v.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="absolute -top-1 -left-1 h-4.5 w-4.5 flex items-center justify-center rounded-full bg-secondary text-[9px] font-black text-foreground border border-border/40"
                        style={{ height: "18px", width: "18px" }}
                      >
                        {position}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {v.name}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mb-1">
                        {typeLabel(v.type)}
                      </p>
                      <div className="w-full h-1 rounded-full bg-secondary/60 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PopularVenues;
