// ─── HomeCommandCenter — layout principal desktop (coluna larga + sidebar) ───
// Extraído de src/pages/v3/V3Home.tsx (Fase 5). JSX, classes e estilos idênticos.

import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRight, BadgeCheck, CalendarDays, ChevronRight, Crown, Flame, Gem, Sparkles, TrendingUp, Trophy,
} from "lucide-react";
import V3SearchBar from "@/components/v3/V3SearchBar";
import V3VibeChips from "@/components/v3/V3VibeChips";
import SmartImage from "@/components/v3/SmartImage";
import AIHomeWidget from "@/components/v3/AIHomeWidget";
import HomeJogosCard from "@/components/jogos/HomeJogosCard";
import WeeklySpotlight from "@/components/v3/home/WeeklySpotlight";
import FadeSection from "@/components/v3/home/FadeSection";
import { TodayTimeline as TodayTimelineRaw, TodayEmptyState } from "@/components/v3/home/TodayTimeline";

import type { Ev, VenueRank } from "./types";
import { fmtTime, safeEvents } from "./utils";
import { TODAY_KEY } from "./constants";
import { DesktopHeroSection } from "./HomeHero";
import { PremiumEventCard } from "./HomeCuradoria";
import { HomeDataFallback } from "./HomeSkeletons";
import { DesktopCategoriesPanel, DesktopFeaturedPartnersPanel } from "./HomeSidebar";

// Wrapper injetando PremiumEventCard no Timeline (mesma assinatura usada em V3Home antes).
const TodayTimeline = (props: Omit<React.ComponentProps<typeof TodayTimelineRaw>, "Card">) => (
  <TodayTimelineRaw {...props} Card={PremiumEventCard} />
);

