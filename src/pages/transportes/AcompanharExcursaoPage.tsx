/**
 * AcompanharExcursaoPage — Fase 7.3.
 *
 * Comprovante público da reserva de uma excursão.
 * URL: /transportes/acompanhar/:token
 *
 * - Mostra QR Code de embarque (payload roxou://checkin?type=excursion&token=...).
 * - Mostra dados da viagem (saída, destino, valor) e do passageiro.
 * - Reflete status atual do assento (reservado, pago, embarcado, cancelado).
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, MapPin, BusFront, Radio, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateQrPngDataUrl, downloadDataUrl } from "@/lib/qrcode";
import {
  buildExcursionQrPayload,
  getPublicExcursionTicket,
  type PublicTicket,
} from "@/services/publicExcursoes";
import {
  getPublicLive,
  operationStatusEmoji,
  operationStatusLabel,
  type ExcursionOperationStatus,
  type PublicLiveData,
} from "@/services/excursionGps";

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const statusBadge: Record<string, { cls: string; label: string }> = {
  reserved: { cls: "bg-amber-500/20 text-amber-300 border-amber-500/40", label: "Reservado" },
  paid: { cls: "bg-blue-500/20 text-blue-300 border-blue-500/40", label: "Pago" },
  boarded: { cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", label: "Embarcado" },
  cancelled: { cls: "bg-rose-500/20 text-rose-300 border-rose-500/40", label: "Cancelado" },
  free: { cls: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40", label: "Livre" },
};

export default function AcompanharExcursaoPage() {
  const { token = "" } = useParams<{ token: string }>();
  const [ticket, setTicket] = useState<PublicTicket | null>(null);
  const [qrPng, setQrPng] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Acompanhar viagem · Roxou";
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const t = await getPublicExcursionTicket(token);
        if (!alive) return;
        if (!t) {
          setError("Comprovante não encontrado.");
        } else {
          setTicket(t);
          const png = await generateQrPngDataUrl(buildExcursionQrPayload(token), 640);
          if (alive) setQrPng(png);
        }
      } catch (err) {
        if (alive)
          setError(err instanceof Error ? err.message : "Erro ao carregar comprovante.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const status = ticket?.seat.status ?? "reserved";
  const badge = statusBadge[status] ?? statusBadge.reserved;

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
          to="/transportes"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Transporte
        </Link>

        {loading ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Carregando comprovante…
          </Card>
        ) : error || !ticket ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            {error ?? "Comprovante indisponível."}
          </Card>
        ) : (
          <>
            <header className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-primary">
                🚍 Comprovante de embarque
              </p>
              <h1 className="text-2xl font-bold leading-tight">
                {ticket.trip.title}
              </h1>
              <div className="flex items-center gap-2 pt-1">
                <Badge className={`${badge.cls} border`}>{badge.label}</Badge>
                <span className="text-xs text-muted-foreground">
                  Assento {ticket.seat.seat_number}
                </span>
              </div>
            </header>

            {/* QR */}
            <Card className="p-4 flex flex-col items-center gap-3">
              {qrPng ? (
                <img
                  src={qrPng}
                  alt="QR Code de embarque"
                  className="w-56 h-56 rounded-lg bg-white p-2"
                />
              ) : (
                <div className="w-56 h-56 rounded-lg bg-white/10 animate-pulse" />
              )}
              <p className="text-[11px] text-muted-foreground text-center">
                Apresente este QR ao validador no momento do embarque.
              </p>
              {qrPng ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    downloadDataUrl(`excursao-${ticket.seat.seat_number}.png`, qrPng)
                  }
                >
                  Baixar QR Code
                </Button>
              ) : null}
            </Card>

            <Card className="p-4 space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <CalendarClock className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <p>Saída {formatDateTime(ticket.trip.departure_at)}</p>
              </div>
              {ticket.trip.departure_address ? (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <p className="text-xs">{ticket.trip.departure_address}</p>
                </div>
              ) : null}
              {ticket.trip.destination ? (
                <div className="flex items-start gap-2">
                  <BusFront className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <p className="text-xs">Destino: {ticket.trip.destination}</p>
                </div>
              ) : null}
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <span className="text-xs text-muted-foreground">Valor</span>
                <span className="font-bold text-primary">
                  {ticket.trip.price_cents > 0
                    ? formatBRL(ticket.trip.price_cents)
                    : "Grátis"}
                </span>
              </div>
            </Card>

            <Card className="p-4 space-y-1 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Passageiro
              </p>
              <p className="font-medium">{ticket.seat.passenger_name ?? "—"}</p>
              {ticket.seat.passenger_phone ? (
                <p className="text-xs text-muted-foreground">
                  {ticket.seat.passenger_phone}
                </p>
              ) : null}
              {ticket.partner?.name ? (
                <p className="text-[11px] text-muted-foreground pt-2">
                  Operado por {ticket.partner.name}
                </p>
              ) : null}
            </Card>

            <Button asChild variant="secondary" className="w-full">
              <Link to={`/transportes/excursoes/${ticket.trip.public_slug}`}>
                Ver detalhes da viagem
              </Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
