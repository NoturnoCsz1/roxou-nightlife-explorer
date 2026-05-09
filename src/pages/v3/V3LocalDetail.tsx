import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin, Instagram, MessageCircle, BadgeCheck, Image, CalendarDays, Eye, Heart, Clock, Navigation, Share2, Flame, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSavedPartners } from "@/hooks/useSavedPartners";
import EventCardV3 from "@/components/v3/EventCardV3";
import LazyVenueMap from "@/components/maps/LazyVenueMap";
import AuraVenueInsights from "@/components/v3/local/AuraVenueInsights";
import AuraVenuePricing from "@/components/v3/local/AuraVenuePricing";
import AuraVenueRankingBadges from "@/components/v3/local/AuraVenueRankingBadges";
import { trackEvent } from "@/lib/analytics";
import SEO from "@/components/SEO";
import { toast } from "sonner";
import { isTodaySP, isTomorrowSP, formatTime, formatWeekdaySP, getEventDateSP } from "@/lib/dateUtils";
import { optimizedImageUrl, optimizedSrcSet } from "@/lib/imageOptimizer";

const TOP_WEEK_THRESHOLD = 100;

async function sharePartner(partner: { id: string; name: string; slug: string; city?: string | null; short_description?: string | null }) {
  const url = `https://roxou.com.br/v3/local/${partner.slug}`;
  const title = `${partner.name} | Roxou`;
  const text = partner.short_description || `Veja o ${partner.name}${partner.city ? ` em ${partner.city}` : ""} na Roxou.`;
  try {
    trackEvent({
      event_type: "share_click",
      venue_id: partner.id,
      metadata: { slug: partner.slug, name: partner.name, channel: "share" },
    });
  } catch {}
  try {
    if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share) {
      await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({ title, text, url });
      return;
    }
  } catch {
    // user canceled or unsupported — fall through to copy
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  } catch {
    toast.error("Não foi possível compartilhar");
  }
}

function getOperatingStatus(type?: string | null) {
  const hour = new Date().getHours();
  const normalized = (type || "").toLowerCase();
  const openHour = normalized.includes("bar") || normalized.includes("pub") || normalized.includes("balada") ? 18 : 10;
  const closeHour = normalized.includes("balada") ? 3 : normalized.includes("bar") || normalized.includes("pub") ? 2 : 22;
  const isOvernight = closeHour < openHour;
  const open = isOvernight ? hour >= openHour || hour < closeHour : hour >= openHour && hour < closeHour;
  return open
    ? { label: "🟢 Aberto Agora", tone: "text-primary" }
    : { label: `🔴 Abre às ${String(openHour).padStart(2, "0")}:00`, tone: "text-muted-foreground" };
}

const cleanPhone = (phone: string) => phone.replace(/\D/g, "");

