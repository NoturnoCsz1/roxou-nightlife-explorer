/**
 * ExcursaoConfirmacaoPage — etapa 4/4.
 * Revisa os dados, chama `public_reserve_excursion_seat` e leva o usuário
 * para /transportes/acompanhar/:token quando a reserva é criada.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  getPublicExcursionTrip,
  reserveExcursionSeat,
  reserveReasonMessage,
  type PublicTripBundle,
} from "@modules/transport";
import {
  clearFlow,
  formatBRL,
  formatDateTime,
  readFlow,
} from "./excursao/excursaoFlow";
import ExcursaoStepper from "./excursao/ExcursaoStepper";

export default function ExcursaoConfirmacaoPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<PublicTripBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState<string | null>(null);

  const flow = readFlow(slug);

  useEffect(() => {
    document.title = "Confirmar reserva · Excursão Roxou";
    if (!flow.seat_id) {
      setMissing("Escolha um assento antes de confirmar.");
    } else if (!flow.name || !flow.phone) {
      setMissing("Preencha seus dados antes de confirmar.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getPublicExcursionTrip(slug);
        if (alive) setBundle(data);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  async function handleConfirm() {
    if (!bundle || !flow.seat_id || !flow.name || !flow.phone || busy) return;
    setBusy(true);
    try {
      const res = await reserveExcursionSeat({
        trip_id: bundle.trip.id,
        seat_id: flow.seat_id,
        name: flow.name,
        phone: flow.phone,
        doc: flow.doc ?? null,
      });
      if (!res.ok || !res.qr_token) {
        toast.error(reserveReasonMessage(res.reason));
        if (res.reason === "seat_taken") {
          navigate(`/transportes/excursoes/${slug}/assentos`, { replace: true });
        }
        return;
      }
      toast.success("Reserva confirmada!");
      clearFlow(slug);
      navigate(`/transportes/acompanhar/${res.qr_token}`, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao reservar.");
    } finally {
      setBusy(false);
    }
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
          to={`/transportes/excursoes/${slug}/passageiro`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Passageiro
        </Link>
        <ExcursaoStepper slug={slug} current="confirmacao" />

        {missing ? (
          <Card className="p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">{missing}</p>
            <Button asChild size="sm">
              <Link to={`/transportes/excursoes/${slug}`}>Recomeçar</Link>
            </Button>
          </Card>
        ) : loading || !bundle ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Carregando…
          </Card>
        ) : (
          <>
            <header className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-primary">
                Passo 4 · Confirmação
              </p>
              <h1 className="text-xl font-bold">{bundle.trip.title}</h1>
            </header>

            <Card className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saída</span>
                <span>{formatDateTime(bundle.trip.departure_at)}</span>
              </div>
              {bundle.trip.destination ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Destino</span>
                  <span className="text-right">{bundle.trip.destination}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assento</span>
                <span className="font-semibold">{flow.seat_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Passageiro</span>
                <span className="text-right">{flow.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">WhatsApp</span>
                <span>{flow.phone}</span>
              </div>
              {flow.doc ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Documento</span>
                  <span>{flow.doc}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-border/40 pt-2">
                <span className="text-muted-foreground">Valor</span>
                <span className="font-bold text-primary">
                  {formatBRL(bundle.trip.price_cents)}
                </span>
              </div>
            </Card>

            <Button
              className="w-full h-12 text-base"
              onClick={handleConfirm}
              disabled={busy}
            >
              {busy ? "Confirmando…" : "Confirmar reserva"}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Você receberá um QR Code para embarcar. Pagamento é tratado
              diretamente com {bundle.partner?.name ?? "o operador"}.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