export function CommandCenter({
  hero, heroIsToday, heroEvents, heroIdx, setHeroIdx, weeklyHighlight,
  todayEvents, todayCount, trending, featured, weekEvents,
  trendingIdSet, partnerRankMap, venueRanks, featuredPartners, events,
}: {
  hero: Ev | null; heroIsToday: boolean; heroEvents: Ev[];
  heroIdx: number; setHeroIdx: (n: number) => void;
  weeklyHighlight: Ev | null;
  todayEvents: Ev[]; todayCount: number; trending: Ev[]; featured: Ev[]; weekEvents: Ev[];
  trendingIdSet: Set<string>; partnerRankMap: Map<string, number>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  venueRanks: VenueRank[]; featuredPartners: any[]; events: Ev[];
}) {
  void heroIsToday; void todayEvents;
  const excludeIds = new Set<string>();
  const safeToday = safeEvents(todayEvents);
  const safeTrending = safeEvents(trending);
  const safeFeatured = safeEvents(featured);
  const safeWeekEvents = safeEvents(weekEvents);
  safeToday.forEach(e => excludeIds.add(e.id));
  if (hero) excludeIds.add(hero.id);
  if (weeklyHighlight) excludeIds.add(weeklyHighlight.id);
  const mainPool = [...safeTrending, ...safeFeatured, ...safeWeekEvents].filter((e, i, arr) =>
    arr.findIndex(x => x.id === e.id) === i && !excludeIds.has(e.id)
  );
  const seed = TODAY_KEY.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const mainEvents = mainPool
    .map((e, i) => ({ e, k: ((i + 1) * 9301 + seed * 49297) % 233280 }))
    .sort((a, b) => a.k - b.k)
    .map(x => x.e)
    .slice(0, 10);

  if (!safeToday.length && !mainEvents.length && !hero) return <HomeDataFallback />;

  return (
    <div className="max-w-7xl mx-auto">

      {(heroEvents ?? []).length > 0 && (
        <DesktopHeroSection
          heroEvents={heroEvents}
          heroIdx={heroIdx}
          setHeroIdx={setHeroIdx}
          todayCount={todayCount}
          weekEventsCount={safeWeekEvents.length}
          partnerRankMap={partnerRankMap}
        />
      )}

      <div className="grid grid-cols-[1fr_240px] gap-8 px-8 pb-16">

        <section className="min-w-0 space-y-14">

          {/* Busca + Vibe chips */}
          <div className="space-y-3">
            <V3SearchBar
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              events={safeEvents(events) as any}
              fallbackEvent={null}
              placeholder="Buscar evento, local, vibe..."
            />
            <V3VibeChips className="!py-0 -mx-0" />
          </div>

          {/* 🔥 BOMBANDO AGORA */}
          {safeTrending.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary/80">Ao vivo</p>
                    <h2 className="font-display font-extrabold text-2xl text-foreground leading-tight">Bombando agora</h2>
                  </div>
                </div>
                <Link to="/descobrir" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
                  Ver mais <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                {safeTrending.slice(0, 8).map((ev, i) => (
                  <Link
                    key={ev.id}
                    to={`/evento/${ev.slug}`}
                    className="shrink-0 w-[190px] group rounded-2xl overflow-hidden border border-border/20 bg-card/60 hover:border-primary/40 hover:shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.3)] transition-all"
                  >
                    <div className="relative h-[108px] overflow-hidden">
                      <SmartImage
                        src={ev.image_url}
                        alt={ev.title}
                        loading="lazy"
                        wrapperClassName="w-full h-full"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-primary/95 neon-glow">
                        <Flame className="w-2.5 h-2.5 text-primary-foreground" />
                        <span className="text-[9px] font-extrabold text-primary-foreground">#{i + 1}</span>
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="text-[12px] font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">{ev.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">{fmtTime(ev.date_time)} · {ev.venue_name || "—"}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* HOJE EM PRUDENTE */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary/80">Acontecendo agora</p>
                <h2 className="font-display font-extrabold text-2xl text-foreground leading-tight">
                  Hoje em Prudente
                  {safeToday.length > 0 && (
                    <span className="ml-3 px-2.5 py-0.5 rounded-full bg-primary/15 text-sm font-black text-primary align-middle">{safeToday.length}</span>
                  )}
                </h2>
              </div>
              <Link to="/agenda" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
                Ver agenda <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {safeToday.length > 0 ? (
              <TodayTimeline events={safeToday} partnerRankMap={partnerRankMap} trendingIdSet={trendingIdSet} />
            ) : (
              <TodayEmptyState />
            )}
          </div>

          {/* ARENA ROXOU */}
          <div
            className="rounded-3xl overflow-hidden border border-yellow-600/30"
            style={{
              background: "linear-gradient(135deg, #0a0800, #100d00, #0a0800)",
              boxShadow: "0 0 60px -20px rgba(202,138,4,0.45), inset 0 1px 0 rgba(234,179,8,0.1)",
            }}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(202,138,4,0.2)", border: "1px solid rgba(234,179,8,0.35)", boxShadow: "0 0 20px rgba(234,179,8,0.3)" }}
                >
                  <Trophy className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-500/80">Arena Roxou</p>
                  <h2 className="font-display font-extrabold text-2xl text-yellow-50 leading-tight">Jogos ao vivo hoje</h2>
                  <p className="text-[11px] text-yellow-500/55">Copa, Brasileirão e onde assistir em Prudente</p>
                </div>
              </div>
              <Link
                to="/jogos"
                className="inline-flex items-center gap-2 h-9 px-5 rounded-full font-bold text-sm transition-all active:scale-95"
                style={{ background: "rgba(202,138,4,0.2)", border: "1px solid rgba(234,179,8,0.4)", color: "rgb(234,179,8)" }}
              >
                VER TODOS <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <HomeJogosCard />
          </div>

          {/* DESTAQUES DA SEMANA */}
          {safeFeatured.length >= 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-accent" />
                <h2 className="font-display font-extrabold text-2xl text-foreground">Destaques da semana</h2>
              </div>
              <div className="grid grid-cols-[1fr_1fr] gap-4">
                <PremiumEventCard
                  ev={safeFeatured[0]}
                  size="lg"
                  premium
                  isTrending={trendingIdSet.has(safeFeatured[0].id)}
                  partnerRank={safeFeatured[0].partner_id ? partnerRankMap.get(safeFeatured[0].partner_id) : undefined}
                  className="!h-[340px] !min-h-0 !w-full row-span-2"
                />
                <div className="grid grid-cols-2 gap-3">
                  {safeFeatured.slice(1, 5).map(ev => (
                    <PremiumEventCard
                      key={ev.id}
                      ev={ev}
                      size="md"
                      isTrending={trendingIdSet.has(ev.id)}
                      partnerRank={ev.partner_id ? partnerRankMap.get(ev.partner_id) : undefined}
                      className="!h-[160px] !min-h-0 !w-full"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* FINAL DE SEMANA */}
          {(() => {
            const weekendEvs = safeEvents(weekEvents).filter(e => {
              const dow = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short" }).format(new Date(e.date_time));
              return dow === "Fri" || dow === "Sat" || dow === "Sun";
            }).slice(0, 8);
            if (!weekendEvs.length) return null;
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="font-display font-extrabold text-2xl text-foreground">Final de semana</h2>
                  </div>
                  <Link to="/agenda" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
                    Ver tudo <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                  {weekendEvs.map(ev => (
                    <PremiumEventCard
                      key={ev.id}
                      ev={ev}
                      size="md"
                      isTrending={trendingIdSet.has(ev.id)}
                      partnerRank={ev.partner_id ? partnerRankMap.get(ev.partner_id) : undefined}
                      className="shrink-0 !w-[200px] !h-[240px] !min-h-0"
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* AGENDA DA SEMANA */}
          {safeWeekEvents.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  <h2 className="font-display font-extrabold text-2xl text-foreground">Agenda da semana</h2>
                </div>
                <Link to="/agenda" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
                  Ver tudo <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {safeWeekEvents.slice(0, 6).map(ev => (
                  <Link
                    key={ev.id}
                    to={`/evento/${ev.slug}`}
                    className="group flex gap-3 rounded-2xl border border-border/20 bg-card/50 p-3 hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    <div className="flex flex-col items-center justify-center rounded-xl bg-primary/10 border border-primary/15 px-2.5 py-1.5 min-w-[50px]">
                      <span className="text-[9px] font-black uppercase text-primary">{format(new Date(ev.date_time), "MMM", { locale: ptBR })}</span>
                      <span className="text-xl font-black text-foreground leading-none">{format(new Date(ev.date_time), "dd")}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-tight">{ev.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate mt-1">{fmtTime(ev.date_time)} · {ev.venue_name || "—"}</p>
                    </div>
                  </Link>
                ))}
              </div>
              <Link to="/agenda" className="flex items-center justify-center gap-2 w-full h-10 rounded-2xl border border-primary/30 bg-primary/5 text-sm font-bold text-primary hover:bg-primary/10 transition-all">
                Ver agenda completa <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* MAIS ACESSADOS */}
          {venueRanks.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-primary" />
                <h2 className="font-display font-extrabold text-2xl text-foreground">Mais acessados</h2>
                <span className="text-[11px] text-muted-foreground">esta semana em Prudente</span>
              </div>
              <div className="space-y-2">
                {venueRanks.slice(0, 5).map((v, i) => (
                  <Link
                    key={v.id}
                    to={`/local/${v.slug}`}
                    className="group flex items-center gap-4 p-3.5 rounded-2xl border border-border/20 bg-card/50 hover:border-primary/35 hover:bg-primary/5 transition-all"
                  >
                    <span className={`font-display font-black text-xl w-9 text-center shrink-0 ${
                      i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-muted-foreground/50"
                    }`}>
                      {i < 3 ? ["#1","#2","#3"][i] : `#${i+1}`}
                    </span>
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-secondary shrink-0 border border-border/20">
                      {v.logo_url ? (
                        <img src={v.logo_url} alt={v.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-primary">{v.name[0]}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-bold text-foreground truncate group-hover:text-primary transition-colors">{v.name}</p>
                        {v.verified_partner && <BadgeCheck className="w-3.5 h-3.5 text-accent shrink-0" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground capitalize">{v.type} · {v.views} views esta semana</p>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] shrink-0">
                      {v.upcoming_events > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{v.upcoming_events} ev.</span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* DESTAQUE DA SEMANA */}
          {safeEvents(events).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Gem className="w-5 h-5 text-accent" />
                <h2 className="font-display font-extrabold text-2xl text-foreground">Destaque da semana</h2>
              </div>
              <WeeklySpotlight
                ev={weeklyHighlight ?? undefined}
                events={safeEvents(events)}
                partnerAwardIds={new Set(partnerRankMap.keys())}
                FadeSection={FadeSection}
              />
            </div>
          )}

          {/* PRÓXIMOS GRANDES EVENTOS */}
          {mainEvents.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Curadoria Roxou</p>
                  <h2 className="font-display text-2xl font-black text-foreground leading-tight">Próximos grandes eventos</h2>
                </div>
                <Link to="/agenda" className="text-sm font-bold text-primary hover:underline flex items-center gap-1 shrink-0">
                  Ver agenda completa <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="grid auto-rows-[260px] grid-cols-6 gap-4">
                {mainEvents.slice(0, 7).map((ev, i) => (
                  <PremiumEventCard key={ev.id} ev={ev} size={i < 2 ? "lg" : "md"} isTrending={trendingIdSet.has(ev.id)} partnerRank={ev.partner_id ? partnerRankMap.get(ev.partner_id) : undefined} className={`${i === 0 ? "col-span-4 row-span-2" : i === 1 ? "col-span-2 row-span-2" : "col-span-2"} !h-full !min-h-0 !w-full animate-fade-up`} />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* SIDEBAR */}
        <aside className="sticky top-20 h-fit space-y-4">
          <AIHomeWidget />
          <DesktopCategoriesPanel />
          <DesktopFeaturedPartnersPanel partners={featuredPartners} ranks={venueRanks} />
        </aside>
      </div>
    </div>
  );
}
