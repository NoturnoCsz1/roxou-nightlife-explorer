/**
 * PartnerQuickActions — Fase 9D
 * Atalhos visuais (sem rotas ativas ainda).
 */
import { CalendarPlus, ClipboardList, Crown, Settings, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const ACTIONS = [
  { icon: CalendarPlus, label: "Novo evento" },
  { icon: ClipboardList, label: "Reservas" },
  { icon: Crown, label: "Lista VIP" },
  { icon: BarChart3, label: "Analytics" },
  { icon: Settings, label: "Configurações" },
];

export function PartnerQuickActions() {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardContent className="p-4">
        <h3 className="text-sm font-medium mb-3">Ações rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {ACTIONS.map((a) => (
            <button
              key={a.label}
              type="button"
              disabled
              className="flex w-full min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-border p-3 text-xs text-muted-foreground opacity-70 cursor-not-allowed break-words"
            >
              <a.icon className="h-4 w-4 shrink-0" />
              <span className="text-center break-words">{a.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Atalhos ativados em fases futuras.
        </p>
      </CardContent>
    </Card>
  );
}

export default PartnerQuickActions;
