/**
 * PartnerOpeningHoursEditor — Fase 9E
 *
 * A coluna `opening_hours` ainda não existe em `partners`. Este componente
 * está aqui como placeholder controlado para a Fase 9F (quando a coluna for
 * adicionada via migration aprovada). Por ora, é apenas informativo.
 */
import { Clock } from "lucide-react";

export function PartnerOpeningHoursEditor() {
  return (
    <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-2 font-medium text-foreground/80">
        <Clock className="h-4 w-4" />
        Horário de funcionamento
      </div>
      <p className="mt-1">
        Em breve. O campo será habilitado após a próxima atualização do
        cadastro de estabelecimentos.
      </p>
    </div>
  );
}

export default PartnerOpeningHoursEditor;
