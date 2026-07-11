/**
 * ExcursaoAssentosPage — etapa 2/4.
 * Mapa de assentos. Ao escolher, persiste em sessionStorage e avança.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getPublicExcursionTrip,
  type PublicSeat,
  type PublicTripBundle,
} from "@modules/transport";
import {
  readFlow,
  seatPalette,
  writeFlow,
} from "./excursao/excursaoFlow";
import ExcursaoStepper from "./excursao/ExcursaoStepper";

export default function ExcursaoAssentosPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<PublicTripBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PublicSeat | null>(null);

  useEffect(() => {
    document.title = "Escolher assento · Excursão Roxou";
    const saved = readFlow(slug);
    if (saved.seat_id) {
      setSelected({
        id: saved.seat_id,
        seat_number: saved.seat_number ?? "?",
        status: "free",
      });
    }
  }, [slug]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getPublicExcursionTrip(slug);
        if (!alive) return;
        if (!data) setError("Viagem não encontrada.");
        setBundle(data);
      } catch (err) {
        if (alive)
          setError(err instanceof Error ? err.message : "Erro ao carregar.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  function handleContinue() {
    if (!selected) return;
    writeFlow(slug, { seat_id: selected.id, seat_number: selected.seat_number });
    navigate(`/transportes/excursoes/${slug}/passageiro`);
  }

  return (
    <main
      className="min-h-screen w-full bg-gradient-to-b from-background to-purple-950/20"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto w-full max-w-md px-4 py-4 space-y-4">
        <Link
          to={`/transportes/excursoes/${slug}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Viagem
        </Link>
        <ExcursaoStepper slug={slug} current="assentos" />

        {loading ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Carregando assentos…
          </Card>
        ) : error || !bundle ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            {error ?? "Viagem indisponível."}
          </Card>
        ) : (
          <>
            <header className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-primary">
                Passo 2 · Assento
              </p>
              <h1 className="text-xl font-bold leading-tight">
                {bundle.trip.title}
              </h1>
            </header>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Escolha seu assento
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {bundle.seats.filter((s) => s.status === "free").length} livres
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {bundle.seats.map((seat) => {
                  const palette = seatPalette[seat.status];
                  const isSelected = selected?.id === seat.id;
                  return (
                    <button
                      key={seat.id}
                      type="button"
                      disabled={palette.disabled}
                      onClick={() => setSelected(seat)}
                      className={`relative aspect-square rounded-lg border text-sm font-semibold transition ${palette.cls} ${
                        isSelected
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                          : ""
                      } disabled:cursor-not-allowed`}
                      aria-label={`Assento ${seat.seat_number} — ${palette.label}`}
                    >
                      {seat.seat_number}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2 pt-2 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Livre
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> Reservado
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-400" /> Pago
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-fuchsia-400" /> Embarcado
                </span>
              </div>
            </Card>

            <Button
              className="w-full h-12 text-base"
              disabled={!selected}
              onClick={handleContinue}
            >
              {selected
                ? `Continuar com assento ${selected.seat_number}`
                : "Escolha um assento"}
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
