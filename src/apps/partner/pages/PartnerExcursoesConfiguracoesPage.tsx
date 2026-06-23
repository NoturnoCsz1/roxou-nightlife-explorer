/**
 * PartnerExcursoesConfiguracoesPage — FASE 7.2
 *
 * Placeholder de configurações futuras (links públicos, cobrança real,
 * GPS, embarque via validador). Mantém o padrão visual dos hubs.
 */
import { Bus, GitBranch, MapPin, QrCode, Wallet } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { PartnerScreen } from "../components/PartnerScreen";
import { PartnerActionTile } from "../components/PartnerActionTile";

const PartnerExcursoesConfiguracoesPage = () => {
  return (
    <PartnerScreen
      title="Configurações"
      subtitle="Excursões oficiais"
    >
      <Card>
        <CardContent className="p-4 space-y-1">
          <p className="text-sm font-medium">Em construção</p>
          <p className="text-[12px] text-muted-foreground">
            Esta sub-fase entrega apenas o miolo operacional (veículos,
            viagens e assentos). As opções abaixo chegam nas próximas
            sub-fases.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground px-1">
          Próximas etapas
        </h2>
        <div className="grid gap-2">
          <PartnerActionTile
            icon={Bus}
            label="Layout visual de assentos"
            hint="Editor por veículo"
            comingSoon
          />
          <PartnerActionTile
            icon={QrCode}
            label="QR Code de embarque"
            hint="Validador por sessão"
            comingSoon
          />
          <PartnerActionTile
            icon={Wallet}
            label="Pagamento online"
            hint="PIX e cartão"
            comingSoon
          />
          <PartnerActionTile
            icon={MapPin}
            label="GPS ao vivo"
            hint="Acompanhamento do passageiro"
            comingSoon
          />
          <PartnerActionTile
            icon={GitBranch}
            label="Privativo por evento"
            hint="Solicitações sob demanda"
            comingSoon
          />
        </div>
      </section>
    </PartnerScreen>
  );
};

export default PartnerExcursoesConfiguracoesPage;
