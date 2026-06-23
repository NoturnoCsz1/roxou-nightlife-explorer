/**
 * MinhasViagensPage — hub do passageiro.
 *
 * Tabs: Todas · Caronas · Excursões · Privativo.
 * Caronas reaproveita V3MyRides já existente. Excursões e Privativo são
 * placeholders informativos enquanto os módulos de histórico do passageiro
 * (ainda) não foram implementados.
 */
import { Suspense, lazy, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BusFront, Car, Navigation } from "lucide-react";
import { Card } from "@/components/ui/card";

const V3MyRides = lazy(() => import("@/pages/v3/V3MyRides"));

type TabKey = "todas" | "caronas" | "excursoes" | "privativo";

const TABS: { key: TabKey; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "caronas", label: "Caronas" },
  { key: "excursoes", label: "Excursões" },
  { key: "privativo", label: "Privativo" },
];

export default function MinhasViagensPage() {
  const [tab, setTab] = useState<TabKey>("todas");

  useEffect(() => {
    document.title = "Minhas viagens · Roxou";
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
          </section>
        ) : null}

        {tab === "todas" || tab === "excursoes" ? (
          <section className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <BusFront className="h-3.5 w-3.5" /> Excursões
            </div>
            <Card className="p-4 text-sm text-muted-foreground text-center">
              O histórico de excursões aparecerá aqui assim que você reservar
              um assento. Por ora, guarde o link de acompanhamento que
              recebeu por WhatsApp.
            </Card>
          </section>
        ) : null}

        {tab === "todas" || tab === "privativo" ? (
          <section className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Navigation className="h-3.5 w-3.5" /> Privativo
            </div>
            <Card className="p-4 text-sm text-muted-foreground text-center">
              Transporte privativo em breve.
            </Card>
          </section>
        ) : null}
      </div>
    </main>
  );
}
