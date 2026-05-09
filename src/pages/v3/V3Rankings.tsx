import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Eye, Heart, CalendarDays, ArrowRight, Trophy, MessageCircle } from "lucide-react";
import SEO from "@/components/SEO";
import { trackEvent } from "@/lib/analytics";
import { buildAuraVenueRankings, type RankingBadge } from "@/lib/auraVenueRankings";
import { ADMIN_PARTNER_TYPE_OPTIONS } from "@/lib/categoryConfig";
import { optimizedImageUrl, optimizedSrcSet } from "@/lib/imageOptimizer";

const CITY_FILTER = "Presidente Prudente";
const PARTNER_LIMIT = 80;
const PER_RANK_LIMIT = 5;
const PAGE_VIEW_DAYS = 7;

type Partner = {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  city: string | null;
  logo_url: string | null;
  short_description: string | null;
  full_description: string | null;
  verified_partner: boolean;
};

type EventLite = {
  partner_id: string | null;
  date_time: string | null;
  category: string | null;
  sub_category: string | null;
  title: string | null;
};

interface RankedPartner {
  partner: Partner;
  badges: RankingBadge[];
  viewCount: number;
  followerCount: number;
  futureEvents: number;
}

interface RankingSection {
  key: string;
  label: string;
  emoji: string;
  filter: (rp: RankedPartner) => boolean;
  sort: (a: RankedPartner, b: RankedPartner) => number;
}

const SECTIONS: RankingSection[] = [
  {
    key: "trending_today",
    label: "Em alta hoje",
    emoji: "🔥",
    filter: (rp) => rp.badges.some((b) => b.type === "trending_today"),
    sort: (a, b) => b.viewCount - a.viewCount,
  },
  {
    key: "top_week",
    label: "Top da semana",
    emoji: "🏆",
    filter: (rp) => rp.badges.some((b) => b.type === "top_week") || rp.viewCount >= 50,
    sort: (a, b) => b.viewCount - a.viewCount,
  },
  {
    key: "university",
    label: "Favoritos universitários",
    emoji: "🎓",
    filter: (rp) => rp.badges.some((b) => b.type === "university"),
    sort: (a, b) => b.followerCount - a.followerCount,
  },
  {
    key: "premium",
    label: "Premium da semana",
    emoji: "💎",
    filter: (rp) => rp.badges.some((b) => b.type === "premium"),
    sort: (a, b) => b.viewCount - a.viewCount,
  },
  {
    key: "live_music",
    label: "Música ao vivo",
    emoji: "🎶",
    filter: (rp) => rp.badges.some((b) => b.type === "live_music"),
    sort: (a, b) => b.futureEvents - a.futureEvents,
  },
  {
    key: "best_value",
    label: "Melhor custo-benefício",
    emoji: "🍻",
    filter: (rp) => rp.badges.some((b) => b.type === "best_value"),
    sort: (a, b) => b.viewCount - a.viewCount,
  },
];

const typeLabel = (t: string | null) =>
  ADMIN_PARTNER_TYPE_OPTIONS.find((o) => o.value === (t || ""))?.label ?? (t || "Local");

