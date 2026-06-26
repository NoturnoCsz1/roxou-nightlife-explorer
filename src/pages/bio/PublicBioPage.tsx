/**
 * PublicBioPage — bio.roxou.com.br/:slug e fallback /bio/:slug
 *
 * Renderiza a Smart Bio Roxou. Reaproveita módulos existentes
 * (events/reservations/vip/transport) apenas para apresentação.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackBioEvent } from "@/lib/bioAnalytics";
import { getBioBySlug, listLinksByBio, type BioLink, type BioProfile } from "@/services/bio";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Instagram,
  MapPin,
  MessageCircle,
  Calendar,
  Utensils,
  Crown,
  Bus,
  Globe,
  ExternalLink,
  Music2,
  Youtube,
} from "lucide-react";

interface BioContext {
  upcomingEvents: Array<{ id: string; slug: string; title: string; date_time: string; cover_url: string | null }>;
  hasReservations: boolean;
  hasVip: boolean;
  hasTransport: boolean;
}

async function loadContext(bio: BioProfile): Promise<BioContext> {
  const ctx: BioContext = { upcomingEvents: [], hasReservations: false, hasVip: false, hasTransport: false };
  if (!bio.partner_id) return ctx;

  const nowIso = new Date().toISOString();
  const [evs, reservs, vip, exc] = await Promise.all([
    bio.show_events
      ? supabase
          .from("events")
          .select("id, slug, title, date_time, image_url")
          .eq("partner_id", bio.partner_id)
          .eq("status", "published")
          .gte("date_time", nowIso)
          .order("date_time", { ascending: true })
          .limit(3)
      : Promise.resolve({ data: [], error: null } as never),
    bio.show_reservations
      ? supabase
          .from("partner_reservation_settings")
          .select("id")
          .eq("partner_id", bio.partner_id)
          .eq("reservations_enabled", true)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as never),
    bio.show_vip
      ? supabase
          .from("partner_vip_lists")
          .select("id, public_slug")
          .eq("partner_id", bio.partner_id)
          .eq("public_enabled", true)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as never),
    bio.show_transport
      ? supabase
          .from("excursion_trips")
          .select("id")
          .eq("partner_id", bio.partner_id)
          .gte("departure_at", nowIso)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as never),
  ]);

  ctx.upcomingEvents = ((evs.data as unknown as Array<{ id: string; slug: string; title: string; date_time: string; image_url: string | null }>) ?? []).map((e) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    date_time: e.date_time,
    cover_url: e.image_url,
  }));

  ctx.hasReservations = Boolean(reservs.data);
  ctx.hasVip = Boolean(vip.data);
  ctx.hasTransport = Boolean(exc.data);
  return ctx;
}

function CardButton({
  icon: Icon,
  title,
  subtitle,
  onClick,
  href,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  href?: string;
  accent?: string;
}) {
  const cls =
    "w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 flex items-center gap-4 hover:bg-white/10 active:scale-[0.99] transition-all";
  const inner = (
    <>
      <div
        className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: accent ?? "rgba(168,85,247,0.2)" }}
      >
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="text-white font-semibold truncate">{title}</div>
        {subtitle && <div className="text-white/60 text-xs truncate">{subtitle}</div>}
      </div>
      <ExternalLink className="h-4 w-4 text-white/40 shrink-0" />
    </>
  );
  if (href) {
    const isExternal = /^https?:/i.test(href);
    return isExternal ? (
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={cls}>
        {inner}
      </a>
    ) : (
      <Link to={href} onClick={onClick} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

export default function PublicBioPage() {
  const { slug } = useParams<{ slug: string }>();
  const [bio, setBio] = useState<BioProfile | null>(null);
  const [links, setLinks] = useState<BioLink[]>([]);
  const [ctx, setCtx] = useState<BioContext>({ upcomingEvents: [], hasReservations: false, hasVip: false, hasTransport: false });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        if (!slug) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        if (import.meta.env.DEV) console.warn("[Bio] fetching slug:", slug);
        const b = await getBioBySlug(slug);
        if (cancelled) return;
        if (import.meta.env.DEV) console.warn("[Bio] result:", b ? { id: b.id, slug: b.slug } : null);
        if (!b) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setBio(b);
        const [lnks, c] = await Promise.all([listLinksByBio(b.id, true), loadContext(b)]);
        if (cancelled) return;
        setLinks(lnks.filter((l) => {
          const now = Date.now();
          if (l.starts_at && new Date(l.starts_at).getTime() > now) return false;
          if (l.ends_at && new Date(l.ends_at).getTime() < now) return false;
          return true;
        }));
        setCtx(c);
        trackBioEvent({ bio_id: b.id, event_type: "bio_view" });
      } catch (err) {
        if (import.meta.env.DEV) console.warn("[Bio] error:", (err as Error)?.message);
        setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const whatsAppHref = useMemo(() => {
    if (!bio?.whatsapp) return null;
    const phone = bio.whatsapp.replace(/\D/g, "");
    const text = encodeURIComponent("Olá! Vim pela Roxou Bio e gostaria de mais informações.");
    return `https://wa.me/${phone}?text=${text}`;
  }, [bio]);

  const mapsHref = useMemo(() => {
    if (!bio) return null;
    if (bio.lat && bio.lng) return `https://www.google.com/maps?q=${bio.lat},${bio.lng}`;
    if (bio.address) return `https://www.google.com/maps/search/${encodeURIComponent(bio.address)}`;
    return null;
  }, [bio]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#1a0b2e] via-[#0d0518] to-black px-4 pt-8 pb-16">
        <div className="max-w-md mx-auto space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl bg-white/5" />
          <Skeleton className="h-20 w-full rounded-2xl bg-white/5" />
          <Skeleton className="h-16 w-full rounded-2xl bg-white/5" />
          <Skeleton className="h-16 w-full rounded-2xl bg-white/5" />
        </div>
      </main>
    );
  }

  if (notFound || !bio) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-2xl font-bold mb-2">Bio não encontrada</h1>
          <p className="text-white/60 mb-6">Esta página pode estar inativa ou o link está incorreto.</p>
          <Link
            to="/"
            className="inline-block rounded-xl px-5 py-3 font-semibold text-white"
            style={{ background: "linear-gradient(90deg,#a855f7,#ec4899)" }}
          >
            Voltar para Roxou
          </Link>
        </div>
      </main>
    );
  }

  const slugSafe = bio.slug;

  return (
    <main
      className="min-h-screen text-white pb-16"
      style={{
        background:
          "linear-gradient(180deg, #1a0b2e 0%, #0d0518 60%, #000 100%)",
      }}
    >
      {/* Capa */}
      <div className="relative w-full h-44 sm:h-56 overflow-hidden">
        {bio.cover_url ? (
          <img src={bio.cover_url} alt="" className="w-full h-full object-cover opacity-80" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-700/40 to-fuchsia-900/40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0d0518]" />
      </div>

      <div className="max-w-md mx-auto px-4 -mt-12 relative">
        {/* Avatar */}
        <div className="flex flex-col items-center text-center">
          <div className="h-24 w-24 rounded-full overflow-hidden ring-4 ring-[#0d0518] bg-white/10">
            {bio.avatar_url ? (
              <img src={bio.avatar_url} alt={bio.display_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold">
                {bio.display_name.slice(0, 1)}
              </div>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-bold">{bio.display_name}</h1>
          {bio.headline && <p className="text-white/80 text-sm mt-1">{bio.headline}</p>}
          {(bio.address || bio.city) && (
            <p className="text-white/50 text-xs mt-1 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {bio.address ?? bio.city}
            </p>
          )}

          {/* Socials */}
          <div className="flex items-center gap-3 mt-4">
            {bio.instagram && (
              <a
                href={bio.instagram.startsWith("http") ? bio.instagram : `https://instagram.com/${bio.instagram.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackBioEvent({ bio_id: bio.id, event_type: "social_click", metadata: { network: "instagram" } })}
                className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
              >
                <Instagram className="h-5 w-5" />
              </a>
            )}
            {bio.tiktok && (
              <a
                href={bio.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackBioEvent({ bio_id: bio.id, event_type: "social_click", metadata: { network: "tiktok" } })}
                className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
              >
                <Music2 className="h-5 w-5" />
              </a>
            )}
            {bio.youtube && (
              <a
                href={bio.youtube}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackBioEvent({ bio_id: bio.id, event_type: "social_click", metadata: { network: "youtube" } })}
                className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
              >
                <Youtube className="h-5 w-5" />
              </a>
            )}
            {bio.website && (
              <a
                href={bio.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackBioEvent({ bio_id: bio.id, event_type: "social_click", metadata: { network: "website" } })}
                className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
              >
                <Globe className="h-5 w-5" />
              </a>
            )}
          </div>
        </div>

        {/* CTA principal */}
        {bio.primary_cta_label && bio.primary_cta_url && (
          <a
            href={bio.primary_cta_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackBioEvent({ bio_id: bio.id, event_type: "link_click", metadata: { primary: true } })}
            className="block mt-6 rounded-2xl py-4 text-center font-bold text-white"
            style={{ background: bio.accent_color ?? "linear-gradient(90deg,#a855f7,#ec4899)" }}
          >
            {bio.primary_cta_label}
          </a>
        )}

        {/* Cards inteligentes */}
        <div className="mt-6 space-y-3">
          {bio.show_menu && (
            <CardButton
              icon={Utensils}
              title="Cardápio"
              subtitle="Ver itens e preços"
              href={`/bio/${slugSafe}/menu`}
              onClick={() => trackBioEvent({ bio_id: bio.id, event_type: "menu_view" })}
            />
          )}

          {whatsAppHref && (
            <CardButton
              icon={MessageCircle}
              title="Falar no WhatsApp"
              subtitle="Resposta rápida"
              href={whatsAppHref}
              accent="rgba(37,211,102,0.25)"
              onClick={() => trackBioEvent({ bio_id: bio.id, event_type: "whatsapp_click" })}
            />
          )}

          {ctx.upcomingEvents.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4" />
                <span className="font-semibold">Próximos eventos</span>
              </div>
              <div className="space-y-2">
                {ctx.upcomingEvents.map((e) => (
                  <Link
                    key={e.id}
                    to={`/evento/${e.slug}`}
                    onClick={() => trackBioEvent({ bio_id: bio.id, event_type: "link_click", metadata: { kind: "event", event_id: e.id } })}
                    className="flex items-center gap-3 rounded-xl bg-white/5 hover:bg-white/10 p-2"
                  >
                    {e.cover_url && (
                      <img src={e.cover_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{e.title}</div>
                      <div className="text-xs text-white/50">{new Date(e.date_time).toLocaleDateString("pt-BR")}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {ctx.hasReservations && bio.partner_id && (
            <CardButton
              icon={Calendar}
              title="Reservar mesa"
              subtitle="Garanta o seu lugar"
              href={`/${slugSafe}/reservas`}
              onClick={() => trackBioEvent({ bio_id: bio.id, event_type: "reservation_click" })}
            />
          )}

          {ctx.hasVip && (
            <CardButton
              icon={Crown}
              title="Lista VIP"
              subtitle="Entre na lista"
              href={`/${slugSafe}/vip`}
              accent="rgba(234,179,8,0.25)"
              onClick={() => trackBioEvent({ bio_id: bio.id, event_type: "vip_click" })}
            />
          )}

          {ctx.hasTransport && (
            <CardButton
              icon={Bus}
              title="Transportes & Excursões"
              subtitle="Como chegar"
              href="/transportes"
              onClick={() => trackBioEvent({ bio_id: bio.id, event_type: "transport_click" })}
            />
          )}

          {mapsHref && (
            <CardButton
              icon={MapPin}
              title="Como chegar"
              subtitle={bio.address ?? bio.city ?? "Abrir no Google Maps"}
              href={mapsHref}
              onClick={() => trackBioEvent({ bio_id: bio.id, event_type: "map_click" })}
            />
          )}

          {/* Custom links */}
          {links.map((l) => (
            <CardButton
              key={l.id}
              icon={ExternalLink}
              title={l.title}
              subtitle={l.description ?? undefined}
              href={l.url}
              onClick={() =>
                trackBioEvent({ bio_id: bio.id, event_type: "link_click", link_id: l.id, metadata: { kind: "custom" } })
              }
            />
          ))}
        </div>

        {bio.bio && (
          <p className="mt-8 text-center text-white/60 text-sm whitespace-pre-line">{bio.bio}</p>
        )}

        <div className="mt-10 text-center text-white/30 text-xs">
          Powered by <Link to="/" className="underline">Roxou</Link>
        </div>
      </div>
    </main>
  );
}
