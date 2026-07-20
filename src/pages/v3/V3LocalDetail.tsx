import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin, Instagram, MessageCircle, BadgeCheck, CalendarDays, Eye, Heart, Clock, Navigation, Share2, Flame, ChevronRight } from "lucide-react";
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
import SpotlightBadge from "@/components/partners/SpotlightBadge";
import PartnerInstagramFeed from "@/components/v3/local/PartnerInstagramFeed";
import { buildPartnerRichDescription } from "@/lib/partnerDescription";
import { usePartnerAwards, formatAwardPeriod } from "@/hooks/usePartnerAwards";

const TOP_WEEK_THRESHOLD = 100;

async function sharePartner(partner: { id: string; name: string; slug: string; city?: string | null; short_description?: string | null }) {
  const url = `https://roxou.com.br/local/${partner.slug}`;
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

  /* premiações Roxou ativas para o parceiro */
  const { awards: partnerAwards } = usePartnerAwards(partner?.id);



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
  const canonical = `https://roxou.com.br/local/${partner.slug}`;
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
        ogImage={
          (partner as any).cover_image_url ||
          partner.logo_url ||
          (partner as any).instagram_profile_picture_url ||
          undefined
        }
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

      {/* ═══════════ HERO PREMIUM (mobile-first landing) ═══════════ */}
      <section className="relative mt-2">
        {/* Camada de capa — IG profile pic em blur ou gradiente */}
        <div className="absolute inset-x-0 top-0 h-[260px] overflow-hidden pointer-events-none">
          {(partner as any).instagram_profile_picture_url || partner.logo_url ? (
            <>
              <img
                src={(partner as any).instagram_profile_picture_url || partner.logo_url || ""}
                alt=""
                aria-hidden
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover scale-125 blur-3xl opacity-70"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.18),transparent_60%)]" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-accent/10" />
          )}
        </div>

        {/* Botão voltar — flutuante */}
        <Link
          to="/"
          aria-label="Voltar"
          className="absolute top-3 left-3 z-20 w-9 h-9 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center border border-white/10"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </Link>

        {/* Selo flutuante "Destaque do Mês" — integrado ao hero */}
        {(partner as any).featured_home && (
          <div className="absolute top-3 right-3 z-20">
            <SpotlightBadge variant="chip" />
          </div>
        )}

        {/* Conteúdo do hero */}
        <div className="relative z-10 px-4 pt-14 pb-4 flex items-end gap-4">
          {partner.logo_url || (partner as any).instagram_profile_picture_url ? (
            <img
              src={
                optimizedImageUrl(partner.logo_url || (partner as any).instagram_profile_picture_url, 240, 85) ||
                partner.logo_url ||
                (partner as any).instagram_profile_picture_url
              }
              srcSet={partner.logo_url ? optimizedSrcSet(partner.logo_url, [120, 240, 360], 85) : undefined}
              sizes="96px"
              alt={partner.name}
              fetchPriority="high"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-24 h-24 rounded-2xl object-cover border-2 border-background ring-1 ring-primary/30 shadow-[0_14px_40px_-12px_hsl(var(--primary)/0.6)]"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-primary/15 flex items-center justify-center text-3xl font-display font-bold text-primary border-2 border-background ring-1 ring-primary/30 shadow-[0_14px_40px_-12px_hsl(var(--primary)/0.6)]">
              {partner.name[0]}
            </div>
          )}
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-1.5">
              <h1 className="font-display font-extrabold text-[22px] leading-tight text-foreground truncate">
                {partner.name}
              </h1>
              {partner.verified_partner && <BadgeCheck className="w-5 h-5 text-accent shrink-0" />}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <span className="text-[11px] font-bold text-primary uppercase tracking-wide">{partner.type}</span>
              {partner.neighborhood && (
                <span className="text-[11px] text-muted-foreground">· {partner.neighborhood}</span>
              )}
              {isTopWeek && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
                  <Flame className="w-2.5 h-2.5" /> Top
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
              {typeof (partner as any).instagram_followers_count === "number" && (partner as any).instagram_followers_count > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Instagram className="w-3 h-3" /> {Number((partner as any).instagram_followers_count).toLocaleString("pt-BR")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 🏆 Premiações Roxou (badges) */}
        {partnerAwards.length > 0 && (
          <div className="relative z-10 px-4 pb-3 flex flex-wrap gap-2">
            {partnerAwards.map((aw) => (
              <Link
                key={aw.id}
                to="/bar-do-mes"
                className="group inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-gradient-to-r from-amber-500/15 via-amber-400/15 to-amber-500/10 px-3 py-1.5 text-[11px] font-bold text-amber-200 hover:from-amber-500/25 hover:to-amber-500/15 transition shadow-[0_8px_24px_-10px_rgba(251,191,36,0.5)]"
              >
                <span aria-hidden className="text-base leading-none">🏆</span>
                <span className="leading-tight">
                  {aw.title}
                  {aw.month && aw.year && (
                    <span className="block text-[9px] font-semibold uppercase tracking-wider text-amber-200/80">
                      {formatAwardPeriod(aw.month, aw.year)}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Bio + tags premium — colado ao hero, ainda dentro da capa */}
        <div className="relative z-10 px-4 pb-4 space-y-3">
          <p className="text-[13px] text-foreground/85 leading-relaxed">
            {buildPartnerRichDescription(partner as any)}
          </p>

          {Array.isArray((partner as any).aura_partner_tags) && (partner as any).aura_partner_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {((partner as any).aura_partner_tags as string[]).slice(0, 6).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-bold text-foreground/90 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-full px-2.5 py-0.5 capitalize backdrop-blur-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* CTAs principais — primeira dobra. Grid 2x2 premium */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                onClick={() => {
                  try {
                    trackEvent({
                      event_type: "maps_click",
                      venue_id: partner.id,
                      city: partner.city || null,
                      category: partner.type || null,
                      metadata: { slug: partner.slug, name: partner.name, target_url: mapsUrl, channel: "maps", address: partner.address },
                    });
                  } catch {}
                }}
                className="flex items-center justify-center gap-2 rounded-2xl gradient-primary text-primary-foreground px-3 py-3 text-[12px] font-bold neon-glow active:scale-[0.98] transition-transform">
                <Navigation className="w-4 h-4" /> Como Chegar
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
                      metadata: { slug: partner.slug, name: partner.name, target_url: instagramUrl, channel: "instagram" },
                    });
                  } catch {}
                  import("@/lib/ga").then(m => m.trackPartnerClick(partner.id, partner.name));
                }}
                className="flex items-center justify-center gap-2 rounded-2xl v3-glass border border-primary/30 px-3 py-3 text-[12px] font-bold text-foreground active:scale-[0.98] transition-transform">
                <Instagram className="w-4 h-4 text-primary" /> Instagram
              </a>
            )}
            {user ? (
              <button
                onClick={() => toggleFollow(partner.id)}
                className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-[12px] font-bold transition-all ${
                  followed
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "v3-glass border border-border/50 text-foreground hover:border-primary/40"
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${followed ? "fill-primary text-primary" : "text-primary"}`} />
                {followed ? "Seguindo" : "Seguir"}
              </button>
            ) : whatsappUrl ? (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                onClick={() => {
                  try {
                    trackEvent({
                      event_type: "whatsapp_click",
                      venue_id: partner.id,
                      city: partner.city || null,
                      category: partner.type || null,
                      metadata: { slug: partner.slug, name: partner.name, target_url: whatsappUrl, channel: "whatsapp" },
                    });
                  } catch {}
                  import("@/lib/ga").then(m => m.trackPartnerClick(partner.id, partner.name));
                }}
                className="flex items-center justify-center gap-2 rounded-2xl v3-glass border border-border/50 px-3 py-2.5 text-[12px] font-bold text-foreground">
                <MessageCircle className="w-3.5 h-3.5 text-primary" /> Reservar
              </a>
            ) : (
              <button
                onClick={() => sharePartner(partner)}
                className="flex items-center justify-center gap-2 rounded-2xl v3-glass border border-border/50 px-3 py-2.5 text-[12px] font-bold text-foreground">
                <Share2 className="w-3.5 h-3.5 text-primary" /> Compartilhar
              </button>
            )}
            <button
              onClick={() => sharePartner(partner)}
              aria-label="Compartilhar"
              className="flex items-center justify-center gap-2 rounded-2xl v3-glass border border-border/50 px-3 py-2.5 text-[12px] font-bold text-foreground hover:border-primary/40 transition-all"
            >
              <Share2 className="w-3.5 h-3.5 text-primary" /> Compartilhar
            </button>
          </div>
        </div>
      </section>

      <div className="px-4 space-y-4 mt-4">
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
                  dateTime={e.date_time} venueName={e.venue_name} category={e.category}
                  ticketUrl={(e as any).ticket_url} transportEnabled={Boolean((e as any).transport_reservation_enabled)} />
              ))}
            </div>
          </div>
        )}

        {/* Instagram Feed — posts reais sincronizados (partners.instagram_recent_posts) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Instagram className="w-4 h-4 text-primary" />
            <h2 className="font-display font-bold text-base text-foreground">Últimos posts</h2>
          </div>
          <PartnerInstagramFeed
            handle={partner.instagram}
            posts={(partner as any).instagram_recent_posts}
            profilePictureUrl={(partner as any).instagram_profile_picture_url}
            followersCount={(partner as any).instagram_followers_count}
            lastSyncAt={(partner as any).instagram_last_sync_at}
          />
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
            to={`/local/${p.slug}`}
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
