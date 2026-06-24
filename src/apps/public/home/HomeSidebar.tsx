// ─── HomeSidebar — painéis sidebar do desktop ───
// Extraído de src/pages/v3/V3Home.tsx (Fase 5). JSX, classes e estilos idênticos.

import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BadgeCheck, Beer, Bot, CalendarDays, Car, ChevronRight, Gem, Mic2, Music,
  Newspaper, PartyPopper, PiggyBank, Search, Sparkles, Users, Utensils, Zap,
  User as UserIcon,
} from "lucide-react";
import SmartImage from "@/components/v3/SmartImage";
import { useV3Profile } from "@/hooks/useV3Profile";
import type { Ev, VenueRank } from "./types";
import { fmtTime, safeEvents } from "./utils";

export function DesktopProfilePanel() {
  const { user, profile } = useV3Profile();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nickname = (profile as any)?.nickname?.trim();
  const displayName = nickname || profile?.display_name?.split(" ")[0] || "Visitante";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const avatar = (profile as any)?.avatar_url;

  return (
    <Link
      to={user ? "/perfil" : "/auth"}
      className="flex items-center gap-3 rounded-2xl border border-border/20 bg-background/30 p-3 transition-all hover:border-primary/40 hover:bg-primary/10"
    >
      <div className="h-10 w-10 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30">
        {avatar ? <img src={avatar} alt="" decoding="async" className="h-full w-full object-cover" /> : <UserIcon className="h-5 w-5 text-primary" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-black text-foreground truncate">{displayName}</p>
        <p className="text-[10px] text-muted-foreground">{user ? "Ver perfil" : "Entrar / Criar conta"}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    </Link>
  );
}

export function DesktopNavPanel({ todayCount }: { todayCount: number }) {
  const items = [
    { to: "/", label: "Início", icon: Sparkles },
    { to: "/ia", label: "Aura", icon: Bot },
    { to: "/descobrir", label: "Descobrir", icon: Search },
    { to: "/transportes", label: "Transportes", icon: Car },
    { to: "/parceiros", label: "Parceiros", icon: Users },
    { to: "/agenda", label: "Agenda", icon: CalendarDays },
    { to: "/economize", label: "Economize", icon: PiggyBank },
    { to: "/noticias", label: "Notícias", icon: Newspaper },
  ];
  return (
    <div className="rounded-3xl v3-glass-strong p-4">
      <p className="font-display text-2xl font-black text-primary v3-neon-text">ROXOU</p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {todayCount === 0 ? "Buscando o próximo rolê..." : `${todayCount} rolês para decidir a noite.`}
      </p>
      <div className="mt-4 space-y-1.5">
        {items.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="flex items-center gap-3 rounded-xl border border-border/15 bg-background/25 px-3 py-2.5 text-[13px] font-bold text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary">
            <Icon className="h-4 w-4" /> {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

const DESKTOP_CATEGORIES = [
  { key: "festa", label: "Festas", icon: PartyPopper },
  { key: "show", label: "Shows", icon: Mic2 },
  { key: "bar", label: "Bares", icon: Beer },
  { key: "festival", label: "Festivais", icon: Music },
  { key: "gastrobar", label: "Gastrobar", icon: Zap },
  { key: "restaurante", label: "Restaurantes", icon: Utensils },
];

export function DesktopCategoriesPanel() {
  return (
    <div className="rounded-3xl v3-glass p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-3">Categorias</p>
      <div className="grid grid-cols-2 gap-2">
        {DESKTOP_CATEGORIES.map(({ key, label, icon: Icon }) => (
          <Link key={key} to={`/descobrir?cat=${key}`} className="flex flex-col items-center gap-1 rounded-xl border border-border/20 bg-background/25 px-2 py-3 text-[11px] font-bold text-foreground hover:border-primary/40 hover:text-primary transition-all">
            <Icon className="h-4 w-4" /> {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function DesktopWeekPanel({ events }: { events: Ev[] }) {
  const list = safeEvents(events);
  if (!list.length) return null;
  return (
    <div className="rounded-3xl v3-glass p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h2 className="font-display text-base font-black text-foreground">Agenda da semana</h2>
        </div>
        <Link to="/agenda" className="text-[10px] font-bold text-primary hover:underline">Ver tudo</Link>
      </div>
      <div className="space-y-2">
        {list.slice(0, 5).map(ev => (
          <Link key={ev.id} to={`/evento/${ev.slug}`} className="group flex gap-2.5 rounded-xl border border-border/20 bg-background/20 p-2 hover:border-primary/40 hover:bg-primary/5 transition-all">
            <div className="flex flex-col items-center justify-center rounded-lg bg-primary/10 px-2 py-1 min-w-[42px]">
              <span className="text-[8px] font-black uppercase text-primary">{format(new Date(ev.date_time), "MMM", { locale: ptBR })}</span>
              <span className="text-base font-black text-foreground leading-none">{format(new Date(ev.date_time), "dd")}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">{ev.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{fmtTime(ev.date_time)} · {ev.venue_name || "—"}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DesktopFeaturedPartnersPanel({ partners, ranks }: { partners: any[]; ranks: VenueRank[] }) {
  const list = (partners?.length ? partners : ranks).slice(0, 5);
  if (!list.length) return null;
  return (
    <div className="rounded-3xl v3-glass p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gem className="h-4 w-4 text-accent" />
          <h2 className="font-display text-base font-black text-foreground">Parceiros destaque</h2>
        </div>
        <Link
          to="/parceiros"
          className="group inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:text-accent transition-colors"
        >
          Explorar parceiros
          <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <div className="space-y-2">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {list.map((p: any) => (
          <Link
            key={p.id}
            to={`/local/${p.slug}`}
            className={`group flex items-center gap-3 rounded-xl border bg-background/20 p-2 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 ${
              p.verified_partner
                ? "border-primary/25 hover:shadow-[0_0_18px_-4px_hsl(var(--primary)/0.45)]"
                : "border-white/[0.05]"
            }`}
          >
            <div className="h-10 w-10 rounded-lg overflow-hidden bg-secondary/40 flex items-center justify-center shrink-0">
              {p.logo_url ? <img src={p.logo_url} alt={p.name} loading="lazy" className="w-full h-full object-cover" /> : <span className="text-sm font-black text-primary">{p.name?.[0]}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
                {p.name} {p.verified_partner && <BadgeCheck className="inline h-3 w-3 text-primary" />}
              </p>
              <p className="text-[10px] text-muted-foreground truncate capitalize">{p.type}</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function NowPanel({ events }: { events: Ev[] }) {
  const list = safeEvents(events);
  return (
    <div className="rounded-3xl v3-glass-strong p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_14px_hsl(142_71%_45%)]" />
        <h2 className="font-display text-base font-black text-foreground">O que está rolando agora</h2>
      </div>
      <div className="space-y-3">
        {list.map(ev => (
          <Link key={ev.id} to={`/evento/${ev.slug}`} className="group flex gap-3 rounded-2xl border border-border/25 bg-background/25 p-2 transition-all hover:border-primary/40 hover:bg-primary/10">
            <SmartImage
              src={ev.image_url}
              alt={ev.title}
              wrapperClassName="h-14 w-14 rounded-xl shrink-0"
              className="h-14 w-14 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-xs font-black text-foreground group-hover:text-primary">{ev.title}</p>
              <p className="mt-1 truncate text-[10px] text-muted-foreground">{fmtTime(ev.date_time)} · {ev.venue_name || "Local a confirmar"}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
