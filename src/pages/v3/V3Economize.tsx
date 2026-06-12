import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Beer, Car, ExternalLink, Flame, GraduationCap,
  PartyPopper, PiggyBank, Sparkles, Ticket, Trophy, Zap, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStartOfTodaySP, getEndOfTodaySP } from "@/lib/dateUtils";
import { estimateSavings, tierColor, type SavingsResult } from "@/lib/economizeScore";

interface EventRow {
  id: string; title: string; slug: string;
  description: string | null; date_time: string;
  venue_name: string | null; image_url: string | null;
  category: string | null; sub_category: string | null;
  is_sports_transmission: boolean; partner_id: string | null;
}

interface PromoRow {
  id: string; title: string; description: string | null;
  offer_text: string | null; affiliate_url: string | null;
  image_url: string | null; featured: boolean;
  partners?: { name: string; slug: string; logo_url: string | null } | null;
}

interface MatchVenueJoin {
  id: string;
  match: { id: string; slug: string; home_team: string; away_team: string; match_date: string } | null;
  venue: { id: string; name: string; slug: string; logo_url: string | null } | null;
}

const FREE_TOKENS = ["grátis", "gratis", "gratuito", "free", "entrada franca", "entrada livre", "cortesia", "sem couvert"];
const HAPPY_TOKENS = ["happy hour", "chopp r$", "dobradinha", "2x1", "2 x 1", "duas por uma", "combo"];

