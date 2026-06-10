import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ShieldCheck,
  Globe,
  Instagram,
  Newspaper,
  Building2,
  Radar,
  Film,
  Shield,
  Sparkles,
  Palette,
  Search,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  /** Optional permission gate. Empty/undefined = visible to every admin role. */
  permissions?: string[];
  /** Optional feature flag key (env or runtime). Undefined = always enabled. */
  featureFlag?: string;
}

/**
 * Single source of truth for the admin sidebar/bottom-nav.
 * Both desktop (`md:block` aside) and mobile (`md:hidden` bottom nav) consume this list.
 *
 * Adding/removing a menu item here updates Preview and Production simultaneously,
 * which fixes the divergence reported between environments.
 */
export const ADMIN_NAVIGATION: AdminNavItem[] = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/aura", icon: Sparkles, label: "Aura" },
  { to: "/admin/eventos", icon: CalendarDays, label: "Eventos" },
  { to: "/admin/jogos", icon: Trophy, label: "Jogos" },
  { to: "/admin/premiacoes", icon: Trophy, label: "Premiações" },
  { to: "/admin/radar-ia", icon: Radar, label: "Radar IA" },
  { to: "/admin/autoreels", icon: Film, label: "AutoReels" },
  { to: "/admin/security", icon: Shield, label: "Segurança" },
  { to: "/admin/noticias", icon: Newspaper, label: "Notícias" },
  { to: "/admin/sugestoes", icon: Search, label: "Captação" },
  { to: "/admin/eventou", icon: Globe, label: "Eventou" },
  { to: "/admin/instagram", icon: Instagram, label: "Instagram" },
  { to: "/admin/estabelecimentos", icon: Building2, label: "Estabelecimentos" },
  { to: "/admin/parceiros", icon: Users, label: "Parceiros (legado)" },
  { to: "/admin/editores", icon: ShieldCheck, label: "Editores" },
];
