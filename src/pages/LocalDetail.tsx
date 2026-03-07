import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Instagram, MessageCircle, ExternalLink } from "lucide-react";
import EventCard from "@/components/EventCard";
import type { SupabaseEvent } from "@/components/EventCard";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { usePageTracking } from "@/hooks/usePageTracking";

interface Partner {
  id: string;
  name: string;
  slug: string;
  type: string;
  logo_url: string | null;
  short_description: string | null;
  full_description: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string;
  instagram: string | null;
  whatsapp: string | null;
  verified_partner: boolean;
}

const LocalDetail = () => {
  usePageTracking();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [events, setEvents] = useState<SupabaseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("partners")
      .select("*")
      .eq("slug", slug)
      .eq("active", true)
      .single()
      .then(({ data }) => {
        setPartner(data);
        if (data) {
          supabase
            .from("events")
            .select("id, title, slug, description, date_time, category, venue_name, address, instagram, image_url, featured, status, partner_id")
            .eq("status", "published")
            .eq("partner_id", data.id)
            .gte("date_time", new Date().toISOString())
            .order("date_time", { ascending: true })
            .limit(6)
            .then(({ data: evts }) => {
              setEvents(evts || []);
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">Local não encontrado.</p>
        <button onClick={() => navigate("/")} className="text-primary text-sm font-semibold">Voltar</button>
      </div>
    );
  }

  const mapsUrl = partner.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partner.address + ", " + partner.city)}`
    : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/30 px-4 pt-4 pb-3">
        <div className="mx-auto max-w-lg flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-full bg-secondary p-2">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <h1 className="text-lg font-black font-display text-foreground truncate">{partner.name}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 mt-5 space-y-6">
        {/* Partner Info */}
        <div className="rounded-2xl bg-card p-5 card-shadow">
          <div className="flex items-start gap-4">
            {partner.logo_url && (
              <img src={partner.logo_url} alt={partner.name} className="h-16 w-16 rounded-xl object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-display text-foreground">{partner.name}</h2>
                {partner.verified_partner && (
                  <span className="text-[10px] font-bold uppercase tracking-wider gradient-primary text-primary-foreground px-2 py-0.5 rounded-md">Verificado</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{partner.type}</p>
              {partner.short_description && (
                <p className="text-sm text-muted-foreground mt-2">{partner.short_description}</p>
              )}
            </div>
          </div>

          {/* Location */}
          {partner.address && (
            <div className="flex items-start gap-2 mt-4 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{partner.address}{partner.neighborhood ? `, ${partner.neighborhood}` : ""} — {partner.city}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            {partner.instagram && (
              <a
                href={`https://instagram.com/${partner.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl bg-secondary px-3.5 py-2.5 text-xs font-bold text-foreground transition-all hover:bg-secondary/80"
              >
                <Instagram className="h-3.5 w-3.5 text-primary" />
                Instagram
              </a>
            )}
            {partner.whatsapp && (
              <a
                href={`https://wa.me/55${partner.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl bg-secondary px-3.5 py-2.5 text-xs font-bold text-foreground transition-all hover:bg-secondary/80"
              >
                <MessageCircle className="h-3.5 w-3.5 text-green-500" />
                WhatsApp
              </a>
            )}
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl bg-secondary px-3.5 py-2.5 text-xs font-bold text-foreground transition-all hover:bg-secondary/80"
              >
                <ExternalLink className="h-3.5 w-3.5 text-primary" />
                Mapa
              </a>
            )}
          </div>
        </div>

        {/* Full description */}
        {partner.full_description && (
          <div className="rounded-2xl bg-card p-5 card-shadow">
            <h3 className="text-sm font-bold text-foreground mb-2">Sobre</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{partner.full_description}</p>
          </div>
        )}

        {/* Upcoming events */}
        {events.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3">Próximos Eventos</h3>
            <div className="grid grid-cols-2 gap-3">
              {events.map((e, i) => (
                <EventCard key={e.id} event={e} index={i} />
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
};

export default LocalDetail;
