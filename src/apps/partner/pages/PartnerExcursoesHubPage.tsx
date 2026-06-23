/**
 * PartnerExcursoesHubPage — FASE 7.2
 *
 * Hub do módulo Roxou Excursões dentro do Partner Pro. Espelha o
 * padrão dos hubs de Reservas e Listas VIP: hero KPI + tiles de
 * navegação para subpáginas especializadas.
 *
 * Não trata passageiro público, QR, pagamento real, embarque/validador
 * nem GPS — apenas o miolo operacional do parceiro.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bus,
  CalendarRange,
  ListChecks,
  PlayCircle,
  Plus,
  Settings,
  UserCog,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";

import { PartnerScreen } from "../components/PartnerScreen";
import { PartnerEmptyState } from "../components/PartnerEmptyState";
import { PartnerActionTile } from "../components/PartnerActionTile";
import { onFabClick } from "../components/PartnerFab";
import { usePartnerAuth, canManageEvents } from "../hooks/usePartnerAuth";
import {
  listExcursionTrips,
  listExcursionVehicles,
  type ExcursionTrip,
  type ExcursionVehicle,
} from "../services/partnerExcursoes";

const todaySP = (): string => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // YYYY-MM-DD
};

const PartnerExcursoesHubPage = () => {
  const navigate = useNavigate();
  const { selectedPartner, role } = usePartnerAuth();
  const partnerId = selectedPartner?.id ?? null;
  const canCreate = canManageEvents(role);

  const [vehicles, setVehicles] = useState<ExcursionVehicle[]>([]);
  const [trips, setTrips] = useState<ExcursionTrip[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const [vs, ts] = await Promise.all([
        listExcursionVehicles(partnerId),
        listExcursionTrips(partnerId),
      ]);
      setVehicles(vs);
      setTrips(ts);
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(
    () =>
      onFabClick("excursoes:new", () => {
        if (!canCreate) {
          toast({ title: "Permissão", description: "Apenas gestores." });
          return;
        }
        navigate("/excursoes/viagens?new=1");
      }),
    [canCreate, navigate],
  );

  const buckets = useMemo(() => {
    const today = todaySP();
    let open = 0;
    let upcoming = 0;
    let finished = 0;
    for (const t of trips) {
      if (t.status === "open") open += 1;
      else if (t.status === "finished" || t.status === "cancelled") finished += 1;
      if (t.session_date >= today && t.status !== "cancelled") upcoming += 1;
    }
    return { open, upcoming, finished };
  }, [trips]);

  const nextTrip = useMemo(() => {
    const today = todaySP();
    return (
      trips
        .filter((t) => t.session_date >= today && t.status !== "cancelled")
        .sort((a, b) => a.departure_at.localeCompare(b.departure_at))[0] ?? null
    );
  }, [trips]);

  if (!partnerId) {
    return (
      <PartnerScreen title="Excursões">
        <PartnerEmptyState ctaLabel="Voltar" ctaTo="/" />
      </PartnerScreen>
    );
  }

  return (
    <PartnerScreen
      title="Excursões Oficiais"
      subtitle={selectedPartner?.name ?? undefined}
    >
      {/* Hero KPI */}
      <Card className="rounded-2xl border-white/8 bg-gradient-to-br from-sky-500/10 to-violet-500/5">
        <CardContent className="p-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Viagens abertas
            </p>
            <p className="text-2xl font-semibold tabular-nums">{buckets.open}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Próximas
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {buckets.upcoming}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Veículos
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {vehicles.length}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Encerradas
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {buckets.finished}
            </p>
          </div>
        </CardContent>
      </Card>

      {nextTrip ? (
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-sky-500/15 text-sky-300 flex items-center justify-center">
              <Bus className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Próxima viagem
              </p>
              <p className="text-sm font-medium truncate">{nextTrip.title}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {new Date(nextTrip.departure_at).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {nextTrip.destination ? ` · ${nextTrip.destination}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/excursoes/viagens/${nextTrip.id}`)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/[0.05]"
            >
              Abrir
            </button>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-2" aria-label="Gerenciar excursões">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground px-1">
          Gerenciar
        </h2>
        <div className="grid gap-2">
          <PartnerActionTile
            icon={CalendarRange}
            label="Viagens"
            hint="Sessões diárias e mapa de assentos"
            to="/excursoes/viagens"
            badge={trips.length ? String(trips.length) : undefined}
          />
          <PartnerActionTile
            icon={Bus}
            label="Veículos"
            hint="Cadastro, capacidade e placa"
            to="/excursoes/veiculos"
            badge={vehicles.length ? String(vehicles.length) : undefined}
          />
          <PartnerActionTile
            icon={ListChecks}
            label="Assentos por viagem"
            hint="Livre, reservado, pago, embarcado"
            to="/excursoes/viagens"
          />
          <PartnerActionTile
            icon={PlayCircle}
            label="Operação diária"
            hint="Abrir, encerrar e arquivar viagens"
            to="/excursoes/viagens"
          />
          <PartnerActionTile
            icon={UserCog}
            label="Equipe e acessos"
            hint="Validador, motorista, recepção"
            to="/reservas/equipe"
          />
          <PartnerActionTile
            icon={Settings}
            label="Configurações"
            hint="Em breve — embarque, GPS, cobrança"
            to="/excursoes/configuracoes"
          />
        </div>
        {canCreate ? (
          <button
            type="button"
            onClick={() => navigate("/excursoes/viagens?new=1")}
            className="w-full rounded-2xl border border-dashed border-white/15 px-3 py-3 text-sm text-foreground/80 hover:bg-white/[0.04] transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Criar nova viagem
          </button>
        ) : null}
      </section>

      {loading && !trips.length && !vehicles.length ? (
        <p className="text-xs text-muted-foreground text-center">Carregando…</p>
      ) : null}
    </PartnerScreen>
  );
};

export default PartnerExcursoesHubPage;
