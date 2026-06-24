import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Car, Bus, Navigation, MapPinned, ArrowRight } from "lucide-react";

type HubCard = {
  to: string;
  emoji: string;
  icon: typeof Car;
  title: string;
  description: string;
  badge?: string;
  accent: string;
};

const cards: HubCard[] = [
  {
    to: "/transportes/caronas",
    emoji: "🚗",
    icon: Car,
    title: "Caronas",
    description: "Encontre ou ofereça uma carona para o evento.",
    accent: "from-fuchsia-500/20 to-purple-600/10 border-fuchsia-400/30",
  },
  {
    to: "/transportes/excursoes",
    emoji: "🚍",
    icon: Bus,
    title: "Excursões Oficiais",
    description: "Vans, ônibus e transfers para eventos com embarque por QR Code.",
    accent: "from-amber-500/20 to-orange-600/10 border-amber-400/30",
  },
  {
    to: "/transportes/privativo",
    emoji: "🚖",
    icon: Navigation,
    title: "Transporte Privativo",
    description: "Solicite ida e volta para eventos com motoristas parceiros.",
    accent: "from-sky-500/20 to-cyan-600/10 border-sky-400/30",
  },
  {
    to: "/transportes/minhas",
    emoji: "📍",
    icon: MapPinned,
    title: "Minhas Viagens",
    description: "Acompanhe suas reservas e localização.",
    accent: "from-emerald-500/20 to-teal-600/10 border-emerald-400/30",
  },
];

export default function TransportesHubPage() {
  useEffect(() => {
    document.title = "Roxou Transportes | Transporte para eventos";
  }, []);
  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-[#0b0418] to-[#150726] px-4 pb-24 pt-6 text-white">


      <header className="mx-auto max-w-2xl">
        <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-300/80">Roxou Transportes</p>
        <h1 className="mt-1 font-['Space_Grotesk'] text-3xl font-bold leading-tight">
          Como você vai pro evento?
        </h1>
        <p className="mt-2 text-sm text-white/70">
          Escolha como deseja chegar ao evento. Caronas, excursões, transporte privativo e acompanhamento em tempo real.
        </p>
      </header>

      <section className="mx-auto mt-6 grid max-w-2xl gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.to}
              to={card.to}
              className={`group relative flex items-center gap-4 rounded-2xl border bg-gradient-to-br ${card.accent} p-4 backdrop-blur transition active:scale-[0.99]`}
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-2xl"
                aria-hidden
              >
                {card.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-['Space_Grotesk'] text-base font-semibold">{card.title}</h2>
                  {card.badge && (
                    <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/80">
                      {card.badge}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-white/70">{card.description}</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-white/60 transition group-hover:translate-x-1 group-hover:text-white" />
              <Icon className="pointer-events-none absolute -bottom-2 -right-2 h-16 w-16 text-white/5" />
            </Link>
          );
        })}
      </section>

      <p className="mx-auto mt-8 max-w-2xl text-center text-[11px] text-white/40">
        A Roxou conecta passageiros e organizadores. Para informações oficiais consulte o organizador
        do evento.
      </p>
    </div>
  );
}
