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
    keywords?: string;
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
        { icon: Store, label: "Perfil público", to: "/perfil", keywords: "perfil bio descrição loja logo" },
        { icon: ClockIcon, label: "Horários de funcionamento", to: "/perfil", keywords: "horarios abertura fechamento dias" },
        { icon: CalendarRange, label: "Eventos", to: "/eventos", keywords: "eventos agenda festa show" },
        { icon: ScanLine, label: "Validador de check-in", to: "/validator", keywords: "validador qr checkin entrada portaria" },
      ],
    },
    {
      title: "Reservas & VIP",
      items: [
        { icon: CalendarRange, label: "Reservas e tipos", to: "/reservas", keywords: "reservas mesas bistros camarotes tipos" },
        { icon: Crown, label: "Listas VIP", to: "/lista-vip", keywords: "vip lista entrada cortesia" },
        { icon: Users, label: "Equipe & permissões", to: "/configuracoes/avancado", keywords: "equipe time permissoes promoters usuarios" },
      ],
    },
    {
      title: "Pagamentos & Comunicação",
      items: [
        { icon: Wallet, label: "PIX e pagamentos", to: "/configuracoes/avancado", keywords: "pix pagamento mercadopago cobrança" },
        { icon: MessageSquare, label: "WhatsApp", to: "/configuracoes/avancado", keywords: "whatsapp mensagem zap notificação cliente" },
        { icon: Bell, label: "Notificações", to: "/configuracoes/avancado", keywords: "notificações alerta push email" },
      ],
    },
    {
      title: "Negócio",
      items: [
        { icon: BarChart3, label: "Analytics avançado", to: "/analytics", keywords: "analytics relatorios metricas dashboard" },
        { icon: CreditCard, label: "Assinatura", to: "/configuracoes/avancado", keywords: "assinatura plano cobranca billing" },
      ],
    },
    {
      title: "Conta",
      items: [
        { icon: LogOut, label: "Sair", onClick: signOut, danger: true, keywords: "sair logout encerrar sessao" },
      ],
    },
  ];

  const [query, setQuery] = useState("");

  const normalized = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const filteredSections = useMemo(() => {
    const q = normalized(query.trim());
    if (!q) return sections;
    return sections
      .map((s) => ({
        ...s,
        items: s.items.filter((it) => {
          const hay = normalized(`${it.label} ${it.keywords ?? ""}`);
          return hay.includes(q);
        }),
      }))
      .filter((s) => s.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <PartnerScreen
      title="Configurações"
      subtitle={selectedPartner?.name ?? undefined}
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.length > 1) {
              trackPartnerClient("partner_settings_search", { q: e.target.value });
            }
          }}
          placeholder="Buscar configuração..."
          className="pl-9 bg-white/5 border-white/10"
        />
      </div>

      {filteredSections.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhum resultado para "{query}".
        </p>
      ) : null}

      {filteredSections.map((section) => (
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
