/**
 * partnerNavigation — Onda 1 (Partner Pro V2).
 *
 * Configuração declarativa da navegação do portal parceiro,
 * agrupada por contexto operacional (Operação / Marketing / Negócio / Configurações).
 *
 * Cada item declara o(s) modo(s) em que aparece. A sidebar usa esta config
 * para renderizar os grupos e os gates de papel.
 *
 * Não cria rotas — apenas referencia caminhos já registrados em src/apps/partner/App.tsx.
 */
import {
  BadgeDollarSign,
  BarChart3,
  Building2,
  Calendar,
  ClipboardList,
  Cog,
  CreditCard,
  Hourglass,
  Instagram,
  Layers,
  LayoutDashboard,
  LineChart,
  Link2,
  ListChecks,
  type LucideIcon,
  Megaphone,
  MessageCircle,
  Plug,
  QrCode,
  Receipt,
  Rocket,
  ScanLine,
  Settings,
  Sparkles,
  Star,
  Target,
  Trophy,
  Truck,
  Users,
  Users2,
  Wallet,
} from "lucide-react";
import type { PartnerMode } from "../hooks/usePartnerRole";

export type NavGroupId = "operacao" | "marketing" | "negocio" | "configuracoes" | "promoter";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Em quais modos aparece. */
  modes: PartnerMode[];
  /** Match adicional além do `to` (para destacar sub-rotas). */
  match?: (pathname: string) => boolean;
  /** Marca itens "em breve" — renderiza opacos / não navega. */
  comingSoon?: boolean;
  /** Curto badge opcional (ex: "novo"). */
  badge?: string;
}

export interface NavGroup {
  id: NavGroupId;
  label: string;
  items: NavItem[];
}

const MANAGER_LIKE: PartnerMode[] = ["superAdmin", "manager"];
const OPERATIONAL: PartnerMode[] = ["superAdmin", "manager", "staff"];

/** Navegação completa — gestores/admins. */
export const FULL_NAVIGATION: NavGroup[] = [
  {
    id: "operacao",
    label: "Operação",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, modes: OPERATIONAL, match: (p) => p === "/" || p === "/dashboard" },
      { to: "/reservas", label: "Reservas", icon: Calendar, modes: OPERATIONAL, match: (p) => p.startsWith("/reservas") && !p.startsWith("/reservas/configuracoes") && !p.startsWith("/reservas/tipos") },
      { to: "/reservas/fila", label: "Atendimento", icon: Hourglass, modes: OPERATIONAL, match: (p) => p.startsWith("/fila") || p.startsWith("/reservas/fila") },
      { to: "/validator", label: "Check-in", icon: ScanLine, modes: OPERATIONAL },
      { to: "/reservas/equipe", label: "Equipe", icon: Users, modes: MANAGER_LIKE },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    items: [
      { to: "/eventos", label: "Eventos", icon: Sparkles, modes: MANAGER_LIKE, match: (p) => p.startsWith("/eventos") },
      { to: "/listas", label: "Listas VIP", icon: ListChecks, modes: MANAGER_LIKE, match: (p) => p.startsWith("/listas") || p.startsWith("/lista-vip") },
      { to: "/promoter-central", label: "Promoters", icon: Megaphone, modes: MANAGER_LIKE },
      { to: "/bio", label: "Bio", icon: Link2, modes: MANAGER_LIKE, match: (p) => p.startsWith("/bio") },
      { to: "/bio/menu", label: "Cardápio", icon: ClipboardList, modes: MANAGER_LIKE, comingSoon: false },
      { to: "/bio/qr", label: "QR Codes", icon: QrCode, modes: MANAGER_LIKE },
      { to: "/analytics", label: "Analytics", icon: BarChart3, modes: MANAGER_LIKE },
    ],
  },
  {
    id: "negocio",
    label: "Negócio",
    items: [
      { to: "/relatorios", label: "Relatórios", icon: LineChart, modes: MANAGER_LIKE },
      { to: "/crm", label: "CRM", icon: Users2, modes: MANAGER_LIKE, match: (p) => p.startsWith("/crm") },
      { to: "/crm?tab=clientes", label: "Clientes", icon: Star, modes: MANAGER_LIKE },
    ],
  },
  {
    id: "configuracoes",
    label: "Configurações",
    items: [
      { to: "/perfil", label: "Estabelecimento", icon: Building2, modes: MANAGER_LIKE },
      { to: "/configuracoes#pix", label: "PIX", icon: Wallet, modes: MANAGER_LIKE, comingSoon: true },
      { to: "/configuracoes#integracoes", label: "Integrações", icon: Plug, modes: MANAGER_LIKE, comingSoon: true },
      { to: "/configuracoes#whatsapp", label: "WhatsApp", icon: MessageCircle, modes: MANAGER_LIKE, comingSoon: true },
      { to: "/configuracoes#instagram", label: "Instagram", icon: Instagram, modes: MANAGER_LIKE, comingSoon: true },
      { to: "/configuracoes#google", label: "Google", icon: Cog, modes: MANAGER_LIKE, comingSoon: true },
      { to: "/configuracoes#assinatura", label: "Assinatura", icon: CreditCard, modes: MANAGER_LIKE, comingSoon: true },
      { to: "/configuracoes", label: "Sistema", icon: Settings, modes: MANAGER_LIKE, match: (p) => p === "/configuracoes" || p.startsWith("/configuracoes/") },
    ],
  },
];

