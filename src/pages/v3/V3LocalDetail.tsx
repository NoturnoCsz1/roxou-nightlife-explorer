import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin, Instagram, MessageCircle, BadgeCheck, Image } from "lucide-react";
import EventCardV3 from "@/components/v3/EventCardV3";

export default function V3LocalDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data: partner } = useQuery({
    queryKey: ["v3-partner", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("*")
        .eq("slug", slug!)
        .eq("active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!slug,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["v3-partner-events", partner?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("partner_id", partner!.id)
        .eq("status", "published")
        .gte("date_time", new Date().toISOString())
        .order("date_time")
        .limit(20);
      return data || [];
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
      <div className="relative h-[180px] bg-gradient-to-br from-primary/20 to-accent/10 flex items-end">
        <Link to="/v3" className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-white" />
        </Link>
        <div className="px-4 pb-4 flex items-end gap-3">
          {partner.logo_url ? (
            <img src={partner.logo_url} alt={partner.name} className="w-16 h-16 rounded-xl object-cover border-2 border-background" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center text-2xl font-display font-bold text-primary border-2 border-background">
              {partner.name[0]}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-display font-bold text-xl text-foreground">{partner.name}</h1>
              {partner.verified_partner && <BadgeCheck className="w-4 h-4 text-accent shrink-0" />}
            </div>
            <span className="text-xs text-primary font-medium capitalize">{partner.type}</span>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4 mt-4">
        {partner.short_description && <p className="text-sm text-muted-foreground">{partner.short_description}</p>}

        <div className="flex gap-2">
          {partner.instagram && (
            <a href={`https://instagram.com/${partner.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border/40 text-xs text-muted-foreground hover:text-primary transition-colors">
              <Instagram className="w-3.5 h-3.5" /> Instagram
            </a>
          )}
          {partner.whatsapp && (
            <a href={`https://wa.me/${partner.whatsapp}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border/40 text-xs text-muted-foreground hover:text-primary transition-colors">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
          )}
        </div>

        {partner.address && (
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partner.address)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border/40 text-sm text-muted-foreground hover:border-primary/30 transition-colors">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            {partner.address}
          </a>
        )}

        {events.length > 0 && (
          <div>
            <h2 className="font-display font-bold text-base text-foreground mb-3">Próximos eventos</h2>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {events.map((e) => (
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
            </div>
          </div>
        )}

        {/* ── Instagram Feed (placeholder) ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Instagram className="w-4 h-4 text-primary" />
            <h2 className="font-display font-bold text-base text-foreground">Últimos posts</h2>
          </div>
          {partner.instagram ? (
            <div className="grid grid-cols-3 gap-1.5">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <a
                  key={i}
                  href={`https://instagram.com/${partner.instagram?.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square rounded-lg bg-card border border-border/30 flex items-center justify-center overflow-hidden hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-col items-center gap-1 text-muted-foreground/30">
                    <Image className="w-5 h-5" />
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-card border border-border/30 text-center">
              <Instagram className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Instagram não conectado</p>
            </div>
          )}
          {partner.instagram && (
            <a
              href={`https://instagram.com/${partner.instagram.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2 text-center text-[11px] text-primary font-medium hover:underline"
            >
              Ver mais no Instagram →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
