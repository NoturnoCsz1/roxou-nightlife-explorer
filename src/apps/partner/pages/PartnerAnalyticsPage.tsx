/**
 * PartnerAnalyticsPage — Sprint final premium mobile-first.
 *
 * Hero executivo + Operação Hoje + Crescimento + Top 3 promoters,
 * com accordions para detalhamento (Lista VIP, Leads, Ranking completo, Eventos).
 * Não altera backend, RPCs, services nem cálculos: apenas reorganiza dados.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Crown,
  CalendarCheck,
  UserCheck,
  Sparkles,
  Megaphone,
  ClipboardList,
  Users,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import { PartnerEmptyState, ExecutiveAnalyticsHero, GrowthSummaryCard } from "../components";
import { GlassCard } from "../components/ui/GlassCard";
import {
  getPartnerAnalytics,
  type AnalyticsPeriod,
  type PartnerAnalytics,
} from "../services/partnerAnalytics";

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "all", label: "Tudo" },
];

function OpsTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Crown;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="partner-glass-hover hover-lift animate-fade-in rounded-lg border border-white/5 bg-background/40 p-3 min-h-[96px] flex flex-col justify-between">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate uppercase tracking-wide">{label}</span>
      </div>
      <div>
        <div className="text-xl font-bold tabular-nums">
          {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
        </div>
        {hint ? (
          <div className="text-[10px] text-muted-foreground truncate">{hint}</div>
        ) : null}
      </div>
    </div>
  );
}

function MedalBadge({ pos }: { pos: 0 | 1 | 2 }) {
  const map = ["🥇", "🥈", "🥉"] as const;
  return <span className="text-base leading-none">{map[pos]}</span>;
}

function PromoterRow({
  rank,
  name,
  signups,
  checkins,
  conversion,
}: {
  rank: number;
  name: string;
  signups: number;
  checkins: number;
  conversion: number;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-background/30 p-3 flex items-center gap-3">
      {rank < 3 ? (
        <MedalBadge pos={rank as 0 | 1 | 2} />
      ) : (
        <span className="text-xs text-muted-foreground w-5 text-center tabular-nums">
          {rank + 1}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{name}</div>
        <div className="text-[11px] text-muted-foreground tabular-nums">
          {signups} inscritos · {checkins} check-ins
        </div>
      </div>
      <div className="text-xs font-semibold tabular-nums text-primary shrink-0">
        {conversion}%
      </div>
    </div>
  );
}

const PartnerAnalyticsPage = () => {
  const { selectedPartnerId, canViewAnalytics, isLoading } = usePartnerAuth();
  const [period, setPeriod] = useState<AnalyticsPeriod>("7d");
  const [data, setData] = useState<PartnerAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPartnerId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPartnerAnalytics(selectedPartnerId, period)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled) {
          console.error("[PARTNER_ANALYTICS]", e);
          setError("Não foi possível carregar as métricas agora.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPartnerId, period]);

  const showSkeleton = loading && !data;
  const empty = useMemo(() => data && !data.hasAnyData, [data]);
  const periodLabel = useMemo(
    () => PERIODS.find((p) => p.value === period)?.label ?? "",
    [period],
  );
  const topPromoters = useMemo(
    () => (data ? data.promoters.slice(0, 3) : []),
    [data],
  );

  if (isLoading) {
    return (
      <main className="min-h-screen p-6">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </main>
    );
  }

  if (!selectedPartnerId) {
    return (
      <main className="min-h-screen p-6 space-y-4">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <PartnerEmptyState />
      </main>
    );
  }

  if (!canViewAnalytics) {
    return (
      <main className="min-h-screen p-6 space-y-4">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Disponível apenas para owner/admin do estabelecimento.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-6 space-y-4 max-w-5xl mx-auto overflow-x-hidden pb-24">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Analytics</h1>
          <p className="text-xs text-muted-foreground">
            Métricas reais do seu estabelecimento.
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Período"
          className="inline-flex rounded-md border border-border p-0.5 bg-card self-start"
        >
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              type="button"
              role="tab"
              aria-selected={period === p.value}
              variant={period === p.value ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </header>

      {error ? (
        <Card>
          <CardContent className="p-4 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : null}

      {showSkeleton ? (
        <div className="space-y-3">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {data && !showSkeleton ? (
        <>
          {empty ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Nenhum dado registrado ainda. Quando seus links públicos,
                listas VIP e reservas começarem a ser usados, as métricas
                aparecerão aqui.
              </CardContent>
            </Card>
          ) : null}

          {/* 1. Hero executivo */}
          <ExecutiveAnalyticsHero data={data} periodLabel={periodLabel} />

          {/* 2. Operação Hoje */}
          <GlassCard padding="md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Operação</h3>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {periodLabel}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <OpsTile icon={Crown} label="Inscrições VIP" value={data.kpis.vipSignups} />
              <OpsTile icon={CalendarCheck} label="Reservas" value={data.kpis.reservations} />
              <OpsTile icon={UserCheck} label="Check-ins" value={data.kpis.checkins} />
              <OpsTile
                icon={Sparkles}
                label="Taxa presença"
                value={`${data.kpis.attendanceRate}%`}
                hint={`${data.kpis.noShows} no-show`}
              />
            </div>
          </GlassCard>

          {/* 3. Crescimento */}
          <GrowthSummaryCard data={data} />

          {/* 4. Top promoters */}
          <GlassCard padding="md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Top promoters</h3>
              </div>
              <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                <Megaphone className="h-3 w-3" />
                {data.kpis.promotersActive} ativos
              </span>
            </div>
            {topPromoters.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum promoter com inscrições no período.
              </p>
            ) : (
              <div className="space-y-2">
                {topPromoters.map((p, idx) => (
                  <PromoterRow
                    key={p.promoterId ?? `none-${idx}`}
                    rank={idx}
                    name={p.name}
                    signups={p.signups}
                    checkins={p.checkins}
                    conversion={p.conversion}
                  />
                ))}
              </div>
            )}
          </GlassCard>

          {/* 5. Accordions de detalhamento */}
          <Accordion type="multiple" className="space-y-2">
            <AccordionItem
              value="vip"
              className="partner-glass rounded-lg border border-white/5 px-3"
            >
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Lista VIP — detalhamento
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-2">
                  <OpsTile icon={ClipboardList} label="Listas ativas" value={data.vip.active} />
                  <OpsTile icon={ClipboardList} label="Fechadas" value={data.vip.closed} />
                  <OpsTile icon={ClipboardList} label="Encerradas" value={data.vip.ended} />
                  <OpsTile icon={Crown} label="Inscritos" value={data.vip.signups} />
                  <OpsTile icon={UserCheck} label="Check-ins" value={data.vip.checkins} />
                  <OpsTile
                    icon={Sparkles}
                    label="Presença"
                    value={`${data.vip.attendanceRate}%`}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="leads"
              className="partner-glass rounded-lg border border-white/5 px-3"
            >
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Leads / CRM
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-2">
                  <OpsTile icon={Users} label="Total leads" value={data.leads.total} />
                  <OpsTile icon={ShieldCheck} label="WhatsApp ok" value={data.leads.whatsapp} />
                  <OpsTile icon={ShieldCheck} label="E-mail ok" value={data.leads.email} />
                  <OpsTile icon={ShieldCheck} label="Sem consent." value={data.leads.noConsent} />
                  <OpsTile icon={Sparkles} label="Novos" value={data.leads.newInPeriod} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="ranking"
              className="partner-glass rounded-lg border border-white/5 px-3"
            >
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                <span className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  Ranking completo de promoters
                </span>
              </AccordionTrigger>
              <AccordionContent>
                {data.promoters.length === 0 ? (
                  <p className="text-xs text-muted-foreground pb-2">
                    Nenhum promoter no período.
                  </p>
                ) : (
                  <>
                    {/* Mobile */}
                    <div className="md:hidden space-y-2 pb-2">
                      {data.promoters.map((p, idx) => (
                        <PromoterRow
                          key={p.promoterId ?? `none-${idx}`}
                          rank={idx}
                          name={p.name}
                          signups={p.signups}
                          checkins={p.checkins}
                          conversion={p.conversion}
                        />
                      ))}
                    </div>
                    {/* Desktop */}
                    <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead className="text-muted-foreground bg-muted/30">
                          <tr>
                            <th className="text-left py-2 px-3">Promoter</th>
                            <th className="text-right py-2 px-3">Inscritos</th>
                            <th className="text-right py-2 px-3">Check-ins</th>
                            <th className="text-right py-2 px-3">No-show</th>
                            <th className="text-right py-2 px-3">Conversão</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.promoters.map((p, idx) => (
                            <tr
                              key={p.promoterId ?? `none-${idx}`}
                              className="border-t border-border"
                            >
                              <td className="py-2 px-3">{p.name}</td>
                              <td className="text-right py-2 px-3 tabular-nums">{p.signups}</td>
                              <td className="text-right py-2 px-3 tabular-nums">{p.checkins}</td>
                              <td className="text-right py-2 px-3 tabular-nums">{p.noShows}</td>
                              <td className="text-right py-2 px-3 tabular-nums">{p.conversion}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="eventos"
              className="partner-glass rounded-lg border border-white/5 px-3"
            >
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                <span className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-primary" />
                  Eventos vinculados
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground pb-2">
                  Eventos com listas ou reservas no período:{" "}
                  <span className="tabular-nums text-foreground font-semibold">
                    {data.kpis.eventsLinked}
                  </span>
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </>
      ) : null}
    </main>
  );
};

export default PartnerAnalyticsPage;
