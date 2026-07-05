// ─── HomeSections — BentoGrid, CategoryBentoCard, VibeSelector, Rail, QuickFilterTabs ───
// Extraído de src/pages/v3/V3Home.tsx (Fase 5). JSX, classes e estilos idênticos.

import { Link } from "react-router-dom";
import {
  ArrowRight, Beer, CalendarDays, Car, Flame, Mic2, Music, PartyPopper, PiggyBank,
  Utensils, Zap,
} from "lucide-react";
import FadeSection from "@/components/v3/home/FadeSection";
import { useScrollFadeIn } from "@/shared/hooks/useScrollFadeIn";
import { VIBE_FILTERS } from "./constants";

// silencia lint para ícones expostos pelas referências quando necessário
void Music; void PiggyBank;

/* ─── BENTO GRID — Transport hero + category quick-actions ─── */
export function BentoGrid() {
  const quickCats = [
    {
      categoryKey: "festa",
      label: "Festas",
      icon: PartyPopper,
      background:
        "radial-gradient(circle at 20% 18%, hsl(var(--accent) / 0.42), transparent 28%), radial-gradient(circle at 78% 22%, hsl(var(--primary) / 0.35), transparent 24%), linear-gradient(135deg, hsl(var(--primary) / 0.32), hsl(var(--card) / 0.78))",
      texture: "confetti",
    },
    {
      categoryKey: "show",
      label: "Shows",
      icon: Mic2,
      background:
        "linear-gradient(115deg, transparent 0 30%, hsl(var(--primary) / 0.30) 31% 35%, transparent 36% 100%), linear-gradient(245deg, transparent 0 26%, hsl(var(--accent) / 0.26) 27% 31%, transparent 32% 100%), linear-gradient(135deg, hsl(var(--secondary) / 0.95), hsl(var(--card) / 0.82))",
      texture: "stage",
    },
    {
      categoryKey: "balada",
      label: "Baladas",
      icon: Zap,
      background:
        "repeating-linear-gradient(118deg, hsl(var(--foreground) / 0.10) 0 2px, transparent 2px 18px), radial-gradient(circle at 76% 28%, hsl(var(--accent) / 0.36), transparent 30%), linear-gradient(135deg, hsl(var(--accent) / 0.30), hsl(var(--card) / 0.84))",
      texture: "strobo",
    },
    {
      categoryKey: "bar",
      label: "Bares",
      icon: Beer,
      background:
        "radial-gradient(circle at 28% 26%, hsl(var(--badge-bar) / 0.38), transparent 26%), radial-gradient(circle at 86% 70%, hsl(var(--badge-hoje) / 0.24), transparent 24%), linear-gradient(135deg, hsl(var(--secondary) / 0.92), hsl(var(--card) / 0.78))",
      texture: "bar",
    },
    {
      categoryKey: "restaurante",
      label: "Restaurantes",
      icon: Utensils,
      background:
        "radial-gradient(circle at 30% 30%, hsl(var(--v3-neon) / 0.34), transparent 28%), radial-gradient(circle at 80% 80%, hsl(var(--v3-neon-soft) / 0.28), transparent 28%), linear-gradient(135deg, hsl(var(--card) / 0.92), hsl(var(--secondary) / 0.78))",
      texture: "bar",
    },
    {
      categoryKey: "gastrobar",
      label: "Gastrobar",
      icon: Zap,
      background:
        "radial-gradient(circle at 22% 30%, hsl(var(--accent) / 0.32), transparent 28%), radial-gradient(circle at 82% 72%, hsl(var(--primary) / 0.26), transparent 28%), linear-gradient(135deg, hsl(var(--secondary) / 0.92), hsl(var(--card) / 0.82))",
      texture: "bar",
    },
  ] as const;

  return (
    <FadeSection className="px-4 pt-5 pb-3">
      <div className="grid grid-cols-2 gap-3 auto-rows-[136px]">
        <Link
          to="/transporte"
          className="col-span-2 relative rounded-3xl overflow-hidden p-4 flex flex-col justify-between active:scale-[0.98] hover:scale-[1.02] transition-transform duration-300 group v3-neon-hover"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--v3-neon)) 0%, hsl(var(--v3-neon-soft)) 60%, hsl(270 80% 35%) 100%)",
          }}
        >
          <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/20 blur-3xl group-hover:scale-110 transition-transform duration-500" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-black/20 blur-3xl" />

          <div className="relative flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-sm text-[9px] font-extrabold text-white uppercase tracking-widest">
              Transporte
            </span>
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:rotate-[-8deg] transition-transform duration-500">
              <Car className="w-7 h-7 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]" />
            </div>
          </div>

          <div className="relative space-y-1">
            <h3 className="font-display font-black text-2xl text-white leading-none">
              COMO VOCÊ<br />VAI?
            </h3>
            <p className="text-[11px] font-medium text-white/80">
              Encontre carona pro próximo rolê
            </p>
            <div className="flex items-center gap-1 pt-1.5 text-[10px] font-bold text-white uppercase tracking-wider">
              Pedir agora <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </Link>

        <div className="hidden lg:contents">
          {quickCats.map((cat) => <CategoryBentoCard key={cat.categoryKey} {...cat} />)}
        </div>
      </div>
    </FadeSection>
  );
}

