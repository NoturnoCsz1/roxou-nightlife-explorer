/**
 * Partner Pilot — Fase 10B
 *
 * Tela admin para gerenciar o piloto fechado do Partner Pro com 2
 * estabelecimentos reais. Não cria parceiro novo nem cadastro paralelo.
 */
import { useCallback, useEffect, useState } from "react";
import PartnerPilotSearch from "../partnerPilot/components/PartnerPilotSearch";
import PartnerPilotPartnerCard from "../partnerPilot/components/PartnerPilotPartnerCard";
import PartnerPilotAccessStatus from "../partnerPilot/components/PartnerPilotAccessStatus";
import PartnerPilotInviteForm from "../partnerPilot/components/PartnerPilotInviteForm";
import PartnerPilotMetrics from "../partnerPilot/components/PartnerPilotMetrics";
import PartnerPilotDangerZone from "../partnerPilot/components/PartnerPilotDangerZone";
import {
  getPilotStatus,
  listPartnerTeam,
  type PilotPartner,
  type PilotStatus,
  type PilotTeamMember,
} from "../partnerPilot/partnerPilotService";

export default function PartnerPilot() {
  const [selected, setSelected] = useState<PilotPartner | null>(null);
  const [status, setStatus] = useState<PilotStatus | null>(null);
  const [team, setTeam] = useState<PilotTeamMember[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        getPilotStatus(selected.id),
        listPartnerTeam(selected.id),
      ]);
      setStatus(s);
      setTeam(t);
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">Piloto Partner Pro</h1>
        <p className="text-xs text-muted-foreground">
          Vincule usuários a estabelecimentos existentes para o piloto fechado. Nenhum cadastro
          paralelo é criado.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[360px,1fr] gap-4">
        <div>
          <PartnerPilotSearch onSelect={setSelected} selectedId={selected?.id ?? null} />
        </div>

        <div className="space-y-4 min-w-0">
          {!selected ? (
            <div className="rounded-xl border border-dashed border-border/40 p-8 text-center text-sm text-muted-foreground">
              Selecione um estabelecimento à esquerda para gerenciar o piloto.
            </div>
          ) : (
            <>
              <PartnerPilotPartnerCard partner={selected} />
              {loading && (
                <div className="text-xs text-muted-foreground">Atualizando…</div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PartnerPilotAccessStatus status={status} team={team} />
                <PartnerPilotMetrics status={status} />
              </div>
              <PartnerPilotInviteForm partnerId={selected.id} onLinked={reload} />
              <PartnerPilotDangerZone partnerId={selected.id} team={team} onChange={reload} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