export default function V3Economize() {
  const startToday = getStartOfTodaySP();
  const endToday = getEndOfTodaySP();
  const nowIso = new Date().toISOString();

  // 1. Eventos de hoje (base para Economias, Happy Hour, Gratuitos)
  const { data: todayEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["economize-events-today", startToday, endToday],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id,title,slug,description,date_time,venue_name,image_url,category,sub_category,is_sports_transmission,partner_id")
        .eq("status", "published")
        .gte("date_time", startToday)
        .lt("date_time", endToday)
        .order("date_time", { ascending: true });
      return (data || []) as EventRow[];
    },
  });

  // 2. Promoções ativas (promotion_opportunities)
  const { data: promos = [] } = useQuery({
    queryKey: ["economize-promos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("promotion_opportunities")
        .select("id,title,description,offer_text,affiliate_url,image_url,featured,partners(name,slug,logo_url)")
        .eq("status", "active")
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20);
      return (data || []) as unknown as PromoRow[];
    },
  });

  // 3. Jogos de hoje com locais que transmitem
  const { data: sportsVenues = [] } = useQuery({
    queryKey: ["economize-sports-today", startToday, endToday],
    queryFn: async () => {
      const { data } = await supabase
        .from("sports_match_venues")
        .select("id, match:sports_matches!inner(id,slug,home_team,away_team,match_date,status), venue:partners(id,name,slug,logo_url)")
        .eq("confirmed_by_admin", true)
        .gte("match.match_date", startToday)
        .lt("match.match_date", endToday)
        .order("is_featured", { ascending: false })
        .limit(20);
      return (data || []) as unknown as MatchVenueJoin[];
    },
  });

  // 4. Parceiros premiados (universitário/estudante) — fallback nice-to-have
  const { data: studentAwards = [] } = useQuery({
    queryKey: ["economize-student-awards"],
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_awards")
        .select("id,title,description,partner_id,partners:partners(name,slug,logo_url)")
        .eq("active", true)
        .or("title.ilike.%estudante%,title.ilike.%universit%,description.ilike.%estudante%,description.ilike.%universit%")
        .limit(8);
      return (data || []) as any[];
    },
  });

  // ===== Derivações =====
  const happyHourEvents = useMemo(() => {
    const nowHour = new Date().getHours();
    return todayEvents
      .filter((e) => {
        const hay = `${e.title} ${e.description ?? ""}`.toLowerCase();
        const isHappy = HAPPY_TOKENS.some((t) => hay.includes(t));
        const startsAround = (() => {
          const d = new Date(e.date_time);
          const h = d.getHours();
          return h >= 16 && h <= 21;
        })();
        const isNow = nowHour >= 16 && nowHour <= 21 && new Date(e.date_time).getTime() <= Date.now() + 60 * 60 * 1000;
        return isHappy || (startsAround && isNow);
      })
      .slice(0, 6);
  }, [todayEvents]);

  const freeEvents = useMemo(() => {
    return todayEvents
      .filter((e) => {
        const hay = `${e.title} ${e.description ?? ""}`.toLowerCase();
        return FREE_TOKENS.some((t) => hay.includes(t));
      })
      .slice(0, 6);
  }, [todayEvents]);

  const todaySavings = useMemo(() => {
    // Combina promos + eventos com sinal de economia hoje
    const fromPromos = promos.map((p) => ({
      kind: "promo" as const,
      id: p.id,
      title: p.offer_text || p.title,
      subtitle: p.partners?.name || p.description?.slice(0, 60),
      image: p.image_url || p.partners?.logo_url,
      href: p.affiliate_url || (p.partners?.slug ? `/local/${p.partners.slug}` : null),
      savings: estimateSavings(`${p.offer_text ?? ""} ${p.title} ${p.description ?? ""}`),
      featured: p.featured,
    }));
    const fromEvents = todayEvents
      .filter((e) => {
        const hay = `${e.title} ${e.description ?? ""}`.toLowerCase();
        return /(r\$|%|grátis|gratis|gratuito|happy hour|2x1|dobradinha|combo|promo|free|cortesia|sem couvert|estudante|universit)/.test(hay);
      })
      .map((e) => ({
        kind: "event" as const,
        id: e.id,
        title: e.title,
        subtitle: e.venue_name,
        image: e.image_url,
        href: `/evento/${e.slug}`,
        savings: estimateSavings(`${e.title} ${e.description ?? ""}`),
        featured: false,
      }));
    return [...fromPromos, ...fromEvents]
      .sort((a, b) => (Number(b.featured) - Number(a.featured)) || (b.savings.amount - a.savings.amount))
      .slice(0, 8);
  }, [promos, todayEvents]);

  const totalEstimated = todaySavings.reduce((sum, s) => sum + s.savings.amount, 0);

  return (
    <div className="px-4 py-4 space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/" className="rounded-full p-2 v3-glass">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-black text-foreground">Economize</h1>
          <p className="text-xs text-muted-foreground">Seu radar de economia real no rolê de Prudente.</p>
        </div>
      </div>

      {/* Hero — Total estimado de hoje */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 v3-glass-strong p-5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-accent/10 to-transparent" />
        <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="h-14 w-14 shrink-0 rounded-2xl bg-primary/20 flex items-center justify-center">
            <PiggyBank className="h-7 w-7 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.8)]" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Hoje você pode economizar</span>
            <p className="font-display text-3xl font-black text-foreground leading-tight">
              R$ {totalEstimated || "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {todaySavings.length} oportunidades ativas em Presidente Prudente
            </p>
          </div>
        </div>
      </div>

      {/* 1. Economias de Hoje */}
      <SectionTitle icon={<Zap className="h-4 w-4 text-primary" />} title="Economias de hoje" subtitle="Promos e ofertas com economia estimada" />
      {loadingEvents && todaySavings.length === 0 ? (
        <SkeletonCards />
      ) : todaySavings.length === 0 ? (
        <EmptyCard message="Nenhuma economia mapeada para hoje ainda." />
      ) : (
        <div className="space-y-3">
          {todaySavings.map((item) => (
            <SavingsCard
              key={`${item.kind}-${item.id}`}
              title={item.title}
              subtitle={item.subtitle ?? undefined}
              image={item.image ?? undefined}
              href={item.href ?? undefined}
              savings={item.savings}
              external={item.kind === "promo" && item.href?.startsWith("http")}
              featured={item.featured}
            />
          ))}
        </div>
      )}

      {/* 2. Happy Hour Agora */}
      <SectionTitle icon={<Beer className="h-4 w-4 text-amber-400" />} title="Happy Hour agora" subtitle="Promoções de bar valendo nas próximas horas" />
      {happyHourEvents.length === 0 ? (
        <EmptyCard message="Sem happy hour rastreado agora. Confira a agenda completa." cta={{ label: "Ver agenda", to: "/agenda" }} />
      ) : (
        <div className="space-y-2">
          {happyHourEvents.map((e) => (
            <SavingsCard
              key={e.id}
              title={e.title}
              subtitle={e.venue_name ?? undefined}
              image={e.image_url ?? undefined}
              href={`/evento/${e.slug}`}
              savings={estimateSavings(`${e.title} ${e.description ?? ""}`, "🍻 Happy Hour")}
            />
          ))}
        </div>
      )}

      {/* 3. Rolês Gratuitos */}
      <SectionTitle icon={<PartyPopper className="h-4 w-4 text-emerald-400" />} title="Rolês gratuitos" subtitle="Hoje em Prudente, sem pagar entrada" />
      {freeEvents.length === 0 ? (
        <EmptyCard message="Hoje sem rolês gratuitos confirmados." cta={{ label: "Procurar na agenda", to: "/agenda" }} />
      ) : (
        <div className="space-y-2">
          {freeEvents.map((e) => (
            <SavingsCard
              key={e.id}
              title={e.title}
              subtitle={e.venue_name ?? undefined}
              image={e.image_url ?? undefined}
              href={`/evento/${e.slug}`}
              savings={{ amount: 25, tier: "media", badges: ["🎉 Gratuito"] }}
            />
          ))}
        </div>
      )}

      {/* 4. Onde assistir jogos sem couvert */}
      <SectionTitle icon={<Trophy className="h-4 w-4 text-blue-400" />} title="Jogos sem couvert" subtitle="Bares parceiros transmitindo hoje" />
      {sportsVenues.length === 0 ? (
        <EmptyCard message="Sem transmissões mapeadas para hoje." cta={{ label: "Ver todos os jogos", to: "/jogos" }} />
      ) : (
        <div className="space-y-2">
          {sportsVenues.map((sv) => {
            if (!sv.match || !sv.venue) return null;
            return (
              <SavingsCard
                key={sv.id}
                title={`${sv.match.home_team} × ${sv.match.away_team}`}
                subtitle={`Transmite no ${sv.venue.name}`}
                image={sv.venue.logo_url ?? undefined}
                href={`/jogo/${sv.match.slug}`}
                savings={{ amount: 20, tier: "baixa", badges: ["⚽ Sem couvert", "🍻 Bar parceiro"] }}
              />
            );
          })}
        </div>
      )}

      {/* 5. Economize no Transporte */}
      <SectionTitle icon={<Car className="h-4 w-4 text-pink-400" />} title="Economize no transporte" subtitle="Caronas e motoristas ROXOU" />
      <Link
        to="/transporte"
        className="group relative block overflow-hidden rounded-3xl v3-glass-strong border border-primary/30 p-5 transition hover:border-primary/60 hover:shadow-[0_0_28px_hsl(var(--v3-neon)/0.3)]"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-accent/10 to-transparent" />
        <div className="relative flex items-start gap-4">
          <div className="h-12 w-12 shrink-0 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Car className="h-6 w-6 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.8)]" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Até 40% mais barato</span>
            <h3 className="mt-1 font-display text-lg font-black text-foreground">Pegue carona ROXOU</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Vá ao rolê com motoristas verificados ou dividindo carona. Tarifa fixa, sem dinâmica.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge>💰 Tarifa fixa</Badge>
              <Badge>🛡️ Verificados</Badge>
              <Badge>👥 Dividir</Badge>
            </div>
            <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-primary">
              Abrir transporte <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </Link>

      {/* 6. Descontos para Universitários */}
      <SectionTitle icon={<GraduationCap className="h-4 w-4 text-violet-400" />} title="Descontos universitários" subtitle="Parceiros com benefício para estudantes" />
      {studentAwards.length === 0 ? (
        <EmptyCard message="Em breve, parceiros com desconto estudante." />
      ) : (
        <div className="space-y-2">
          {studentAwards.map((a: any) => (
            <SavingsCard
              key={a.id}
              title={a.title}
              subtitle={a.partners?.name}
              image={a.partners?.logo_url}
              href={a.partners?.slug ? `/local/${a.partners.slug}` : undefined}
              savings={estimateSavings(`${a.title} ${a.description ?? ""}`, "🎓 Estudante")}
            />
          ))}
        </div>
      )}

      {/* CTA final — virar parceiro */}
      <a
        href="https://wa.me/5518991234567?text=Ol%C3%A1%21%20Quero%20oferecer%20uma%20promo%C3%A7%C3%A3o%20no%20ROXOU."
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/15 via-primary/10 to-background p-5 transition hover:border-accent/60"
      >
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 shrink-0 rounded-2xl bg-accent/20 flex items-center justify-center">
            <Ticket className="h-6 w-6 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-accent">É dono de bar?</span>
            <h3 className="mt-1 font-display text-base font-black text-foreground">Coloque sua promoção aqui</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Universitários de Prudente abrem o Economize todo dia procurando ofertas.
            </p>
          </div>
        </div>
      </a>
    </div>
  );
}

