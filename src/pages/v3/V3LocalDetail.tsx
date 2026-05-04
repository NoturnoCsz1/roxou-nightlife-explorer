import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin, Instagram, MessageCircle, BadgeCheck, Image, CalendarDays, Eye, Heart, Clock, Navigation } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSavedPartners } from "@/hooks/useSavedPartners";
import EventCardV3 from "@/components/v3/EventCardV3";

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

  return (
    <div className="pb-8">
      {/* Header — refined composition */}
      <div className="relative h-[210px] bg-gradient-to-br from-primary/15 via-primary/5 to-accent/8 flex items-end">
        <Link to="/" className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center z-10">
          <ArrowLeft className="w-4 h-4 text-white" />
        </Link>
        <div className="px-4 pb-4 flex items-end gap-3.5 w-full">
          {partner.logo_url ? (
            <img src={partner.logo_url} alt={partner.name} className="w-[68px] h-[68px] rounded-xl object-cover border-2 border-background shadow-lg" />
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
            <span className="text-[11px] text-primary font-medium capitalize">{partner.type}</span>
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
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl v3-glass px-2 py-3 text-center text-[10px] font-bold text-foreground border border-border/40 hover:border-primary/40 v3-neon-hover transition-all">
              <Navigation className="w-4 h-4 text-primary" /> Como Chegar
            </a>
          )}
          {instagramUrl && (
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer"
              onClick={() => import("@/lib/ga").then(m => m.trackPartnerClick(partner.id, partner.name))}
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl v3-glass px-2 py-3 text-center text-[10px] font-bold text-foreground border border-border/40 hover:border-primary/40 v3-neon-hover transition-all">
              <Instagram className="w-4 h-4 text-primary" /> Instagram
            </a>
          )}
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              onClick={() => import("@/lib/ga").then(m => m.trackPartnerClick(partner.id, partner.name))}
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
        </div>

        {partner.address && (
          <a href={mapsUrl || "#"}
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
      </div>
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
              <img src={post.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
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
