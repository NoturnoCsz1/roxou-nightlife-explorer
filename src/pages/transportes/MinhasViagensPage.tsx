/**
 * MinhasViagensPage — hub do passageiro.
 *
 * Tabs: Todas · Caronas · Excursões · Privativo.
 * Caronas reaproveita V3MyRides já existente. Excursões e Privativo são
 * estados vazios informativos com CTA enquanto os módulos de histórico do
 * passageiro (ainda) não foram implementados.
 */
import { Suspense, lazy, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BusFront, Car, Navigation } from "lucide-react";
import { Card } from "@/components/ui/card";

const V3MyRides = lazy(() => import("@/pages/v3/V3MyRides"));

type TabKey = "todas" | "caronas" | "excursoes" | "privativo";

const TABS: { key: TabKey; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "caronas", label: "Caronas" },
  { key: "excursoes", label: "Excursões" },
  { key: "privativo", label: "Privativo" },
];

function EmptyTripState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaTo,
}: {
  icon: typeof Car;
  title: string;
  description: string;
  ctaLabel: string;
  ctaTo: string;
}) {
  return (
    <Card className="p-5 text-center space-y-3">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Link
        to={ctaTo}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
      >
        {ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </Card>
  );
}

export default function MinhasViagensPage() {
  const [tab, setTab] = useState<TabKey>("todas");

  useEffect(() => {
    document.title = "Minhas viagens · Roxou";
  }, []);

  return (
    <main
      className="min-h-screen w-full overflow-x-hidden"
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
          <ArrowLeft className="h-3.5 w-3.5" /> Transportes
        </Link>

        <header className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-primary">
            📍 Minhas viagens
          </p>
          <h1 className="text-2xl font-bold">Histórico e próximas viagens</h1>
        </header>

        <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                tab === t.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "todas" || tab === "excursoes" ? (
          <section className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <BusFront className="h-3.5 w-3.5" /> Excursões
            </div>
            <EmptyTripState
              icon={BusFront}
              title="Nenhuma excursão encontrada"
              description="Reserve um assento em uma excursão oficial e ela aparecerá aqui."
              ctaLabel="Explorar excursões"
              ctaTo="/transportes/excursoes"
            />
          </section>
        ) : null}

        {tab === "todas" || tab === "privativo" ? (
          <section className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Navigation className="h-3.5 w-3.5" /> Privativo
            </div>
            <EmptyTripState
              icon={Navigation}
              title="Nenhum transporte privado encontrado"
              description="Solicite ida e volta com motoristas parceiros para os próximos eventos."
              ctaLabel="Solicitar transporte"
              ctaTo="/transportes/privativo"
            />
          </section>
        ) : null}

        {tab === "todas" || tab === "caronas" ? (
          <section className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Car className="h-3.5 w-3.5" /> Caronas
            </div>
            <Suspense
              fallback={
                <Card className="p-6 text-center text-sm text-muted-foreground">
                  Carregando caronas…
                </Card>
              }
            >
              <V3MyRides />
            </Suspense>
            <EmptyTripState
              icon={Car}
              title="Quer encontrar mais caronas?"
              description="Veja eventos com sistema de carona aberto agora."
              ctaLabel="Buscar caronas"
              ctaTo="/transportes/caronas"
            />
          </section>
        ) : null}
      </div>
    </main>
  );
}
