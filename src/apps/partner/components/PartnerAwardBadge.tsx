/**
 * PartnerAwardBadge — Fase 9D
 * Selo "Parceiro destaque do mês" lido de partner_awards.
 */
import { Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { PartnerAward } from "../services/partnerDashboard";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function PartnerAwardBadge({ award }: { award: PartnerAward | null }) {
  if (!award) return null;
  const periodo =
    award.month && award.year
      ? `${MESES[award.month - 1] ?? ""} ${award.year}`
      : null;

  return (
    <Card className="border-primary/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Award className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{award.title}</div>
            <div className="text-[11px] text-muted-foreground">
              Destaque{periodo ? ` · ${periodo}` : ""}
            </div>
          </div>
        </div>
        {award.description ? (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {award.description}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default PartnerAwardBadge;
