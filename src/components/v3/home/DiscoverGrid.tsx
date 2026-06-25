// ─── DiscoverGrid — modern 2-col category grid (mobile-first) ───
import { Link } from "react-router-dom";
import {
  Beer, PartyPopper, Utensils, Music, Trophy, Bus, Ticket, Newspaper,
  ArrowRight, ChevronRight,
} from "lucide-react";
import FadeSection from "@/components/v3/home/FadeSection";

type Cat = {
  to: string;
  label: string;
  emoji: string;
  Icon: typeof Beer;
  tint: string; // tailwind gradient classes for icon bg
};

const CATS: Cat[] = [
  { to: "/descobrir?cat=bar", label: "Bares", emoji: "🍻", Icon: Beer, tint: "from-amber-500/30 to-orange-500/10" },
  { to: "/descobrir?cat=festa", label: "Festas", emoji: "🎉", Icon: PartyPopper, tint: "from-pink-500/30 to-purple-500/10" },
  { to: "/descobrir?cat=restaurante", label: "Restaurantes", emoji: "🍽", Icon: Utensils, tint: "from-emerald-500/30 to-teal-500/10" },
  { to: "/descobrir?cat=show", label: "Música", emoji: "🎵", Icon: Music, tint: "from-fuchsia-500/30 to-violet-500/10" },
  { to: "/jogos", label: "Jogos ao vivo", emoji: "⚽", Icon: Trophy, tint: "from-amber-400/30 to-yellow-500/10" },
  { to: "/transportes", label: "Transportes", emoji: "🚍", Icon: Bus, tint: "from-sky-500/30 to-indigo-500/10" },
  { to: "/agenda", label: "Ingressos", emoji: "🎟", Icon: Ticket, tint: "from-rose-500/30 to-red-500/10" },
  { to: "/noticias", label: "Notícias", emoji: "📰", Icon: Newspaper, tint: "from-slate-400/30 to-zinc-500/10" },
];

export function DiscoverGrid() {
  return (
    <FadeSection className="px-4 pt-4 pb-2">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="font-display font-extrabold text-lg text-foreground uppercase tracking-wide">
            Descobrir mais
          </h2>
          <p className="text-[10px] text-muted-foreground -mt-0.5">
            Navegue por categoria
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {CATS.map(({ to, label, emoji, Icon, tint }) => (
          <Link
            key={label}
            to={to}
            className="group relative rounded-2xl p-3 bg-card border border-border/40 hover:border-primary/40 active:scale-[0.97] hover:scale-[1.02] transition-all duration-200 overflow-hidden min-w-0"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${tint} opacity-70 group-hover:opacity-100 transition-opacity`} />
            <div className="relative flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xl shrink-0" aria-hidden>{emoji}</span>
                <span className="font-display font-bold text-[13px] text-foreground truncate">
                  {label}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
            <Icon aria-hidden className="absolute -bottom-2 -right-2 w-10 h-10 text-foreground/5" />
          </Link>
        ))}
      </div>
    </FadeSection>
  );
}

export function TransportCTA() {
  return (
    <FadeSection className="px-4 pt-2 pb-3">
      <Link
        to="/transportes"
        className="group relative flex items-center gap-3 rounded-2xl p-3.5 bg-gradient-to-r from-primary/15 via-accent/10 to-transparent border border-primary/30 hover:border-primary/60 active:scale-[0.98] transition-all overflow-hidden min-w-0"
      >
        <div className="w-11 h-11 rounded-xl bg-primary/25 backdrop-blur-sm flex items-center justify-center shrink-0">
          <Bus className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-extrabold text-sm text-foreground leading-tight">
            Vai para o evento?
          </h3>
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug mt-0.5">
            Caronas, excursões e transporte privativo em um único lugar.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-primary uppercase tracking-wide shrink-0">
          Acessar <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
        <ArrowRight className="sm:hidden w-4 h-4 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </FadeSection>
  );
}