export function CategoryBentoCard({
  categoryKey,
  label,
  icon: Icon,
  background,
  texture,
}: {
  categoryKey: string;
  label: string;
  icon: typeof PartyPopper;
  background: string;
  texture: "confetti" | "stage" | "strobo" | "bar";
}) {
  return (
    <Link
      to={`/descobrir?cat=${categoryKey}`}
      className="relative rounded-3xl overflow-hidden v3-glass v3-neon-hover active:scale-[0.96] hover:scale-105 transition-transform duration-300 group"
      style={{ background }}
    >
      <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]" />
      {texture === "confetti" && (
        <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "radial-gradient(circle at 30% 30%, hsl(var(--foreground) / 0.25) 0 2px, transparent 3px), radial-gradient(circle at 62% 42%, hsl(var(--accent) / 0.28) 0 2px, transparent 3px), radial-gradient(circle at 78% 68%, hsl(var(--primary) / 0.24) 0 2px, transparent 3px)" }} />
      )}
      {texture === "stage" && <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background/85 to-transparent" />}
      {texture === "bar" && <div className="absolute inset-x-6 bottom-5 h-8 rounded-full border border-foreground/12 bg-foreground/5 blur-[1px]" />}

      <div className="absolute top-3 right-3 w-9 h-9 rounded-2xl v3-glass-strong flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
        <Icon className="w-4.5 h-4.5 text-primary drop-shadow-[0_0_10px_hsl(var(--primary)/0.8)]" />
      </div>
      <div className="absolute bottom-4 left-4 right-4">
        <span className="font-display text-[17px] font-black uppercase tracking-wide text-foreground v3-neon-text leading-tight line-clamp-2 break-words">
          {label}
        </span>
      </div>
      <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-foreground/10 group-hover:ring-primary/55 transition-colors" />
    </Link>
  );
}

export function VibeSelector({ selected, onSelect }: { selected: string; onSelect: (key: string) => void }) {
  return (
    <FadeSection className="px-4 pt-2 pb-6">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory">
        {VIBE_FILTERS.map((vibe) => {
          const active = selected === vibe.key;
          return (
            <button
              key={vibe.key}
              type="button"
              onClick={() => onSelect(active ? "" : vibe.key)}
              className={`shrink-0 snap-start rounded-2xl px-4 py-2.5 text-[11px] font-extrabold border transition-all active:scale-95 ${
                active
                  ? "gradient-primary text-primary-foreground border-primary/50 neon-glow"
                  : "v3-glass text-foreground border-border/40 hover:border-primary/40"
              }`}
            >
              {vibe.label}
            </button>
          );
        })}
      </div>
    </FadeSection>
  );
}

/* ─── CONTENT RAIL — refined spacing ─── */
export function Rail({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { ref, visible } = useScrollFadeIn();
  return (
    <section ref={ref} className={`py-2.5 transition-all duration-500 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      <div className="flex items-end justify-between px-4 mb-2">
        <div>
          <h2 className="font-display font-bold text-[15px] text-foreground">{title}</h2>
          {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide snap-x snap-mandatory">
        {children}
      </div>
    </section>
  );
}

/* ─── QUICK FILTER TABS — Hoje · 7 dias ─── */
export function QuickFilterTabs({ todayCount, weekCount }: { todayCount: number; weekCount: number }) {
  const tabs = [
    { key: "hoje", label: "Hoje", count: todayCount, to: "/agenda?filter=today", icon: Flame },
    { key: "semana", label: "Próx. 7 dias", count: weekCount, to: "/agenda?filter=week", icon: CalendarDays },
  ];
  return (
    <FadeSection className="px-4 pt-3 pb-1">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        {tabs.map(({ key, label, count, to, icon: Icon }) => (
          <Link
            key={key}
            to={to}
            className="shrink-0 snap-start group inline-flex items-center gap-2 rounded-2xl px-4 py-3 border transition-all active:scale-95 border-border/40 v3-glass hover:border-primary/40"
          >
            <Icon className="w-4 h-4 text-foreground/80 group-hover:text-primary" />
            <span className="text-[12px] font-extrabold uppercase tracking-wider text-foreground">
              {label}
            </span>
            {count !== null && count > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-primary/25 text-[10px] font-black text-primary leading-none">
                {count}
              </span>
            )}
          </Link>
        ))}
      </div>
    </FadeSection>
  );
}