export default function V3LocalDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { isFollowed, toggleFollow } = useSavedPartners();
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowStickyCta(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { data: partner } = useQuery({
    queryKey: ["v3-partner", slug],
    queryFn: async () => {
      const { data } = await supabase.from("partners").select("*").eq("slug", slug!).eq("active", true).maybeSingle();
      return data;
    },
    enabled: !!slug,
  });

  useEffect(() => {
    if (!partner?.id) return;
    try {
      trackEvent({
        event_type: "venue_view",
        venue_id: partner.id,
        city: partner.city || null,
        category: partner.type || null,
        metadata: {
          slug: partner.slug,
          name: partner.name,
          instagram: partner.instagram,
        },
      });
    } catch {
      // fire-and-forget; nunca quebra render
    }
  }, [partner?.id]);

  const { data: events = [] } = useQuery({
    queryKey: ["v3-partner-events", partner?.id],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*").eq("partner_id", partner!.id).eq("status", "published")
        .gte("date_time", new Date().toISOString()).order("date_time").limit(20);
      return data || [];
    },
    enabled: !!partner?.id,
  });

  const { data: viewCount = 0 } = useQuery({
    queryKey: ["v3-partner-views", partner?.id],
    queryFn: async () => {
      const { count } = await supabase.from("page_views").select("id", { count: "exact", head: true })
        .eq("partner_id", partner!.id);
      return count || 0;
    },
    enabled: !!partner?.id,
  });

  /* follower count */
  const { data: followerCount = 0 } = useQuery({
    queryKey: ["v3-partner-followers", partner?.id],
    queryFn: async () => {
      const { count } = await supabase.from("saved_partners").select("id", { count: "exact", head: true })
        .eq("partner_id", partner!.id);
      return count || 0;
    },
    enabled: !!partner?.id,
  });

  /* related partners — same city + same type, fallback to same city */
  const { data: relatedPartners = [] } = useQuery({
    queryKey: ["v3-partner-related", partner?.id, partner?.city, partner?.type],
    queryFn: async () => {
      const base = supabase
        .from("partners")
        .select("id, name, slug, type, city, logo_url, verified_partner")
        .eq("active", true)
        .eq("city", partner!.city)
        .neq("id", partner!.id)
        .limit(4);
      const { data: same } = await base.eq("type", partner!.type);
      if (same && same.length >= 4) return same;
      const need = 4 - (same?.length || 0);
      const { data: others } = await supabase
        .from("partners")
        .select("id, name, slug, type, city, logo_url, verified_partner")
        .eq("active", true)
        .eq("city", partner!.city)
        .neq("id", partner!.id)
        .neq("type", partner!.type)
        .limit(need);
      return [...(same || []), ...(others || [])];
    },
    enabled: !!partner?.id && !!partner?.city,
  });

  if (!partner) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Local não encontrado</p>
        <Link to="/" className="text-primary text-sm mt-2 inline-block">Voltar</Link>
      </div>
    );
  }

  const followed = partner ? isFollowed(partner.id) : false;
  const operatingStatus = getOperatingStatus(partner.type);
  const mapsUrl = partner.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${partner.address}, ${partner.city || ""}`)}`
    : null;
  const instagramUrl = partner.instagram ? `https://instagram.com/${partner.instagram.replace("@", "")}` : null;
  const whatsappUrl = partner.whatsapp ? `https://wa.me/55${cleanPhone(partner.whatsapp)}` : null;
  const isTopWeek = viewCount >= TOP_WEEK_THRESHOLD;
  const canonical = `https://roxou.com.br/v3/local/${partner.slug}`;
  const seoTitle = `${partner.name}${partner.city ? ` em ${partner.city}` : ""} | Roxou`;
  const seoDescription = partner.short_description
    ? partner.short_description
    : `Veja próximos eventos, localização, Instagram e informações do ${partner.name}${partner.city ? ` em ${partner.city}` : ""} na Roxou.`;
  const seoKeywords = [
    partner.name,
    partner.city,
    partner.type,
    "eventos",
    "balada",
    "bar",
    "restaurante",
    "Roxou",
  ].filter(Boolean).join(", ");
  // FAQ derivada de dados reais (sem inventar). Inclui apenas itens com resposta válida.
  const faqs: { q: string; a: string }[] = [];
  if (partner.address || partner.city) {
    faqs.push({
      q: `Onde fica ${partner.name}?`,
      a: [partner.address, partner.city].filter(Boolean).join(", "),
    });
  }
  if (partner.whatsapp || instagramUrl) {
    const canais: string[] = [];
    if (partner.whatsapp) canais.push(`WhatsApp ${partner.whatsapp}`);
    if (instagramUrl) canais.push(`Instagram @${partner.instagram!.replace("@", "")}`);
    faqs.push({
      q: `Como reservar no ${partner.name}?`,
      a: `Você pode entrar em contato pelos canais oficiais: ${canais.join(" ou ")}.`,
    });
  }
  if (events.length > 0) {
    faqs.push({
      q: `Quais eventos acontecem no ${partner.name}?`,
      a: `Atualmente há ${events.length} ${events.length === 1 ? "evento confirmado" : "eventos confirmados"} no ${partner.name}. Veja a agenda completa nesta página.`,
    });
  }
  if (partner.instagram) {
    faqs.push({
      q: `O ${partner.name} tem Instagram?`,
      a: `Sim, o Instagram oficial é @${partner.instagram.replace("@", "")}.`,
    });
  }
  if (mapsUrl) {
    faqs.push({
      q: `Como chegar ao ${partner.name}?`,
      a: `Use o botão "Como Chegar" desta página para abrir a rota direta no Google Maps${partner.address ? ` até ${partner.address}` : ""}.`,
    });
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        name: partner.name,
        description: seoDescription,
        url: canonical,
        ...(partner.logo_url ? { image: partner.logo_url, logo: partner.logo_url } : {}),
        ...(partner.address || partner.city
          ? {
              address: {
                "@type": "PostalAddress",
                streetAddress: partner.address || undefined,
                addressLocality: partner.city || undefined,
                addressRegion: "SP",
                addressCountry: "BR",
              },
            }
          : {}),
        ...(partner.latitude != null && partner.longitude != null
          ? { geo: { "@type": "GeoCoordinates", latitude: Number(partner.latitude), longitude: Number(partner.longitude) } }
          : {}),
        ...(partner.whatsapp ? { telephone: partner.whatsapp } : {}),
        ...(partner.instagram ? { sameAs: [`https://instagram.com/${partner.instagram.replace("@", "")}`] } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://roxou.com.br/" },
          ...(partner.city ? [{ "@type": "ListItem", position: 2, name: partner.city, item: `https://roxou.com.br/cidade/${encodeURIComponent(String(partner.city).toLowerCase())}` }] : []),
          { "@type": "ListItem", position: partner.city ? 3 : 2, name: partner.name, item: canonical },
        ],
      },
      ...(faqs.length > 0
        ? [{
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }]
        : []),
    ],
  };

  return (
    <div className={whatsappUrl ? "pb-8 lg:pb-8 [padding-bottom:calc(env(safe-area-inset-bottom)+88px)] lg:[padding-bottom:2rem]" : "pb-8"}>
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonical={canonical}
        ogImage={partner.logo_url || undefined}
        keywords={seoKeywords}
        jsonLd={jsonLd}
      />
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="px-4 pt-3 text-[11px] text-muted-foreground flex items-center gap-1 truncate">
        <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
        {partner.city && (
          <>
            <ChevronRight className="w-3 h-3 opacity-60" />
            <span className="truncate">{partner.city}</span>
          </>
        )}
        <ChevronRight className="w-3 h-3 opacity-60" />
        <span className="text-foreground/80 truncate">{partner.name}</span>
      </nav>

      {/* Header — refined composition */}
      <div className="relative h-[210px] bg-gradient-to-br from-primary/15 via-primary/5 to-accent/8 flex items-end">
        <Link to="/" className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center z-10">
          <ArrowLeft className="w-4 h-4 text-white" />
        </Link>
        <div className="px-4 pb-4 flex items-end gap-3.5 w-full">
          {partner.logo_url ? (
            <img
              src={optimizedImageUrl(partner.logo_url, 192, 80) || partner.logo_url}
              srcSet={optimizedSrcSet(partner.logo_url, [96, 192, 288], 80)}
              sizes="68px"
              alt={partner.name}
              fetchPriority="high"
              decoding="async"
              className="w-[68px] h-[68px] rounded-xl object-cover border-2 border-background shadow-lg"
            />
          ) : (
            <div className="w-[68px] h-[68px] rounded-xl bg-primary/15 flex items-center justify-center text-2xl font-display font-bold text-primary border-2 border-background">
              {partner.name[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-display font-bold text-xl text-foreground truncate">{partner.name}</h1>
              {partner.verified_partner && <BadgeCheck className="w-5 h-5 text-accent shrink-0" />}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-primary font-medium capitalize">{partner.type}</span>
              {isTopWeek && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30 backdrop-blur-sm">
                  <Flame className="w-2.5 h-2.5" /> Top da semana
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Eye className="w-3 h-3" /> {viewCount}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <CalendarDays className="w-3 h-3" /> {events.length}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Heart className="w-3 h-3" /> {followerCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4 mt-4">
        {partner.short_description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{partner.short_description}</p>
        )}

        <AuraVenueRankingBadges
          partner={partner}
          events={events}
          viewCount={viewCount}
          followerCount={followerCount}
        />

        <div className="rounded-2xl v3-glass p-3 flex items-center gap-2 border border-border/40">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className={`text-xs font-extrabold ${operatingStatus.tone}`}>{operatingStatus.label}</p>
            <p className="text-[10px] text-muted-foreground">Horário estimado do local</p>
          </div>
        </div>

        {/* Actions — quick utility buttons */}
        <div className="grid grid-cols-3 gap-2">
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
              onClick={() => {
                try {
                  trackEvent({
                    event_type: "maps_click",
                    venue_id: partner.id,
                    city: partner.city || null,
                    category: partner.type || null,
                    metadata: {
                      slug: partner.slug,
                      name: partner.name,
                      target_url: mapsUrl,
                      channel: "maps",
                      address: partner.address,
                    },
                  });
                } catch {}
              }}
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl v3-glass px-2 py-3 text-center text-[10px] font-bold text-foreground border border-border/40 hover:border-primary/40 v3-neon-hover transition-all">
              <Navigation className="w-4 h-4 text-primary" /> Como Chegar
            </a>
          )}
          {instagramUrl && (
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer"
              onClick={() => {
                try {
                  trackEvent({
                    event_type: "instagram_click",
                    venue_id: partner.id,
                    city: partner.city || null,
                    category: partner.type || null,
                    metadata: {
                      slug: partner.slug,
                      name: partner.name,
                      target_url: instagramUrl,
                      channel: "instagram",
                    },
                  });
                } catch {}
                import("@/lib/ga").then(m => m.trackPartnerClick(partner.id, partner.name));
              }}
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl v3-glass px-2 py-3 text-center text-[10px] font-bold text-foreground border border-border/40 hover:border-primary/40 v3-neon-hover transition-all">
              <Instagram className="w-4 h-4 text-primary" /> Instagram
            </a>
          )}
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              onClick={() => {
                try {
                  trackEvent({
                    event_type: "whatsapp_click",
                    venue_id: partner.id,
                    city: partner.city || null,
                    category: partner.type || null,
                    metadata: {
                      slug: partner.slug,
                      name: partner.name,
                      target_url: whatsappUrl,
                      channel: "whatsapp",
                    },
                  });
                } catch {}
                import("@/lib/ga").then(m => m.trackPartnerClick(partner.id, partner.name));
              }}
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl v3-glass px-2 py-3 text-center text-[10px] font-bold text-foreground border border-border/40 hover:border-primary/40 v3-neon-hover transition-all">
              <MessageCircle className="w-4 h-4 text-primary" /> Reservar
            </a>
          )}
        </div>

        <div className="flex gap-2">
          {user && (
            <button
              onClick={() => toggleFollow(partner.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                followed
                  ? "bg-primary/10 text-primary border border-primary/25"
                  : "gradient-primary text-primary-foreground neon-glow"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${followed ? "fill-primary" : ""}`} />
              {followed ? "Seguindo" : "Seguir"}
            </button>
          )}
          <button
            onClick={() => sharePartner(partner)}
            aria-label="Compartilhar"
            className={`${user ? "" : "flex-1 "}flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-card border border-border/40 text-foreground hover:border-primary/40 transition-all`}
          >
            <Share2 className="w-3.5 h-3.5 text-primary" />
            Compartilhar
          </button>
        </div>

        {partner.address && (
          <a href={mapsUrl || "#"}
            target="_blank" rel="noopener noreferrer"
            onClick={() => {
              try {
                trackEvent({
                  event_type: "maps_click",
                  venue_id: partner.id,
                  city: partner.city || null,
                  category: partner.type || null,
                  metadata: {
                    slug: partner.slug,
                    name: partner.name,
                    target_url: mapsUrl,
                    channel: "maps",
                    address: partner.address,
                  },
                });
              } catch {}
            }}
            className="flex items-center gap-2 p-3.5 rounded-xl bg-card border border-border/40 text-sm text-muted-foreground hover:border-primary/30 transition-colors">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="flex-1">{partner.address}</span>
          </a>
        )}

        <AuraVenueInsights partner={partner} events={events} />
        <AuraVenuePricing partner={partner} events={events} />

        {partner.latitude != null && partner.longitude != null && (
          <div className="space-y-2">
            <h2 className="font-display font-bold text-base text-foreground">Localização</h2>
            <LazyVenueMap
              lat={Number(partner.latitude)}
              lng={Number(partner.longitude)}
              name={partner.name}
              address={partner.address}
              height={220}
            />
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${partner.latitude},${partner.longitude}`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => {
                try {
                  trackEvent({
                    event_type: "maps_click",
                    venue_id: partner.id,
                    city: partner.city || null,
                    category: partner.type || null,
                    metadata: {
                      slug: partner.slug,
                      name: partner.name,
                      target_url: `https://www.google.com/maps/dir/?api=1&destination=${partner.latitude},${partner.longitude}`,
                      channel: "maps",
                      address: partner.address,
                    },
                  });
                } catch {}
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <Navigation className="w-3.5 h-3.5" /> Como chegar
            </a>
          </div>
        )}

        {/* Events */}
        {events.length > 0 && (
          <div>
            <h2 className="font-display font-bold text-base text-foreground mb-3">📅 Próximos eventos</h2>
            <NextEventCard event={events[0]} />
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {events.map((e) => (
                <EventCardV3 key={e.id} id={e.id} slug={e.slug} title={e.title} imageUrl={e.image_url}
                  dateTime={e.date_time} venueName={e.venue_name} category={e.category} />
              ))}
            </div>
          </div>
        )}

        {/* Instagram Feed — Premium placeholder ready for real integration */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Instagram className="w-4 h-4 text-primary" />
            <h2 className="font-display font-bold text-base text-foreground">Últimos posts</h2>
          </div>
          {partner.instagram ? (
            <InstagramFeedPlaceholder handle={partner.instagram} partnerId={partner.id} />
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

        {/* Related partners — cross-sell */}
        {relatedPartners.length > 0 && (
          <RelatedPartnersSection partners={relatedPartners} currentPartner={{ id: partner.id, name: partner.name }} />
        )}

        {/* FAQ */}
        {faqs.length > 0 && <FaqSection faqs={faqs} />}
      </div>

      {/* Sticky mobile CTA — premium glass bar */}
      {whatsappUrl && (
        <div
          className={`lg:hidden fixed inset-x-0 bottom-0 z-40 transition-all duration-300 ease-out ${
            showStickyCta ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
          }`}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-3 mb-3 rounded-2xl v3-glass border border-primary/30 shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.5)] backdrop-blur-xl px-3 py-2.5 flex items-center gap-2.5">
            {partner.logo_url ? (
              <img
                src={optimizedImageUrl(partner.logo_url, 96, 75) || partner.logo_url}
                srcSet={optimizedSrcSet(partner.logo_url, [80, 160], 75)}
                sizes="40px"
                alt=""
                loading="lazy"
                decoding="async"
                className="w-10 h-10 rounded-xl object-cover shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-base font-display font-bold text-primary shrink-0">
                {partner.name[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{partner.name}</p>
              <p className={`text-[10px] font-semibold ${operatingStatus.tone} truncate`}>{operatingStatus.label}</p>
            </div>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                try {
                  trackEvent({
                    event_type: "whatsapp_click",
                    venue_id: partner.id,
                    city: partner.city || null,
                    category: partner.type || null,
                    metadata: {
                      slug: partner.slug,
                      name: partner.name,
                      target_url: whatsappUrl,
                      channel: "whatsapp",
                      source: "sticky_cta",
                    },
                  });
                } catch {}
                import("@/lib/ga").then(m => m.trackPartnerClick(partner.id, partner.name));
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground text-xs font-extrabold neon-glow shrink-0"
            >
              <MessageCircle className="w-4 h-4" />
              Reservar
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Instagram Feed component — currently a premium placeholder.
 * Structured to accept real posts data via props when the Instagram API integration is ready.
 * Replace `posts` with actual data from instagram_imports or a dedicated partner_instagram_posts table.
 */
function InstagramFeedPlaceholder({ handle, partnerId }: { handle: string; partnerId: string }) {
  // Future: fetch real posts from DB
  // const { data: posts = [] } = useQuery({ queryKey: ["partner-ig-posts", partnerId], ... });
  const posts: { id: string; image_url: string; permalink: string; caption?: string }[] = [];
  const cleanHandle = handle.replace("@", "");

  if (posts.length > 0) {
    // Real posts grid — ready for when data arrives
    return (
      <div>
        <div className="grid grid-cols-3 gap-1.5">
          {posts.slice(0, 9).map(post => (
            <a key={post.id} href={post.permalink} target="_blank" rel="noopener noreferrer"
              className="aspect-square rounded-lg overflow-hidden relative group">
              <img
                src={optimizedImageUrl(post.image_url, 320, 70) || post.image_url}
                srcSet={optimizedSrcSet(post.image_url, [240, 480], 70)}
                sizes="(max-width: 640px) 30vw, 200px"
                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <Instagram className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          ))}
        </div>
        <a href={`https://instagram.com/${cleanHandle}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 mt-3 py-2.5 rounded-xl bg-card border border-border/30 text-[11px] text-primary font-semibold hover:border-primary/30 transition-colors">
          <Instagram className="w-3.5 h-3.5" /> Ver mais no Instagram
        </a>
      </div>
    );
  }

  // Premium placeholder grid
  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <a key={i} href={`https://instagram.com/${cleanHandle}`}
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
      <a href={`https://instagram.com/${cleanHandle}`}
        target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 mt-3 py-2.5 rounded-xl bg-card border border-border/30 text-[11px] text-primary font-semibold hover:border-primary/30 transition-colors">
        <Instagram className="w-3.5 h-3.5" /> Seguir no Instagram
      </a>
      <p className="text-[9px] text-muted-foreground/50 text-center mt-1.5">
        Em breve, os posts reais aparecerão aqui automaticamente
      </p>
    </div>
  );
}

/**
 * NextEventCard — bloco premium de urgência mostrando o próximo evento do local.
 * Usa apenas dados já carregados em `events[0]`. Timezone America/Sao_Paulo via dateUtils.
 */
function NextEventCard({ event }: { event: { id: string; slug: string; title: string; date_time: string; image_url?: string | null } }) {
  const date = getEventDateSP(event.date_time);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!date) return null;

  const diffMs = date.getTime() - now.getTime();
  const isLive = diffMs <= 0 && diffMs > -6 * 60 * 60 * 1000; // janela de 6h "rolando agora"
  const isPast = diffMs <= -6 * 60 * 60 * 1000;
  if (isPast) return null;

  let whenLabel: string;
  if (isTodaySP(date)) whenLabel = `Hoje às ${formatTime(date)}`;
  else if (isTomorrowSP(date)) whenLabel = `Amanhã às ${formatTime(date)}`;
  else {
    const dow = formatWeekdaySP(date).slice(0, 3).toUpperCase().replace(".", "");
    whenLabel = `${dow} • ${formatTime(date)}`;
  }

  let countdown: string;
  if (isLive) {
    countdown = "Rolando agora 🔥";
  } else {
    const totalMin = Math.max(0, Math.floor(diffMs / 60_000));
    const days = Math.floor(totalMin / (60 * 24));
    const hours = Math.floor((totalMin % (60 * 24)) / 60);
    const mins = totalMin % 60;
    if (days > 0) countdown = `Começa em: ${days}d ${String(hours).padStart(2, "0")}h`;
    else if (hours > 0) countdown = `Começa em: ${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m`;
    else countdown = `Começa em: ${mins}m`;
  }

  return (
    <Link
      to={`/v3/evento/${event.slug}`}
      className="block mb-3 rounded-2xl v3-glass border border-primary/30 shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.45)] backdrop-blur-xl px-3.5 py-3 hover:border-primary/50 transition-all"
    >
      <div className="flex items-center gap-3">
        {event.image_url && (
          <img
            src={optimizedImageUrl(event.image_url, 192, 75) || event.image_url}
            srcSet={optimizedSrcSet(event.image_url, [112, 224, 336], 75)}
            sizes="56px"
            alt=""
            loading="lazy"
            decoding="async"
            className="w-14 h-14 rounded-xl object-cover shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-primary mb-0.5">
            <Flame className="w-3 h-3" /> Próximo evento
          </div>
          <p className="text-sm font-bold text-foreground truncate">{event.title}</p>
          <p className="text-[11px] text-muted-foreground">{whenLabel}</p>
          <p className={`text-[11px] font-bold mt-0.5 ${isLive ? "text-primary" : "text-foreground/80"}`}>{countdown}</p>
        </div>
        <span className="px-3 py-2 rounded-xl gradient-primary text-primary-foreground text-[11px] font-extrabold shrink-0 neon-glow">
          Ver evento
        </span>
      </div>
    </Link>
  );
}

/**
 * RelatedPartnersSection — cross-sell de locais parecidos.
 * Horizontal scroll mobile, grid 4 colunas no desktop.
 */
function RelatedPartnersSection({
  partners,
  currentPartner,
}: {
  partners: Array<{ id: string; name: string; slug: string; type: string; city: string; logo_url: string | null; verified_partner: boolean | null }>;
  currentPartner: { id: string; name: string };
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-display font-bold text-base text-foreground">Locais parecidos</h2>
        <p className="text-[11px] text-muted-foreground">Outros lugares que combinam com essa vibe</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide lg:grid lg:grid-cols-4 lg:overflow-visible">
        {partners.map((p) => (
          <Link
            key={p.id}
            to={`/v3/local/${p.slug}`}
            onClick={() => {
              try {
                trackEvent({
                  event_type: "venue_click",
                  venue_id: p.id,
                  city: p.city || null,
                  category: p.type || null,
                  source_page: "local_detail_related",
                  metadata: {
                    current_venue_id: currentPartner.id,
                    current_venue_name: currentPartner.name,
                    target_venue_name: p.name,
                    target_slug: p.slug,
                  },
                });
              } catch {}
            }}
            className="shrink-0 w-[160px] lg:w-auto rounded-2xl v3-glass border border-border/40 hover:border-primary/40 transition-all overflow-hidden"
          >
            <div className="aspect-[4/3] bg-gradient-to-br from-primary/10 via-card to-accent/5 flex items-center justify-center">
              {p.logo_url ? (
                <img
                  src={optimizedImageUrl(p.logo_url, 320, 75) || p.logo_url}
                  srcSet={optimizedSrcSet(p.logo_url, [240, 480], 75)}
                  sizes="(max-width: 640px) 45vw, 240px"
                  alt={p.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="text-3xl font-display font-bold text-primary/40">{p.name[0]}</span>
              )}
            </div>
            <div className="p-2.5">
              <div className="flex items-center gap-1">
                <p className="text-xs font-bold text-foreground truncate flex-1">{p.name}</p>
                {p.verified_partner && <BadgeCheck className="w-3.5 h-3.5 text-accent shrink-0" />}
              </div>
              <p className="text-[10px] text-primary capitalize">{p.type}</p>
              <p className="text-[10px] text-muted-foreground truncate">{p.city}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/**
 * FaqSection — accordion leve usando <details>/<summary> (sem libs novas).
 * Glass premium Roxou. Conteúdo derivado apenas de dados reais do parceiro.
 */
function FaqSection({ faqs }: { faqs: { q: string; a: string }[] }) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-display font-bold text-base text-foreground">Perguntas frequentes</h2>
        <p className="text-[11px] text-muted-foreground">Tudo o que você precisa saber sobre este local</p>
      </div>
      <div className="rounded-2xl v3-glass border border-border/40 divide-y divide-border/30 overflow-hidden">
        {faqs.map((f, i) => (
          <details
            key={i}
            className="group px-3.5 py-3 open:bg-primary/5 transition-colors [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex items-center justify-between gap-3 cursor-pointer list-none">
              <span className="text-xs font-bold text-foreground flex-1">{f.q}</span>
              <ChevronRight className="w-4 h-4 text-primary shrink-0 transition-transform duration-200 group-open:rotate-90" />
            </summary>
            <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
