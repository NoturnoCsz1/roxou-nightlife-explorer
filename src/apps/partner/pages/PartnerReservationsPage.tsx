/**
 * PartnerReservationsPage — Hub de Reservas (FASE 6, refatorado).
 *
 * Dashboard slim mobile-first. Mantém:
 *  - Hero/KPIs
 *  - Notificações operacionais
 *  - Próxima reserva
 *  - Pendências
 *  - Ações rápidas em tiles com chevron → subpáginas
 *
 * Foram movidos para subpáginas próprias:
 *  - Tipos de reserva → /reservas/tipos
 *  - Lista (Tabs Hoje/Pendentes/Check-in/Histórico/Arquivadas) → /reservas/lista
 *  - Lista de espera + filtros → /reservas/fila
 *  - Configurações + link público → /reservas/configuracoes
 *  - Operação diária → /reservas/operacao
 *  - Equipe → /reservas/equipe
 *
 * Não altera Supabase, RLS, Auth ou serviços.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  Calendar,
  Hourglass,
  ListChecks,
  Settings,
  Sparkles,
  Users as UsersIcon,
  ScanLine,
  PlayCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

import { PartnerScreen } from "../components/PartnerScreen";
import { PartnerEmptyState } from "../components/PartnerEmptyState";
import { PartnerActionTile } from "../components/PartnerActionTile";
import {
  GuestNameDialog,
  ReservationHeroCard,
  ReservationHeroMobile,
  ReservationKpiGrid,
  ReservationPendingCard,
  UpcomingReservationCard,
  LiveOperationsPanel,
  PartnerNotificationsCenter,
} from "../components";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import { onFabClick } from "../components/PartnerFab";
import {
  computeReservationStats,
  createReservation,
  getReservationSettings,
  listReservationTypes,
  listReservationWaitlist,
  listReservations,
  type PartnerReservationRow,
  type PartnerReservationType,
  type ReservationWaitlistEntry,
} from "../services/partnerReservations";
import {
  closeDuePartnerReservations,
  expireDuePartnerReservations,
} from "../services/partnerMaintenance";

const PartnerReservationsPage = () => {
  const { selectedPartner, isLoading: authLoading, role } = usePartnerAuth();
  const { hash } = useLocation();
  const [params] = useSearchParams();

  const [rows, setRows] = useState<PartnerReservationRow[]>([]);
  const [types, setTypes] = useState<PartnerReservationType[]>([]);
  const [waitlist, setWaitlist] = useState<ReservationWaitlistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [quickOpen, setQuickOpen] = useState(params.get("new") === "1");

  const partnerId = selectedPartner?.id ?? null;
  const canCreate = role === "owner" || role === "admin";

  const load = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      await Promise.all([
        closeDuePartnerReservations(),
        expireDuePartnerReservations(),
      ]);
      const [list, _sett, tps, wl] = await Promise.all([
        listReservations(partnerId, { status: "all" }),
        getReservationSettings(partnerId),
        listReservationTypes(partnerId, { onlyActive: true }),
        listReservationWaitlist(partnerId).catch(() => []),
      ]);
      setRows(list);
      setTypes(tps);
      setWaitlist(wl);
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!partnerId) return;
    const iv = setInterval(() => void load(), 30000);
    return () => clearInterval(iv);
  }, [partnerId, load]);

  useEffect(() => onFabClick("reservation:new", () => setQuickOpen(true)), []);

  // Deep link legado #fila → redireciona para /reservas/fila
  useEffect(() => {
    if (hash === "#fila") {
      window.location.replace("/reservas/fila");
    }
  }, [hash]);

  const totalCapacity = useMemo(
    () =>
      types.reduce(
        (acc, t) => acc + Math.max(1, t.seats) * Math.max(1, t.quantity),
        0,
      ),
    [types],
  );
  const stats = useMemo(
    () => computeReservationStats(rows, totalCapacity),
    [rows, totalCapacity],
  );

  const handleQuickAdd = async (values: {
    name: string;
    reservation_date: string;
    people_count: number;
  }) => {
    if (!partnerId) return;
    try {
      await createReservation(partnerId, values);
      toast({ title: "Reserva criada" });
      void load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
      throw err;
    }
  };

  if (authLoading) {
    return (
      <PartnerScreen title="Reservas">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </PartnerScreen>
    );
  }

  if (!partnerId) {
    return (
      <PartnerScreen title="Reservas">
        <PartnerEmptyState ctaLabel="Voltar" ctaTo="/" />
      </PartnerScreen>
    );
  }

  return (
    <PartnerScreen
      title="Reservas"
      subtitle={selectedPartner?.name ?? undefined}
    >
      {/* Hero */}
      <div className="block md:hidden">
        <ReservationHeroMobile
          partnerName={selectedPartner?.name}
          rows={rows}
          waitlist={waitlist}
          stats={stats}
        />
      </div>
      <div className="hidden md:block">
        <ReservationHeroCard
          partnerName={selectedPartner?.name}
          rows={rows}
          waitlist={waitlist}
          types={types}
          stats={stats}
        />
      </div>

      {/* Operação ao vivo + notificações */}
      <LiveOperationsPanel
        rows={rows}
        waitlist={waitlist}
        onSelectBucket={(b) => {
          if (b === "waitlist") window.location.assign("/reservas/fila");
          else window.location.assign("/reservas/lista");
        }}
      />
      <PartnerNotificationsCenter
        rows={rows}
        waitlist={waitlist}
        onOpenSection={(s) => {
          if (s === "waitlist") window.location.assign("/reservas/fila");
          else if (s === "report") window.location.assign("/relatorios");
          else window.location.assign("/reservas/lista");
        }}
      />

      {/* Próxima reserva + pendências */}
      <UpcomingReservationCard reservations={rows} types={types} />
      <ReservationPendingCard reservations={rows} waitlist={waitlist} />

      {/* KPIs compactos */}
      <ReservationKpiGrid stats={stats} rows={rows} waitlist={waitlist} />

      {/* Operação — ações do dia a dia */}
      <section className="space-y-2" aria-label="Operação">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground px-1">
          Operação
        </h2>
        <div className="grid gap-2">
          <PartnerActionTile
            icon={ListChecks}
            label="Lista de reservas"
            hint="Hoje, pendentes, check-in, histórico"
            to="/reservas/lista"
            badge={rows.length ? String(rows.length) : undefined}
          />
          <PartnerActionTile
            icon={Hourglass}
            label="Atendimento"
            hint="Lista de espera e fila de chegada"
            to="/reservas/fila"
            badge={waitlist.length ? String(waitlist.length) : undefined}
          />
          <PartnerActionTile
            icon={PlayCircle}
            label="Operação diária"
            hint="Abrir, encerrar e histórico"
            to="/reservas/operacao"
          />
          <PartnerActionTile
            icon={ScanLine}
            label="Validador QR"
            hint="Check-in por código"
            to="/validator"
          />
        </div>
        {canCreate ? (
          <button
            type="button"
            onClick={() => setQuickOpen(true)}
            className="w-full rounded-2xl border border-dashed border-white/15 px-3 py-3 text-sm text-foreground/80 hover:bg-white/[0.04] transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Criar reserva manual
          </button>
        ) : null}
      </section>

      {/* Configuração — ajustes da casa */}
      <section className="space-y-2" aria-label="Configuração">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground px-1">
          Configuração
        </h2>
        <div className="grid gap-2">
          <PartnerActionTile
            icon={Calendar}
            label="Tipos de reserva"
            hint="Mesas, bistrôs, camarotes e experiências"
            to="/reservas/tipos"
          />
          <PartnerActionTile
            icon={UsersIcon}
            label="Equipe e acessos"
            hint="Validador, recepção, caixa, gerente"
            to="/reservas/equipe"
          />
          <PartnerActionTile
            icon={Settings}
            label="Configurações de reservas"
            hint="Prazos, limites, pagamentos, link público"
            to="/reservas/configuracoes"
          />
        </div>
      </section>

      <GuestNameDialog
        open={quickOpen}
        onOpenChange={setQuickOpen}
        onConfirm={handleQuickAdd}
      />

      {loading && rows.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center">Atualizando…</p>
      ) : null}
    </PartnerScreen>
  );
};

export default PartnerReservationsPage;
