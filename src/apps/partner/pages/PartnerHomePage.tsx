/**
 * PartnerHomePage — Centro de Operações (Última alteração do dia).
 *
 * Mobile-first. Mostra ocupação, KPIs operacionais reais, próxima reserva,
 * evento de hoje, atalhos comerciais e central de alertas/insights.
 *
 * Não cria tabela, RPC ou nova dependência. Reaproveita services existentes.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Hourglass,
  CheckCircle2,
  AlertTriangle,
  Users,
  CalendarPlus,
  Share2,
  QrCode,
  TrendingUp,
  Armchair,
  Sparkles,
  Wallet,
  ListChecks,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { usePartnerAuth } from "../hooks/usePartnerAuth";
import {
  computeReservationStats,
  listReservations,
  listReservationTypes,
  listReservationWaitlist,
  type PartnerReservationRow,
  type PartnerReservationType,
  type ReservationWaitlistEntry,
} from "@modules/partner/reservations";
import { getPartnerRecentEvents, type PartnerEventRow } from "../services/partnerDashboard";
import { PartnerScreen } from "../components/PartnerScreen";
import { OccupancyRing } from "../components/OccupancyRing";
import { PartnerActionsSheet } from "../components/PartnerActionsSheet";
import { PartnerNotificationsCenter } from "../components/PartnerNotificationsCenter";
import { PartnerEmptyState } from "../components/PartnerEmptyState";
import { OccupancySkeleton, PartnerCardSkeleton } from "../components/PartnerSkeletons";
import { PublicLinkQrDialog } from "../components/PublicLinkQrDialog";
import { trackPartnerClient } from "../lib/partnerInteractions";
import { toast } from "@/hooks/use-toast";

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: typeof Calendar;
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "warning" | "success" | "danger";
}) {
  const toneCls =
    tone === "warning"
      ? "text-amber-300"
      : tone === "danger"
        ? "text-rose-300"
        : tone === "success"
          ? "text-emerald-300"
          : "text-foreground";
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground truncate">
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${toneCls}`}>{value}</div>
      {hint ? (
        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{hint}</div>
      ) : null}
    </div>
  );
}

const PartnerHomePage = () => {
  const { selectedPartner, selectedPartnerId, isLoading } = usePartnerAuth();
  const [rows, setRows] = useState<PartnerReservationRow[]>([]);
  const [types, setTypes] = useState<PartnerReservationType[]>([]);
  const [waitlist, setWaitlist] = useState<ReservationWaitlistEntry[]>([]);
  const [events, setEvents] = useState<PartnerEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    if (!selectedPartnerId) {
      setRows([]);
      setTypes([]);
      setWaitlist([]);
      setEvents([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listReservations(selectedPartnerId, { limit: 200 }),
      listReservationTypes(selectedPartnerId),
      listReservationWaitlist(selectedPartnerId),
      getPartnerRecentEvents(selectedPartnerId, 5).catch(() => [] as PartnerEventRow[]),
    ])
      .then(([r, t, w, e]) => {
        if (cancelled) return;
        setRows(r);
        setTypes(t);
        setWaitlist(w);
        setEvents(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPartnerId]);

  const totalCapacity = useMemo(
    () => types.reduce((acc, t) => acc + (t.quantity ?? 0) * (t.seats ?? 0), 0),
    [types],
  );

  const stats = useMemo(
    () => computeReservationStats(rows, totalCapacity),
    [rows, totalCapacity],
  );

  const kpis = useMemo(() => {
    const today = new Date();
    const startToday = new Date(today);
    startToday.setHours(0, 0, 0, 0);
    const dayStart = startToday.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    let checkins = 0;
    let pending = 0;
    let presentes = 0;
    let revenueToday = 0;
    let revenueExpected = 0;
    let reservasToday = 0;
    let occupiedSeats = 0;
    let nextReserva: PartnerReservationRow | null = null;

    for (const r of rows) {
      const d = new Date(r.reservation_date).getTime();
      const isToday = d >= dayStart && d < dayEnd;
      if (!isToday) continue;
      reservasToday += 1;
      const seats = r.people_count ?? 0;

      if (r.status === "completed") {
        checkins += 1;
        if (!r.released_at) {
          presentes += seats;
          occupiedSeats += seats;
        }
      }
      if (r.status === "pending" || r.status === "pending_payment") pending += 1;
      if (r.status === "confirmed") {
        occupiedSeats += seats;
        if (d >= Date.now() && (!nextReserva || d < new Date(nextReserva.reservation_date).getTime())) {
          nextReserva = r;
        }
      }
      if (
        (r.status === "confirmed" || r.status === "completed") &&
        typeof r.total_price === "number"
      ) {
        const v = Number(r.total_price) || 0;
        if (r.status === "completed") revenueToday += v;
        revenueExpected += v;
      }
    }

    const fila = waitlist.filter((w) => w.status === "waiting").length;
    const mesasLivres = Math.max(0, totalCapacity - occupiedSeats);

    // Evento hoje
    const eventToday = events.find((e) => {
      const d = new Date(e.date_time).getTime();
      return d >= dayStart && d < dayEnd;
    }) ?? null;

    return {
      reservasHoje: reservasToday,
      presentes,
      revenueExpected,
      revenueToday,
      checkins,
      pending,
      fila,
      mesasLivres,
      nextReserva,
      eventToday,
    };
  }, [rows, waitlist, events, totalCapacity]);

  const isEmptyDay =
    !loading &&
    kpis.reservasHoje === 0 &&
    kpis.fila === 0 &&
    kpis.checkins === 0 &&
    !kpis.eventToday;

  useEffect(() => {
    if (!loading && selectedPartnerId) {
      trackPartnerClient("partner_home_summary_view", {
        reservasHoje: kpis.reservasHoje,
        fila: kpis.fila,
      });
    }
  }, [loading, selectedPartnerId, kpis.reservasHoje, kpis.fila]);

  const publicUrl =
    selectedPartner?.slug && typeof window !== "undefined"
      ? `${window.location.origin}/${selectedPartner.slug}/reservas`
      : null;
  const bioUrl =
    selectedPartner?.slug && typeof window !== "undefined"
      ? `${window.location.origin}/bio/${selectedPartner.slug}`
      : null;

  const handleShareBio = async () => {
    if (!bioUrl) {
      toast({ title: "Slug indisponível", variant: "destructive" });
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: selectedPartner?.name ?? "Bio", url: bioUrl });
        return;
      }
    } catch {
      /* noop */
    }
    try {
      await navigator.clipboard.writeText(bioUrl);
      toast({ title: "Link da Bio copiado!" });
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  const shortcuts = [
    { icon: CalendarPlus, label: "Nova reserva", to: "/reservas", action: "new_reservation" },
    { icon: Hourglass, label: "Atendimento", to: "/reservas/fila", action: "atendimento" },
    { icon: Share2, label: "Compartilhar Bio", onClick: handleShareBio, action: "share_bio" },
    { icon: QrCode, label: "Gerar QR", onClick: () => setQrOpen(true), action: "qr" },
  ];

  if (isLoading) {
    return (
      <PartnerScreen title="Início">
        <OccupancySkeleton />
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <PartnerCardSkeleton key={i} />
          ))}
        </div>
      </PartnerScreen>
    );
  }

  if (!selectedPartnerId) {
    return (
      <PartnerScreen title="Início">
        <PartnerEmptyState ctaLabel="Abrir configurações" ctaTo="/configuracoes" />
      </PartnerScreen>
    );
  }

  return (
    <>
      <PartnerScreen
        title={selectedPartner?.name ?? "Início"}
        subtitle={loading ? "Atualizando…" : "Centro de operações de hoje"}
      >
        {/* Hero ocupação */}
        <Card className="border-white/8 bg-gradient-to-br from-white/[0.04] to-white/[0.01] overflow-hidden">
          <CardContent className="p-4 flex items-center gap-4">
            <OccupancyRing
              value={stats.capacityUsed}
              reservedSeats={stats.reservedSeats}
              totalCapacity={stats.totalCapacity}
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Ocupação agora
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground/90">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="tabular-nums">
                  {stats.reservedSeats}/{stats.totalCapacity || "—"} lugares
                </span>
              </div>
              {kpis.presentes > 0 ? (
                <div className="flex items-center gap-2 text-sm text-emerald-300/90">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="tabular-nums">{kpis.presentes} clientes presentes</span>
                </div>
              ) : null}
              {stats.pendingSeats > 0 ? (
                <div className="flex items-center gap-2 text-sm text-amber-300/90">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="tabular-nums">
                    {stats.pendingSeats} aguardando pagamento
                  </span>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Empty state guiado */}
        {isEmptyDay ? (
          <Card className="border-white/8 bg-white/[0.03]">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    Hoje ainda não há movimento registrado.
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Comece por uma destas ações para movimentar a agenda.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button asChild size="sm" variant="outline" className="justify-start">
                  <Link to="/reservas"><CalendarPlus className="h-3.5 w-3.5 mr-1.5" />Nova reserva</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="justify-start">
                  <Link to="/listas"><ListChecks className="h-3.5 w-3.5 mr-1.5" />Abrir Lista VIP</Link>
                </Button>
                <Button size="sm" variant="outline" className="justify-start" onClick={handleShareBio}>
                  <Share2 className="h-3.5 w-3.5 mr-1.5" />Compartilhar Bio
                </Button>
                <Button size="sm" variant="outline" className="justify-start" onClick={() => setQrOpen(true)}>
                  <QrCode className="h-3.5 w-3.5 mr-1.5" />Gerar QR
                </Button>
                <Button asChild size="sm" variant="outline" className="justify-start col-span-2">
                  <Link to="/eventos/novo"><Sparkles className="h-3.5 w-3.5 mr-1.5" />Cadastrar evento</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* KPIs operacionais */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <Kpi icon={Calendar} label="Reservas hoje" value={kpis.reservasHoje} hint="no dia" />
          <Kpi icon={Users} label="Clientes presentes" value={kpis.presentes} tone="success" />
          <Kpi
            icon={Wallet}
            label="Receita prevista"
            value={
              kpis.revenueExpected > 0
                ? `R$ ${Math.round(kpis.revenueExpected).toLocaleString("pt-BR")}`
                : "—"
            }
            hint={
              kpis.revenueToday > 0
                ? `R$ ${Math.round(kpis.revenueToday).toLocaleString("pt-BR")} realizada`
                : undefined
            }
          />
          <Kpi icon={CheckCircle2} label="Check-ins" value={kpis.checkins} tone="success" />
          <Kpi
            icon={Hourglass}
            label="Lista de espera"
            value={kpis.fila}
            tone={kpis.fila > 0 ? "warning" : "default"}
          />
          <Kpi
            icon={Armchair}
            label="Mesas livres"
            value={totalCapacity > 0 ? kpis.mesasLivres : "—"}
            hint={totalCapacity === 0 ? "configurar capacidade" : undefined}
          />
        </div>

        {/* Próxima reserva + Evento de hoje */}
        {(kpis.nextReserva || kpis.eventToday) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {kpis.nextReserva ? (
              <Card className="border-white/8 bg-white/[0.03]">
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <TrendingUp className="h-3 w-3" /> Próxima reserva
                  </div>
                  <p className="mt-1 text-sm font-semibold truncate">
                    {kpis.nextReserva.name ?? "Reserva"}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {new Date(kpis.nextReserva.reservation_date).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" · "}
                    {kpis.nextReserva.people_count ?? "?"} pessoas
                  </p>
                  <Button asChild size="sm" variant="ghost" className="mt-1 h-7 px-2 text-[11px]">
                    <Link to={`/reservas/${kpis.nextReserva.id}`}>Abrir →</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}
            {kpis.eventToday ? (
              <Card className="border-white/8 bg-white/[0.03]">
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Sparkles className="h-3 w-3" /> Evento de hoje
                  </div>
                  <p className="mt-1 text-sm font-semibold truncate">{kpis.eventToday.title}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {new Date(kpis.eventToday.date_time).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <Button asChild size="sm" variant="ghost" className="mt-1 h-7 px-2 text-[11px]">
                    <Link to={`/eventos/${kpis.eventToday.id}`}>Abrir →</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}

        {/* Ações rápidas operacionais */}
        <div className="grid grid-cols-4 gap-2">
          {shortcuts.map((s) => {
            const inner = (
              <>
                <s.icon className="h-4 w-4 text-foreground/70" />
                <span className="text-center leading-tight">{s.label}</span>
              </>
            );
            const cls =
              "flex flex-col items-center justify-center gap-1 rounded-xl border border-white/8 bg-white/[0.03] px-2 py-3 text-[11px] font-medium text-foreground/80 hover:bg-white/[0.06] transition min-h-[64px]";
            return s.to ? (
              <Link key={s.label} to={s.to} className={cls}>
                {inner}
              </Link>
            ) : (
              <button
                key={s.label}
                type="button"
                onClick={s.onClick}
                className={cls}
              >
                {inner}
              </button>
            );
          })}
        </div>

        {/* Central de alertas + insights */}
        <PartnerNotificationsCenter
          rows={rows}
          waitlist={waitlist}
          eventToday={kpis.eventToday}
          partnerSlug={selectedPartner?.slug ?? null}
        />

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/relatorios">Ver relatórios completos →</Link>
          </Button>
        </div>
      </PartnerScreen>

      <PartnerActionsSheet
        partnerSlug={selectedPartner?.slug ?? null}
        partnerName={selectedPartner?.name ?? null}
      />

      {publicUrl ? (
        <PublicLinkQrDialog open={qrOpen} onOpenChange={setQrOpen} url={publicUrl} />
      ) : null}
    </>
  );
};

export default PartnerHomePage;
