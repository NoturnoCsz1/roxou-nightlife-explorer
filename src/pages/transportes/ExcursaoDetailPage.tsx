/**
 * ExcursaoDetailPage — etapa 1/4.
 * Mostra dados públicos da viagem (saída, destino, preço) e CTA
 * "Escolher assento" → /transportes/excursoes/:slug/assentos.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BusFront, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getPublicExcursionTrip,
  type PublicTripBundle,
} from "@modules/transport";
import { formatBRL, formatDateTime } from "./excursao/excursaoFlow";
import ExcursaoStepper from "./excursao/ExcursaoStepper";

export default function ExcursaoDetailPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [bundle, setBundle] = useState<PublicTripBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = bundle?.trip.title
      ? `${bundle.trip.title} · Excursão Roxou`
      : "Excursão · Roxou";
  }, [bundle?.trip.title]);

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
          setError(err instanceof Error ? err.message : "Erro ao carregar viagem.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const seatsFree = bundle?.seats.filter((s) => s.status === "free").length ?? 0;

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
          to="/transportes/excursoes"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Excursões
        </Link>
        <ExcursaoStepper slug={slug} current="detalhe" />

        {loading ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Carregando viagem…
          </Card>
        ) : error || !bundle ? (
          <Card className="p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              {error ?? "Viagem indisponível."}
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link to="/transportes/excursoes">Voltar</Link>
            </Button>
          </Card>
        ) : (
          <>
            <header className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-primary">
                🚍 Excursão Oficial
              </p>
              <h1 className="text-2xl font-bold leading-tight">
                {bundle.trip.title}
              </h1>
              {bundle.partner?.name ? (
                <p className="text-xs text-muted-foreground">
                  por {bundle.partner.name}
                </p>
              ) : null}
            </header>

            <Card className="p-4 space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div>
                  <p className="font-medium">
                    Saída {formatDateTime(bundle.trip.departure_at)}
                  </p>
                  {bundle.trip.return_at ? (
                    <p className="text-xs text-muted-foreground">
                      Retorno previsto {formatDateTime(bundle.trip.return_at)}
                    </p>
                  ) : null}
                </div>
              </div>
              {bundle.trip.departure_address ? (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <p className="text-xs">{bundle.trip.departure_address}</p>
                </div>
              ) : null}
              {bundle.trip.destination ? (
                <div className="flex items-start gap-2">
                  <BusFront className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <p className="text-xs">Destino: {bundle.trip.destination}</p>
                </div>
              ) : null}
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <span className="text-xs text-muted-foreground">Valor</span>
                <span className="font-bold text-primary">
                  {formatBRL(bundle.trip.price_cents)}
                </span>
              </div>
              {bundle.trip.notes ? (
                <p className="text-[11px] text-muted-foreground border-t border-border/40 pt-2 whitespace-pre-wrap">
                  {bundle.trip.notes}
                </p>
              ) : null}
            </Card>

            <Button asChild className="w-full h-12 text-base" disabled={seatsFree === 0}>
              <Link to={`/transportes/excursoes/${slug}/assentos`}>
                {seatsFree > 0
                  ? `Escolher assento (${seatsFree} livres)`
                  : "Sem assentos livres"}
              </Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
