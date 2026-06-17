/**
 * PartnerQuickActions — FIX rotas reais
 * Atalhos navegam para o Partner Preview interno via /partner/*
 * (PartnerShortcutRedirect redireciona para /admin/partner-preview/*).
 */
import { CalendarPlus, ClipboardList, Crown, Settings, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

const ACTIONS = [
  { icon: CalendarPlus, label: "Novo evento", to: "/partner/eventos" },
  { icon: ClipboardList, label: "Reservas", to: "/partner/reservas" },
  { icon: Crown, label: "Lista VIP", to: "/partner/lista-vip" },
  { icon: BarChart3, label: "Analytics", to: "/partner/analytics" },
  { icon: Settings, label: "Configurações", to: "/partner/configuracoes" },
];

export function PartnerQuickActions() {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardContent className="p-4">
        <h3 className="text-sm font-medium mb-3">Ações rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {ACTIONS.map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className="flex w-full min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-border p-3 text-xs text-foreground hover:bg-secondary/40 hover:border-primary/40 transition break-words"
            >
              <a.icon className="h-4 w-4 shrink-0" />
              <span className="text-center break-words">{a.label}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default PartnerQuickActions;
