/**
 * MotoristaHubPage — área dedicada ao motorista.
 *
 * Sub-rotas previstas:
 *  /transportes/motorista          → hub (atual)
 *  /transportes/motorista/viagens  → placeholder
 *  /transportes/motorista/gps      → placeholder
 *  /transportes/motorista/checkins → placeholder
 *
 * O painel completo do motorista de caronas continua acessível via
 * V3DriverBoard em `/motorista` para não quebrar o fluxo atual.
 */
import { Suspense, lazy, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BusFront, MapPin, QrCode, Route } from "lucide-react";
import { Card } from "@/components/ui/card";

const V3DriverBoard = lazy(() => import("@/pages/v3/V3DriverBoard"));

type Tile = {
  to: string;
  emoji: string;
  title: string;
  desc: string;
  badge?: string;
};

const tiles: Tile[] = [
  {
    to: "/transportes/motorista/viagens",
    emoji: "🚍",
    title: "Próximas viagens",
    desc: "Veja as excursões que você vai dirigir.",
    badge: "Em breve",
  },
  {
    to: "/transportes/motorista/gps",
    emoji: "📍",
    title: "Compartilhar GPS",
    desc: "Inicie a transmissão do trajeto em tempo real.",
    badge: "Em breve",
  },
  {
    to: "/transportes/motorista/checkins",
    emoji: "🎫",
    title: "Embarques",
    desc: "Liste passageiros embarcados e pendentes.",
    badge: "Em breve",
  },
];

const iconFor = (emoji: string) => {
  switch (emoji) {
    case "🚍":
      return BusFront;
    case "📍":
      return MapPin;
    case "🎫":
      return QrCode;
    default:
      return Route;
  }
};

export default function MotoristaHubPage() {
  useEffect(() => {
    document.title = "Motorista · Roxou Transporte";
  }, []);

  return (
    <main
      className="min-h-screen w-full"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto w-full max-w-md px-4 py-4 space-y-4">
        <Link
          to="/transportes"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Transporte
        </Link>

        <header className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-primary">
            🚐 Área do motorista
          </p>
          <h1 className="text-2xl font-bold">Sua próxima viagem</h1>
          <p className="text-xs text-muted-foreground">
            Inicie, acompanhe e confirme embarques sem misturar com o app do
            passageiro.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-3">
          {tiles.map((tile) => {
            const Icon = iconFor(tile.emoji);
            return (
              <Link key={tile.to} to={tile.to}>
                <Card className="p-4 flex items-center gap-3 hover:border-primary/40 transition">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-purple-600/20 flex items-center justify-center text-xl">
                    {tile.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold flex items-center gap-2">
                      {tile.title}
                      {tile.badge ? (
                        <span className="text-[10px] uppercase tracking-wide text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-full px-1.5 py-0.5">
                          {tile.badge}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {tile.desc}
                    </p>
                  </div>
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                </Card>
              </Link>
            );
          })}
        </div>

        <section className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Caronas — painel atual
          </p>
          <Suspense
            fallback={
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Carregando painel…
              </Card>
            }
          >
            <V3DriverBoard />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