/** Navegação exclusiva do promoter. */
export const PROMOTER_NAVIGATION: NavGroup[] = [
  {
    id: "promoter",
    label: "Promoter",
    items: [
      { to: "/promoter-central", label: "Meu Dashboard", icon: LayoutDashboard, modes: ["promoter"], match: (p) => p === "/promoter-central" || p === "/" },
      { to: "/promoter-central?tab=campanhas", label: "Minhas Campanhas", icon: Rocket, modes: ["promoter"] },
      { to: "/promoter-central?tab=qr", label: "Meu QR Code", icon: QrCode, modes: ["promoter"] },
      { to: "/promoter-central?tab=compartilhar", label: "Meus Links", icon: Link2, modes: ["promoter"] },
      { to: "/listas", label: "Minha Lista VIP", icon: ListChecks, modes: ["promoter"] },
      { to: "/reservas", label: "Minhas Reservas", icon: Calendar, modes: ["promoter"] },
      { to: "/transportes/excursoes", label: "Minhas Excursões", icon: Truck, modes: ["promoter"] },
      { to: "/promoter-central?tab=comissoes", label: "Minhas Comissões", icon: BadgeDollarSign, modes: ["promoter"] },
      { to: "/promoter-central?tab=ranking", label: "Meu Ranking", icon: Trophy, modes: ["promoter"] },
      { to: "/promoter-central?tab=metas", label: "Minhas Metas", icon: Target, modes: ["promoter"] },
      { to: "/perfil", label: "Meu Perfil", icon: Receipt, modes: ["promoter"] },
    ],
  },
];

export function getNavigationForMode(mode: PartnerMode): NavGroup[] {
  if (mode === "promoter") return PROMOTER_NAVIGATION;
  if (mode === "staff") {
    // Staff: apenas operação visível.
    return FULL_NAVIGATION.filter((g) => g.id === "operacao").map((g) => ({
      ...g,
      items: g.items.filter((i) => i.modes.includes("staff")),
    }));
  }
  // Manager / superAdmin / none → full (sem filtro extra).
  return FULL_NAVIGATION.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.modes.some((m) => m === mode || mode === "superAdmin")),
  }));
}

/** Utilitário: rotas duplicadas que devem redirecionar para o caminho canônico. */
export const ROUTE_REDIRECTS: Record<string, string> = {
  // /fila é o único caso onde mantemos o caminho curto como canônico para o bottom-nav atual.
  // As demais duplicações migram para o módulo Transportes (decisão do usuário).
  "/excursoes": "/transportes/excursoes",
  "/excursoes/veiculos": "/transportes/veiculos",
  "/excursoes/viagens": "/transportes/viagens",
  "/excursoes/configuracoes": "/transportes/configuracoes",
  "/configuracoes/operacao": "/reservas/operacao",
};

export { Layers };
