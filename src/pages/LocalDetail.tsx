import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Instagram, MessageCircle, ExternalLink } from "lucide-react";
import EventCard from "@/components/EventCard";
import type { SupabaseEvent } from "@/components/EventCard";
import BottomNav from "@/components/BottomNav";
import DesktopNav from "@/components/DesktopNav";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { usePageTracking } from "@/hooks/usePageTracking";
import SEO from "@/components/SEO";

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
  instagram_profile_picture_url?: string | null;
  instagram_followers_count?: number | null;
  aura_partner_summary?: string | null;
}

const LocalDetail = () => {
  usePageTracking();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<SupabaseEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<SupabaseEvent[]>([]);
  const [pastTotal, setPastTotal] = useState(0);
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
          const now = new Date().toISOString();
          Promise.all([
            supabase
              .from("events")
              .select("id, title, slug, description, date_time, category, sub_category, venue_name, address, instagram, image_url, featured, status, partner_id")
              .eq("status", "published")
              .eq("partner_id", data.id)
              .gte("date_time", now)
              .order("date_time", { ascending: true })
              .limit(6),
            supabase
              .from("events")
              .select("id, title, slug, description, date_time, category, sub_category, venue_name, address, instagram, image_url, featured, status, partner_id")
              .eq("status", "published")
              .eq("partner_id", data.id)
              .lt("date_time", now)
              .order("date_time", { ascending: false })
              .limit(10),
            supabase
              .from("events")
              .select("id", { count: "exact", head: true })
              .eq("status", "published")
              .eq("partner_id", data.id)
              .lt("date_time", now),
          ]).then(([{ data: upcoming }, { data: past }, { count }]) => {
            setUpcomingEvents(upcoming || []);
            setPastEvents(past || []);
            setPastTotal(count || 0);
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
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <SEO
        title={`${partner.name} — Eventos, Festas e Programação em Presidente Prudente | ROXOU`}
        description={partner.short_description || `Confira a programação completa do ${partner.name} em Presidente Prudente. Próximos eventos, endereço, Instagram e mais.`}
        canonical={`https://roxou.com.br/local/${partner.slug}`}
        ogImage={partner.logo_url || "https://roxou.com.br/og-image.png"}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: partner.name,
          description: partner.full_description || partner.short_description || `${partner.name} em Presidente Prudente — ${partner.type}.`,
          address: {
            "@type": "PostalAddress",
            streetAddress: partner.address || "",
            addressLocality: "Presidente Prudente",
            addressRegion: "SP",
            addressCountry: "BR",
          },
          ...(partner.neighborhood ? { areaServed: partner.neighborhood } : {}),
          ...(partner.whatsapp ? { telephone: partner.whatsapp } : {}),
          ...(partner.instagram
            ? { sameAs: [`https://instagram.com/${partner.instagram.replace("@", "")}`] }
            : {}),
          ...(partner.logo_url ? { image: partner.logo_url } : {}),
          url: `https://roxou.com.br/local/${partner.slug}`,
        }}
      />
      <DesktopNav />
      <header className="sticky top-0 z-40 glass border-b border-border/30 px-4 pt-4 pb-3 md:hidden">
        <div className="mx-auto max-w-lg flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-full bg-secondary p-2">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <h1 className="text-lg font-black font-display text-foreground truncate">{partner.name}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg md:max-w-4xl px-4 md:px-6 mt-5 md:mt-8 space-y-6">
        {/* Partner Info */}
        <div className="rounded-2xl bg-card p-5 card-shadow">
          <div className="flex items-start gap-4">
            {(partner.logo_url || partner.instagram_profile_picture_url) && (
              <img
                src={partner.logo_url || partner.instagram_profile_picture_url || ""}
                alt={partner.name}
                className="h-16 w-16 rounded-xl object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold font-display text-foreground">{partner.name}</h2>
                {partner.verified_partner && (
                  <span className="text-[10px] font-bold uppercase tracking-wider gradient-primary text-primary-foreground px-2 py-0.5 rounded-md">Verificado</span>
                )}
                {partner.aura_partner_summary && (
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-primary/15 text-primary px-1.5 py-0.5 rounded">✨ Aura</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">
                {partner.type}
                {partner.instagram_followers_count ? ` • ${partner.instagram_followers_count.toLocaleString("pt-BR")} seguidores` : ""}
              </p>
              {(partner.short_description || partner.aura_partner_summary) && (
                <p className="text-sm text-muted-foreground mt-2">{partner.short_description || partner.aura_partner_summary}</p>
              )}
            </div>
          </div>

          {partner.address && (
            <div className="flex items-start gap-2 mt-4 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{partner.address}{partner.neighborhood ? `, ${partner.neighborhood}` : ""} — {partner.city}</span>
            </div>
          )}

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

        {partner.full_description && (
          <div className="rounded-2xl bg-card p-5 card-shadow">
            <h3 className="text-sm font-bold text-foreground mb-2">Sobre</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{partner.full_description}</p>
          </div>
        )}

        {upcomingEvents.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3">Próximos Eventos</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {upcomingEvents.map((e, i) => (
                <EventCard key={e.id} event={e} index={i} />
              ))}
            </div>
          </div>
        )}

        {pastEvents.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3">Eventos já realizados ({pastTotal})</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {pastEvents.map((e, i) => (
                <EventCard key={e.id} event={e} index={i} />
              ))}
            </div>
            {pastTotal > 10 && (
              <button
                onClick={() => navigate(`/local/${slug}/eventos`)}
                className="mt-4 w-full rounded-xl bg-secondary py-2.5 text-xs font-bold text-foreground hover:bg-secondary/80 transition"
              >
                Ver todos os eventos passados ({pastTotal})
              </button>
            )}
          </div>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
};

export default LocalDetail;