export default function V3Rankings() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [events, setEvents] = useState<EventLite[]>([]);
  const [viewByPartner, setViewByPartner] = useState<Record<string, number>>({});
  const [followByPartner, setFollowByPartner] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1) Parceiros ativos da cidade principal
      const { data: pData } = await supabase
        .from("partners")
        .select("id,name,slug,type,city,logo_url,short_description,full_description,verified_partner")
        .eq("active", true)
        .eq("city", CITY_FILTER)
        .order("verified_partner", { ascending: false })
        .limit(PARTNER_LIMIT);
      const ps = (pData as Partner[]) || [];
      if (cancelled) return;
      setPartners(ps);

      const ids = ps.map((p) => p.id);
      if (ids.length === 0) {
        setLoading(false);
        return;
      }

      // 2) Eventos futuros desses parceiros (light fields)
      const nowIso = new Date().toISOString();
      const { data: eData } = await supabase
        .from("events")
        .select("partner_id,date_time,category,sub_category,title")
        .eq("status", "published")
        .in("partner_id", ids)
        .gte("date_time", nowIso)
        .order("date_time", { ascending: true })
        .limit(500);
      if (cancelled) return;
      setEvents((eData as EventLite[]) || []);

      // 3) Page views (últimos 7 dias) — agregação client-side leve
      const since = new Date(Date.now() - PAGE_VIEW_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { data: vData } = await supabase
        .from("page_views")
        .select("partner_id")
        .in("partner_id", ids)
        .gte("created_at", since)
        .limit(5000);
      const vCount: Record<string, number> = {};
      for (const row of (vData as { partner_id: string | null }[]) || []) {
        if (row.partner_id) vCount[row.partner_id] = (vCount[row.partner_id] || 0) + 1;
      }
      if (cancelled) return;
      setViewByPartner(vCount);

      // 4) Seguidores
      const { data: fData } = await supabase
        .from("saved_partners")
        .select("partner_id")
        .in("partner_id", ids)
        .limit(5000);
      const fCount: Record<string, number> = {};
      for (const row of (fData as { partner_id: string }[]) || []) {
        if (row.partner_id) fCount[row.partner_id] = (fCount[row.partner_id] || 0) + 1;
      }
      if (cancelled) return;
      setFollowByPartner(fCount);

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ranked: RankedPartner[] = useMemo(() => {
    const evByPartner = new Map<string, EventLite[]>();
    for (const e of events) {
      if (!e.partner_id) continue;
      const arr = evByPartner.get(e.partner_id) || [];
      arr.push(e);
      evByPartner.set(e.partner_id, arr);
    }
    return partners.map((p) => {
      const evs = evByPartner.get(p.id) || [];
      const viewCount = viewByPartner[p.id] || 0;
      const followerCount = followByPartner[p.id] || 0;
      const badges = buildAuraVenueRankings({
        partner: {
          type: p.type,
          short_description: p.short_description,
          full_description: p.full_description,
          verified_partner: p.verified_partner,
        },
        events: evs,
        viewCount,
        followerCount,
      });
      return { partner: p, badges, viewCount, followerCount, futureEvents: evs.length };
    });
  }, [partners, events, viewByPartner, followByPartner]);

  const sections = useMemo(
    () =>
      SECTIONS.map((s) => ({
        ...s,
        items: ranked.filter(s.filter).sort(s.sort).slice(0, PER_RANK_LIMIT),
      })).filter((s) => s.items.length > 0),
    [ranked],
  );

  const jsonLd = useMemo(() => {
    const all = sections.flatMap((s) => s.items.map((i) => i.partner));
    const seen = new Set<string>();
    const unique = all.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Rankings Roxou — Presidente Prudente",
      itemListElement: unique.slice(0, 20).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://roxou.com.br/local/${p.slug}`,
        name: p.name,
      })),
    };
  }, [sections]);

  return (
    <div className="v3-theme min-h-screen text-foreground">
      <SEO
        title="Rankings Roxou: bares, baladas e eventos em Presidente Prudente"
        description="Veja os locais em alta, bares mais acessados, música ao vivo, universitários e destaques da noite em Presidente Prudente."
        canonical="https://roxou.com.br/rankings"
        keywords="rankings bares Presidente Prudente, baladas em alta, melhores locais Presidente Prudente, música ao vivo"
        jsonLd={jsonLd}
      />

      {/* Hero */}
      <section className="px-4 pt-6 pb-3 max-w-7xl mx-auto">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          <Trophy className="h-3 w-3" /> Rankings Roxou
        </div>
        <h1 className="mt-2 font-display text-2xl md:text-3xl font-black leading-tight">
          Os locais que <span className="text-primary v3-neon-text">dominam a noite</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">
          Rankings automáticos da Roxou em Presidente Prudente. Em alta hoje, top da semana,
          favoritos universitários, premium, música ao vivo e melhor custo-benefício.
        </p>
      </section>

      {loading && (
        <div className="px-4 max-w-7xl mx-auto">
          <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 text-center text-sm text-muted-foreground">
            Carregando rankings…
          </div>
        </div>
      )}

      {!loading && sections.length === 0 && (
        <div className="px-4 max-w-7xl mx-auto">
          <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 text-center text-sm text-muted-foreground">
            Sem rankings disponíveis no momento. Volte em breve!
          </div>
        </div>
      )}

      {!loading &&
        sections.map((section) => (
          <section key={section.key} className="px-4 mb-6 max-w-7xl mx-auto">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-display font-black text-lg flex items-center gap-2">
                <span aria-hidden>{section.emoji}</span>
                {section.label}
              </h2>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Top {section.items.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {section.items.map((rp, idx) => (
                <RankCard
                  key={rp.partner.id}
                  rp={rp}
                  position={idx + 1}
                  rankingType={section.key}
                />
              ))}
            </div>
          </section>
        ))}

      {/* CTA Comercial */}
      <section className="px-4 my-8 max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-5 md:p-6 shadow-[0_0_40px_-12px_hsl(var(--v3-neon)/0.5)]">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl"
          />
          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" /> Para parceiros
              </div>
              <h3 className="mt-2 font-display font-black text-lg md:text-xl">
                Quer seu local em destaque na Roxou?
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                Apareça nos rankings, conquiste mais frequentadores e receba selos de destaque na sua página.
              </p>
            </div>
            <Link
              to="/contato"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_0_30px_-8px_hsl(var(--v3-neon)/0.7)] hover:opacity-90 transition shrink-0"
            >
              <MessageCircle className="h-4 w-4" /> Falar com a Roxou
            </Link>
          </div>
        </div>
      </section>

      <p className="px-4 pb-10 max-w-7xl mx-auto text-[10px] text-muted-foreground leading-snug">
        Rankings gerados automaticamente pela Aura com base em visualizações, seguidores e atividade do local.
        Podem evoluir a cada hora.
      </p>
    </div>
  );
}

