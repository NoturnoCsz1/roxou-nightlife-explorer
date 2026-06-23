/**
 * PartnerConfiguracoesPage — Configurações Partner Pro.
 * Cada item tem ação garantida: navega para rota real, abre confirmação
 * (logout) ou cai em /configuracoes/em-breve (PartnerComingSoonPage).
 *
 * Checklist auditado:
 *  Perfil público • Horários • Reservas • Tipos de mesa • VIP/Listas •
 *  Equipe • Assinatura • Notificações • Validador • Limpeza • Ferramentas
 *  antigas (Painel antigo, Settings avançado, Link público/QR, Perfil
 *  completo) • Sair (com confirmação).
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
  Sparkles,
  Clock as ClockIcon,
  LayoutDashboard as LayoutDashboardIcon,
  Armchair,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
    comingSoon?: boolean;
  }>;
};

const comingSoon = (titulo: string, desc?: string) =>
  `/configuracoes/em-breve?titulo=${encodeURIComponent(titulo)}${
    desc ? `&desc=${encodeURIComponent(desc)}` : ""
  }`;

const PartnerConfiguracoesPage = () => {
  const navigate = useNavigate();
  const { selectedPartner } = usePartnerAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const doSignOut = async () => {
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
        {
          icon: ClockIcon,
          label: "Horários de funcionamento",
          to: comingSoon(
            "Horários de funcionamento",
            "Defina dias e horários de abertura. Por enquanto edite em Perfil público.",
          ),
          comingSoon: true,
          keywords: "horarios abertura fechamento dias",
        },
        { icon: CalendarRange, label: "Eventos", to: "/eventos", keywords: "eventos agenda festa show" },
        { icon: ScanLine, label: "Validador de check-in", to: "/validator", keywords: "validador qr checkin entrada portaria" },
      ],
    },
    {
      title: "Reservas & VIP",
      items: [
        { icon: CalendarRange, label: "Reservas", to: "/reservas", keywords: "reservas ativas pendentes checkin" },
        {
          icon: Armchair,
          label: "Tipos de mesa",
          to: "/reservas/tipos",
          keywords: "tipos mesa bistro camarote categorias",
        },
        { icon: Crown, label: "Listas VIP", to: "/listas", keywords: "vip lista entrada cortesia promoter participantes" },
        { icon: PlayCircle, label: "Excursões oficiais", to: "/excursoes", keywords: "excursao excursoes onibus van viagem transporte transporte" },
        { icon: Users, label: "Equipe e acessos", to: "/reservas/equipe", keywords: "equipe time permissoes promoters usuarios validador recepcao caixa gerente pin" },
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
        {
          icon: CreditCard,
          label: "Assinatura",
          to: comingSoon(
            "Assinatura",
            "Gestão de planos chega em breve. Use Configurações avançadas para detalhes atuais.",
          ),
          comingSoon: true,
          keywords: "assinatura plano cobranca billing",
        },
      ],
    },
    {
      title: "Operação diária",
      items: [
        {
          icon: PlayCircle,
          label: "Abrir / encerrar operação",
          to: "/configuracoes/operacao",
          hint: "Sessão diária, notificações, histórico e arquivados",
          keywords: "operacao sessao abrir encerrar fechar dia noite reset notificacoes historico reabrir arquivados",
        },
      ],
    },
    {
      title: "Manutenção",
      items: [
        {
          icon: Sparkles,
          label: "Limpeza de registros",
          to: "/configuracoes/limpeza",
          hint: "Arquive reservas, filas e eventos antigos",
          keywords: "limpeza arquivar antigos manutencao cache historico",
        },
      ],
    },
    {
      title: "Ferramentas antigas",
      items: [
        { icon: LayoutDashboardIcon, label: "Painel antigo", to: "/dashboard-antigo", keywords: "dashboard painel antigo legado" },
        { icon: Users, label: "Configurações avançadas (antigas)", to: "/configuracoes/avancado", keywords: "settings antigo legado equipe pix whatsapp" },
        {
          icon: ScanLine,
          label: "Link público / QR Code",
          to: comingSoon(
            "Link público / QR Code",
            "Em breve: geração de link curto e QR Code para divulgar reservas e listas.",
          ),
          comingSoon: true,
          keywords: "link publico qr code compartilhar url",
        },
        { icon: Store, label: "Perfil completo", to: "/perfil", keywords: "perfil completo bio descricao" },
      ],
    },
    {
      title: "Conta",
      items: [
        {
          icon: LogOut,
          label: "Sair",
          onClick: () => setLogoutOpen(true),
          danger: true,
          keywords: "sair logout encerrar sessao",
        },
      ],
    },
  ];

  const [query, setQuery] = useState("");

  const normalized = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

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
              const isNav = !!item.to;
              const inner = (
                <div className="flex items-center gap-3 px-3 py-3 min-w-0">
                  <item.icon
                    className={`h-4.5 w-4.5 shrink-0 ${
                      item.danger ? "text-rose-300" : "text-foreground/70"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-sm truncate ${
                          item.danger ? "text-rose-300" : "text-foreground"
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.comingSoon ? (
                        <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/30">
                          Em breve
                        </span>
                      ) : null}
                    </div>
                    {item.hint ? (
                      <div className="text-[11px] text-muted-foreground truncate">
                        {item.hint}
                      </div>
                    ) : null}
                  </div>
                  {isNav ? (
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

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              Você precisará fazer login novamente para acessar o Partner Pro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={doSignOut}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PartnerScreen>
  );
};

export default PartnerConfiguracoesPage;
