import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, MapPin, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import type { SupabaseEvent } from "./EventCard";
import { formatTime, isToday } from "@/lib/dateUtils";

const categoryConfig: Record<string, { label: string; badge: string }> = {
  balada: { label: "Balada", badge: "badge-balada" },
  show: { label: "Show", badge: "badge-show" },
  bar: { label: "Bar", badge: "badge-bar" },
  festival: { label: "Festival", badge: "badge-festival" },
  sertanejo: { label: "Sertanejo", badge: "badge-sertanejo" },
  funk: { label: "Funk", badge: "badge-funk" },
  eletronica: { label: "Eletrônica", badge: "badge-eletronica" },
  festa: { label: "Festa", badge: "badge-balada" },
};

const FeaturedCarousel = () => {
  const [featured, setFeatured] = useState<SupabaseEvent[]>([]);
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("events")
      .select("id, title, slug, description, date_time, category, venue_name, address, instagram, image_url, featured, status, partner_id")
      .eq("featured", true)
      .eq("status", "published")
      .order("date_time", { ascending: true })
      .limit(5)
      .then(({ data }) => setFeatured(data || []));
  }, []);

  const next = useCallback(() => setCurrent((c) => (c + 1) % (featured.length || 1)), [featured.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + (featured.length || 1)) % (featured.length || 1)), [featured.length]);

  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, featured.length]);

  if (featured.length === 0) return null;

  const event = featured[current];
  const cat = categoryConfig[event.category] || { label: event.category, badge: "bg-secondary" };
  const image = event.image_url || "/placeholder.svg";
  const dt = new Date(event.date_time);
  const todayEvent = isToday(dt);
  const time = formatTime(dt);

  return (
    <div className="relative overflow-hidden rounded-3xl card-shadow-lg">
      <button
        onClick={() => navigate(`/evento/${event.slug}`)}
        className="relative block w-full aspect-[9/12] sm:aspect-[16/10] text-left"
      >
        <img src={image} alt={event.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000" key={event.id} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/40 to-transparent" />
        <div className="absolute left-4 top-4 flex gap-2">
          <span className="gradient-primary rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary-foreground">✦ Destaque</span>
          {isToday && <span className="badge-hoje rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest">Hoje</span>}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
          <span className={`${cat.badge} mb-3 inline-block rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider`}>{cat.label}</span>
          <h2 className="mb-2 text-2xl sm:text-3xl font-black text-foreground font-display leading-tight neon-text">{event.title}</h2>
          <div className="flex items-center gap-4 text-sm text-foreground/80">
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" />{event.venue_name}</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary" />{time}</span>
          </div>
        </div>
      </button>
      {featured.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full glass p-2 text-foreground transition hover:neon-border"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full glass p-2 text-foreground transition hover:neon-border"><ChevronRight className="h-4 w-4" /></button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            {featured.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setCurrent(i); }} className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? "w-8 gradient-primary" : "w-2 bg-foreground/25"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default FeaturedCarousel;
