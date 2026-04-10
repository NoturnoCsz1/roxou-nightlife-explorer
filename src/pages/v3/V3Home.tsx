import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import HeroCard from "@/components/v3/HeroCard";
import ContentRail from "@/components/v3/ContentRail";
import EventCardV3 from "@/components/v3/EventCardV3";
import CategoryChips from "@/components/v3/CategoryChips";
import { Car, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { isAfter, startOfDay, addDays } from "date-fns";

export default function V3Home() {
  const [categoryFilter, setCategoryFilter] = useState("");
  const now = new Date();
  const today = startOfDay(now);

  const { data: events = [] } = useQuery({
    queryKey: ["v3-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("status", "published")
        .gte("date_time", today.toISOString())
        .order("date_time", { ascending: true })
        .limit(50);
      return data || [];
    },
  });

  const featured = useMemo(() => events.filter((e) => e.featured), [events]);
  const hero = featured[0];

  const todayEvents = useMemo(
    () => events.filter((e) => isAfter(new Date(e.date_time), today) && isAfter(addDays(today, 1), new Date(e.date_time))),
    [events, today]
  );

  const weekEvents = useMemo(
    () => events.filter((e) => isAfter(new Date(e.date_time), today) && isAfter(addDays(today, 7), new Date(e.date_time))),
    [events, today]
  );

  const filtered = useMemo(
    () => (categoryFilter ? events.filter((e) => e.category === categoryFilter) : events),
    [events, categoryFilter]
  );

  return (
    <div className="space-y-2">
      {/* Hero */}
      {hero && (
        <div className="pt-4">
          <HeroCard
            slug={hero.slug}
            title={hero.title}
            imageUrl={hero.image_url}
            dateTime={hero.date_time}
            venueName={hero.venue_name}
            category={hero.category}
          />
        </div>
      )}

      {/* Categories */}
      <CategoryChips selected={categoryFilter} onSelect={setCategoryFilter} />

      {/* Today */}
      {todayEvents.length > 0 && (
        <ContentRail title="🔥 Hoje" subtitle="Rolando agora e hoje à noite">
          {todayEvents.map((e) => (
            <EventCardV3
              key={e.id}
              slug={e.slug}
              title={e.title}
              imageUrl={e.image_url}
              dateTime={e.date_time}
              venueName={e.venue_name}
              category={e.category}
            />
          ))}
        </ContentRail>
      )}

      {/* This Week */}
      {weekEvents.length > 0 && (
        <ContentRail title="📅 Esta semana" subtitle="Próximos 7 dias">
          {weekEvents.map((e) => (
            <EventCardV3
              key={e.id}
              slug={e.slug}
              title={e.title}
              imageUrl={e.image_url}
              dateTime={e.date_time}
              venueName={e.venue_name}
              category={e.category}
              featured={e.featured}
            />
          ))}
        </ContentRail>
      )}

      {/* Transport CTA */}
      <div className="px-4 py-2">
        <Link
          to="/v3/transporte"
          className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-primary/15 to-accent/10 border border-primary/20 group"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Car className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-sm text-foreground">Roxou Transporte</p>
            <p className="text-xs text-muted-foreground">Encontre uma carona para o rolê</p>
          </div>
          <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Featured */}
      {featured.length > 1 && (
        <ContentRail title="⭐ Destaques" subtitle="Curadoria Roxou">
          {featured.slice(1).map((e) => (
            <EventCardV3
              key={e.id}
              slug={e.slug}
              title={e.title}
              imageUrl={e.image_url}
              dateTime={e.date_time}
              venueName={e.venue_name}
              category={e.category}
              featured
            />
          ))}
        </ContentRail>
      )}

      {/* Filtered / All */}
      {filtered.length > 0 && (
        <ContentRail title={categoryFilter ? `${categoryFilter}` : "🎉 Todos os eventos"} subtitle="Explore o que vem por aí">
          {filtered.slice(0, 20).map((e) => (
            <EventCardV3
              key={e.id}
              slug={e.slug}
              title={e.title}
              imageUrl={e.image_url}
              dateTime={e.date_time}
              venueName={e.venue_name}
              category={e.category}
            />
          ))}
        </ContentRail>
      )}
    </div>
  );
}
