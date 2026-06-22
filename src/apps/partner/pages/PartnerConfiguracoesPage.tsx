/**
 * PartnerConfiguracoesPage — Configurações Partner Pro.
 * Lista categorias e navega para páginas existentes sem alterar formulários.
 */
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Store,
  CalendarRange,
  Crown,
  Users,
  CreditCard,
  Bell,
  BarChart3,
  ScanLine,
  LogOut,
  Search,
  Wallet,
  MessageSquare,
  Clock as ClockIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { PartnerScreen } from "../components/PartnerScreen";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackPartnerClient } from "../lib/partnerInteractions";

type Section = {
  title: string;
  items: Array<{
    icon: typeof Store;
    label: string;
    to?: string;
    onClick?: () => void;
    hint?: string;
    danger?: boolean;
  }>;
};

const PartnerConfiguracoesPage = () => {
  const navigate = useNavigate();
  const { selectedPartner } = usePartnerAuth();

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({ title: "Sessão encerrada" });
      navigate("/login", { replace: true });
    } catch {
      toast({ title: "Erro ao sair", variant: "destructive" });
    }
  };

  const sections: Section[] = [
    {
      title: "Estabelecimento",
      items: [
        { icon: Store, label: "Perfil público", to: "/perfil" },
        { icon: CalendarRange, label: "Eventos", to: "/eventos" },
        { icon: ScanLine, label: "Validador de check-in", to: "/validator" },
      ],
    },
    {
      title: "Reservas & VIP",
      items: [
        { icon: CalendarRange, label: "Reservas e tipos", to: "/reservas" },
        { icon: Crown, label: "Listas VIP", to: "/lista-vip" },
        { icon: Users, label: "Equipe & permissões", to: "/configuracoes" },
      ],
    },
    {
      title: "Negócio",
      items: [
        { icon: BarChart3, label: "Analytics avançado", to: "/analytics" },
        { icon: CreditCard, label: "Assinatura", to: "/configuracoes" },
        { icon: Bell, label: "Notificações", to: "/configuracoes" },
      ],
    },
    {
      title: "Conta",
      items: [
        { icon: LogOut, label: "Sair", onClick: signOut, danger: true },
      ],
    },
  ];

  return (
    <PartnerScreen
      title="Configurações"
      subtitle={selectedPartner?.name ?? undefined}
    >
      {sections.map((section) => (
        <div key={section.title} className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-1">
            {section.title}
          </div>
          <Card className="overflow-hidden divide-y divide-white/5 border-white/8 bg-white/[0.03]">
            {section.items.map((item) => {
              const inner = (
                <div className="flex items-center gap-3 px-3 py-3 min-w-0">
                  <item.icon
                    className={`h-4.5 w-4.5 shrink-0 ${
                      item.danger ? "text-rose-300" : "text-foreground/70"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm truncate ${
                        item.danger ? "text-rose-300" : "text-foreground"
                      }`}
                    >
                      {item.label}
                    </div>
                    {item.hint ? (
                      <div className="text-[11px] text-muted-foreground truncate">
                        {item.hint}
                      </div>
                    ) : null}
                  </div>
                  {item.to ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                  ) : null}
                </div>
              );
              if (item.onClick) {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className="block w-full text-left hover:bg-white/[0.04] transition"
                  >
                    {inner}
                  </button>
                );
              }
              return (
                <Link
                  key={item.label}
                  to={item.to ?? "#"}
                  className="block hover:bg-white/[0.04] transition"
                >
                  {inner}
                </Link>
              );
            })}
          </Card>
        </div>
      ))}

      <div className="pt-2">
        <Button variant="ghost" size="sm" className="w-full" asChild>
          <Link to="/">← Voltar ao início</Link>
        </Button>
      </div>
    </PartnerScreen>
  );
};

export default PartnerConfiguracoesPage;
