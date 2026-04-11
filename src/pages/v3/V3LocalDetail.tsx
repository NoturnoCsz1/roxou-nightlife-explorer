import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin, Instagram, MessageCircle, BadgeCheck, Image, CalendarDays, Star, Eye } from "lucide-react";
import EventCardV3 from "@/components/v3/EventCardV3";

export default function V3LocalDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data: partner } = useQuery({
    queryKey: ["v3-partner", slug],
    queryFn: async () => {
      const { data } = await supabase.from("partners").select("*").eq("slug", slug!).eq("active", true).maybeSingle();
      return data;
    },
    enabled: !!slug,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["v3-partner-events", partner?.id],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*").eq("partner_id", partner!.id).eq("status", "published")
        .gte("date_time", new Date().toISOString()).order("date_time").limit(20);
      return data || [];
    },
    enabled: !!partner?.id,
  });

  /* view count for partner */
  const { data: viewCount = 0 } = useQuery({
    queryKey: ["v3-partner-views", partner?.id],
    queryFn: async () => {
      const { count } = await supabase.from("page_views").select("id", { count: "exact", head: true })
        .eq("partner_id", partner!.id);
      return count || 0;
    },
    enabled: !!partner?.id,
  });

  if (!partner) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Local não encontrado</p>
        <Link to="/v3" className="text-primary text-sm mt-2 inline-block">Voltar</Link>
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="relative h-[200px] bg-gradient-to-br from-primary/20 via-primary/5 to-accent/10 flex items-end">
        <Link to="/v3" className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-white" />
        </Link>
        <div className="px-4 pb-4 flex items-end gap-3 w-full">
          {partner.logo_url ? (
            <img src={partner.logo_url} alt={partner.name} className="w-18 h-18 rounded-xl object-cover border-2 border-background shadow-lg" style={{ width: 72, height: 72 }} />
          ) : (
            <div className="w-18 h-18 rounded-xl bg-primary/20 flex items-center justify-center text-2xl font-display font-bold text-primary border-2 border-background" style={{ width: 72, height: 72 }}>
              {partner.name[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-display font-bold text-xl text-foreground truncate">{partner.name}</h1>
              {partner.verified_partner && <BadgeCheck className="w-5 h-5 text-accent shrink-0" />}
            </div>
            <span className="text-xs text-primary font-medium capitalize">{partner.type}</span>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Eye className="w-3 h-3" /> {viewCount} views
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <CalendarDays className="w-3 h-3" /> {events.length} evento{events.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5 mt-4">
        {partner.short_description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{partner.short_description}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {partner.instagram && (
            <a href={`https://instagram.com/${partner.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-card border border-border/40 text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors">
              <Instagram className="w-3.5 h-3.5" /> Instagram
            </a>
          )}
          {partner.whatsapp && (
            <a href={`https://wa.me/${partner.whatsapp}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-card border border-border/40 text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
          )}
        </div>

        {partner.address && (
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partner.address)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 p-3.5 rounded-xl bg-card border border-border/40 text-sm text-muted-foreground hover:border-primary/30 transition-colors">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="flex-1">{partner.address}</span>
          </a>
        )}

        {/* Events */}
        {events.length > 0 && (
          <div>
            <h2 className="font-display font-bold text-base text-foreground mb-3">📅 Próximos eventos</h2>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {events.map((e) => (
                <EventCardV3 key={e.id} slug={e.slug} title={e.title} imageUrl={e.image_url}
                  dateTime={e.date_time} venueName={e.venue_name} category={e.category} />
              ))}
            </div>
          </div>
        )}

        {/* Instagram Feed — Premium placeholder */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Instagram className="w-4 h-4 text-primary" />
            <h2 className="font-display font-bold text-base text-foreground">Últimos posts</h2>
          </div>
          {partner.instagram ? (
            <>
              <div className="grid grid-cols-3 gap-1.5">
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <a key={i} href={`https://instagram.com/${partner.instagram?.replace("@", "")}`}
                    target="_blank" rel="noopener noreferrer"
                    className="aspect-square rounded-lg overflow-hidden relative group">
                    <div className="w-full h-full bg-gradient-to-br from-card via-card to-primary/5 flex items-center justify-center">
                      <Image className="w-6 h-6 text-muted-foreground/15" />
                    </div>
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Instagram className="w-4 h-4 text-primary/40" />
                    </div>
                  </a>
                ))}
              </div>
              <a href={`https://instagram.com/${partner.instagram.replace("@", "")}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 mt-3 py-2.5 rounded-xl bg-card border border-border/30 text-[11px] text-primary font-semibold hover:border-primary/30 transition-colors">
                <Instagram className="w-3.5 h-3.5" /> Seguir no Instagram
              </a>
            </>
          ) : (
            <div className="py-10 rounded-xl bg-card border border-border/20 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-3">
                <Instagram className="w-6 h-6 text-muted-foreground/20" />
              </div>
              <p className="text-xs text-muted-foreground font-medium">Instagram não conectado</p>
              <p className="text-[10px] text-muted-foreground/50 mt-1">Em breve, posts do Instagram aparecerão aqui</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