// ===== Subcomponents =====

function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <span className="rounded-lg bg-card/50 border border-border/40 p-1.5">{icon}</span>
      <div>
        <h2 className="font-display text-sm font-black text-foreground">{title}</h2>
        {subtitle && <p className="text-[10.5px] text-muted-foreground leading-tight">{subtitle}</p>}
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-primary/15 border border-primary/30 text-primary">
      {children}
    </span>
  );
}

function SavingsCard({
  title, subtitle, image, href, savings, external, featured,
}: {
  title: string; subtitle?: string; image?: string; href?: string;
  savings: SavingsResult; external?: boolean; featured?: boolean;
}) {
  const Inner = (
    <article className={`rounded-2xl v3-glass border border-border/40 p-3 flex gap-3 transition hover:border-primary/40 ${featured ? "v3-pulse-glow border-primary/50" : ""}`}>
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary flex items-center justify-center">
        {image ? (
          <img src={image} alt={title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <Sparkles className="h-6 w-6 text-muted-foreground/40" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-sm font-black text-foreground line-clamp-2 leading-tight">{title}</h3>
            {subtitle && <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{subtitle}</p>}
          </div>
          <div className={`shrink-0 rounded-xl bg-gradient-to-br ${tierColor(savings.tier)} border px-2 py-1 text-center`}>
            <p className="text-[8px] font-black uppercase opacity-80">Economia</p>
            <p className="font-display text-sm font-black leading-none">R$ {savings.amount}</p>
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {savings.badges.map((b, i) => (
            <span key={i} className="text-[9.5px] font-semibold rounded-full px-1.5 py-0.5 bg-primary/10 border border-primary/25 text-primary">
              {b}
            </span>
          ))}
          {featured && (
            <span className="text-[9.5px] font-semibold rounded-full px-1.5 py-0.5 bg-orange-500/15 border border-orange-500/30 text-orange-300">
              <Flame className="inline h-2.5 w-2.5 -mt-0.5" /> Destaque
            </span>
          )}
        </div>
      </div>
    </article>
  );

  if (!href) return Inner;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {Inner}
      </a>
    );
  }
  return <Link to={href} className="block">{Inner}</Link>;
}

function EmptyCard({ message, cta }: { message: string; cta?: { label: string; to: string } }) {
  return (
    <div className="rounded-2xl v3-glass border border-border/40 p-4 text-center space-y-2">
      <p className="text-xs text-muted-foreground">{message}</p>
      {cta && (
        <Link to={cta.to} className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
          {cta.label} <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

function SkeletonCards() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl v3-skeleton h-20" />
      ))}
    </div>
  );
}
