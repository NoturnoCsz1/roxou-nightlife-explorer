import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Car, Bus, Navigation, MapPinned, ArrowRight } from "lucide-react";

type HubCard = {
  to: string;
  emoji: string;
  icon: typeof Car;
  title: string;
  description: string;
  cta: string;
  badge?: string;
  featured?: boolean;
  accent: string;
};

const cards: HubCard[] = [
  {
    to: "/transportes/excursoes",
    emoji: "🚍",
    icon: Bus,
    title: "Excursões Oficiais",
    description: "Vans, ônibus e transfers para eventos com embarque por QR Code.",
    cta: "Ver excursões disponíveis",
    badge: "NOVIDADE",
    featured: true,
    accent: "from-amber-500/25 to-orange-600/15 border-amber-400/40",
  },
  {
    to: "/transportes/privativo",
    emoji: "🚖",
    icon: Navigation,
    title: "Transporte Privativo",
    description: "Solicite ida e volta para eventos com motoristas parceiros.",
    cta: "Solicitar transporte",
    accent: "from-sky-500/20 to-cyan-600/10 border-sky-400/30",
  },
  {
    to: "/transportes/caronas",
    emoji: "🚗",
    icon: Car,
    title: "Caronas",
    description: "Encontre ou ofereça uma carona para o evento.",
    cta: "Encontrar caronas",
    accent: "from-fuchsia-500/20 to-purple-600/10 border-fuchsia-400/30",
  },
  {
    to: "/transportes/minhas",
    emoji: "📍",
    icon: MapPinned,
    title: "Minhas Viagens",
    description: "Acompanhe suas reservas e localização.",
    cta: "Ver minhas viagens",
    accent: "from-emerald-500/20 to-teal-600/10 border-emerald-400/30",
  },
];

export default function TransportesHubPage() {
  useEffect(() => {
    document.title = "Roxou Transportes | Transporte para eventos";
  }, []);
  return (
    <div className="min-h-[calc(100vh-64px)] w-full overflow-x-hidden bg-gradient-to-b from-[#0b0418] to-[#150726] px-4 pb-24 pt-4 text-white">
      <header className="mx-auto w-full max-w-2xl">
        <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-300/80">Roxou Transportes</p>
        <h1 className="mt-1 font-['Space_Grotesk'] text-2xl font-bold leading-tight sm:text-3xl">
          Como você vai pro evento?
        </h1>
        <p className="mt-1.5 text-sm text-white/70">
          Escolha como deseja chegar ao evento. Caronas, excursões, transporte privativo e acompanhamento em tempo real.
        </p>
      </header>

      <section className="mx-auto mt-4 grid w-full max-w-2xl gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.to}
              to={card.to}
              className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl border bg-gradient-to-br ${card.accent} p-4 backdrop-blur transition active:scale-[0.99] ${
                card.featured ? "min-h-[112px]" : "min-h-[96px]"
              }`}
            >
              <div
                className={`flex shrink-0 items-center justify-center rounded-xl bg-white/10 text-2xl ${
                  card.featured ? "h-14 w-14" : "h-12 w-12"
                }`}
                aria-hidden
              >
                {card.emoji}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex items-center gap-2">
                  <h2 className={`min-w-0 truncate font-['Space_Grotesk'] font-semibold ${card.featured ? "text-lg" : "text-base"}`}>
                    {card.title}
                  </h2>
                  {card.badge && (
                    <span className="shrink-0 rounded-full border border-amber-300/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
                      {card.badge}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-white/70">
                  {card.description}
                </p>
                <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-white/90 transition group-hover:text-white">
                  {card.cta}
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </span>
              </div>
              <Icon className={`pointer-events-none absolute -bottom-2 -right-2 text-white/5 ${card.featured ? "h-20 w-20" : "h-16 w-16"}`} />
            </Link>
          );
        })}
      </section>

      <p className="mx-auto mt-6 w-full max-w-2xl text-center text-[11px] text-white/40">
        A Roxou conecta passageiros e organizadores. Para informações oficiais consulte o organizador
        do evento.
      </p>
    </div>
  );
}
