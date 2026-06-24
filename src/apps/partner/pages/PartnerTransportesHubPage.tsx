/**
 * PartnerTransportesHubPage
 *
 * Hub independente do módulo Roxou Transportes dentro do Partner Pro.
 * Não compartilha navegação com Reservas nem com Listas VIP.
 *
 * Menu: Hub · Excursões · Veículos · Viagens · Passageiros · Operação ·
 * GPS · Relatórios · Equipe.
 */
import { useNavigate } from "react-router-dom";
import {
  Bus,
  CalendarRange,
  ClipboardList,
  LayoutGrid,
  MapPin,
  PlayCircle,
  Truck,
  Users,
  UserCog,
} from "lucide-react";

import { PartnerScreen } from "../components/PartnerScreen";
import { PartnerEmptyState } from "../components/PartnerEmptyState";
import { PartnerActionTile } from "../components/PartnerActionTile";
import { usePartnerAuth } from "../hooks/usePartnerAuth";

const TILES = [
  { icon: LayoutGrid, label: "Hub", hint: "Visão geral do módulo", to: "/transportes" },
  { icon: Bus, label: "Excursões", hint: "Linhas oficiais e embarque QR", to: "/excursoes" },
  { icon: Truck, label: "Veículos", hint: "Frota, capacidade e placa", to: "/excursoes/veiculos" },
  { icon: CalendarRange, label: "Viagens", hint: "Sessões, assentos e horários", to: "/excursoes/viagens" },
  { icon: Users, label: "Passageiros", hint: "Lista, contato e check-in", to: "/transportes/passageiros" },
  { icon: PlayCircle, label: "Operação", hint: "Abertura, embarque e encerramento", to: "/transportes/operacao" },
  { icon: MapPin, label: "GPS", hint: "Rastreamento em tempo real", to: "/transportes/gps" },
  { icon: ClipboardList, label: "Relatórios", hint: "Ocupação, receita e desempenho", to: "/transportes/relatorios" },
  { icon: UserCog, label: "Equipe", hint: "Motoristas, validador e recepção", to: "/transportes/equipe" },
];

const PartnerTransportesHubPage = () => {
  const navigate = useNavigate();
  const { selectedPartner } = usePartnerAuth();
  const partnerId = selectedPartner?.id ?? null;

  if (!partnerId) {
    return (
      <PartnerScreen title="Transportes">
        <PartnerEmptyState ctaLabel="Voltar" ctaTo="/" />
      </PartnerScreen>
    );
  }

  return (
    <PartnerScreen
      title="Roxou Transportes"
      subtitle={selectedPartner?.name ?? undefined}
    >
      <p className="text-sm text-muted-foreground px-1">
        Módulo independente para vans, ônibus e transfers com embarque por QR Code.
      </p>

      <section className="space-y-2" aria-label="Menu Transportes">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground px-1">
          Menu
        </h2>
        <div className="grid gap-2">
          {TILES.map((t) => (
            <PartnerActionTile
              key={t.label}
              icon={t.icon}
              label={t.label}
              hint={t.hint}
              to={t.to}
              onClick={() => navigate(t.to)}
            />
          ))}
        </div>
      </section>
    </PartnerScreen>
  );
};

export default PartnerTransportesHubPage;