// =============== Card ===============

function RankCard({
  rp,
  position,
  rankingType,
}: {
  rp: RankedPartner;
  position: number;
  rankingType: string;
}) {
  const { partner } = rp;
  const handleClick = () => {
    try {
      trackEvent({
        event_type: "venue_view",
        venue_id: partner.id,
        source_page: "rankings",
        city: partner.city || null,
        category: partner.type || null,
        metadata: {
          ranking_type: rankingType,
          partner_name: partner.name,
          position,
          channel: "rankings",
        },
      });
    } catch {}
  };

  return (
    <Link
      to={`/local/${partner.slug}`}
      onClick={handleClick}
      className="group relative flex gap-3 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-3 hover:border-primary/40 hover:shadow-[0_0_24px_-8px_hsl(var(--v3-neon)/0.5)] transition-all"
    >
      <div className="absolute -top-2 -left-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-black text-primary-foreground shadow-md">
        {position}
      </div>

      <div className="h-16 w-16 flex-none rounded-xl bg-card ring-1 ring-border/40 overflow-hidden flex items-center justify-center">
        {partner.logo_url ? (
          <img
            src={optimizedImageUrl(partner.logo_url, 192, 75) || partner.logo_url}
            srcSet={optimizedSrcSet(partner.logo_url, [96, 192, 288], 75)}
            sizes="64px"
            alt={partner.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xl font-black text-primary">{partner.name[0]}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-primary font-semibold truncate">
          {typeLabel(partner.type)} {partner.city ? `· ${partner.city}` : ""}
        </p>
        <h3 className="font-display font-bold text-sm text-foreground truncate group-hover:text-primary transition">
          {partner.name}
        </h3>
        {partner.short_description && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
            {partner.short_description}
          </p>
        )}

        {rp.badges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {rp.badges.slice(0, 2).map((b) => (
              <span
                key={b.type}
                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary"
              >
                <span aria-hidden>{b.emoji}</span>
                {b.label}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3 w-3" /> {rp.viewCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3 w-3" /> {rp.followerCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" /> {rp.futureEvents}
          </span>
          <span className="ml-auto inline-flex items-center gap-0.5 text-primary font-semibold">
            Ver local <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
