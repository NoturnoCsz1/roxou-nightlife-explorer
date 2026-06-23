/**
 * ExcursaoPublicPage — Fase 7.3.
 *
 * Página pública de uma viagem de excursão por `public_slug`.
 * - Mostra dados da viagem (destino, embarque, preço).
 * - Mapa simples de assentos (livre / reservado / pago / embarcado / cancelado).
 * - Formulário do passageiro + reserva via RPC SECURITY DEFINER.
 * - Após reservar, redireciona para /transportes/acompanhar/:token.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BusFront, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  getPublicExcursionTrip,
  reserveExcursionSeat,
  reserveReasonMessage,
  type PublicSeat,
  type PublicTripBundle,
} from "@/services/publicExcursoes";

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
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

const seatPalette: Record<
  PublicSeat["status"],
  { cls: string; label: string; disabled: boolean }
> = {
  free: {
    cls: "bg-emerald-500/20 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30",
    label: "Livre",
    disabled: false,
  },
  reserved: {
    cls: "bg-amber-500/20 border-amber-400/40 text-amber-200 opacity-70",
    label: "Reservado",
    disabled: true,
  },
  paid: {
    cls: "bg-blue-500/20 border-blue-400/40 text-blue-200 opacity-70",
    label: "Pago",
    disabled: true,
  },
  boarded: {
    cls: "bg-fuchsia-500/20 border-fuchsia-400/40 text-fuchsia-200 opacity-70",
    label: "Embarcado",
    disabled: true,
  },
  cancelled: {
    cls: "bg-zinc-500/10 border-zinc-500/30 text-zinc-500 line-through opacity-60",
    label: "Cancelado",
    disabled: true,
  },
};

export default function ExcursaoPublicPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<PublicTripBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSeat, setSelectedSeat] = useState<PublicSeat | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [doc, setDoc] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = bundle?.trip.title
      ? `${bundle.trip.title} — Excursão · Roxou`
      : "Excursão · Roxou";
  }, [bundle?.trip.title]);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPublicExcursionTrip(slug);
      if (!data) setError("Viagem não encontrada.");
      setBundle(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar viagem.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function handleReserve(e: React.FormEvent) {
    e.preventDefault();
    if (!bundle || !selectedSeat) return;
    if (busy) return;
    setBusy(true);
    try {
      const res = await reserveExcursionSeat({
        trip_id: bundle.trip.id,
        seat_id: selectedSeat.id,
        name: name.trim(),
        phone: phone.trim(),
        doc: doc.trim() || null,
      });
      if (!res.ok || !res.qr_token) {
        toast.error(reserveReasonMessage(res.reason));
        if (res.reason === "seat_taken") {
          setSelectedSeat(null);
          await reload();
        }
        return;
      }
      toast.success("Reserva confirmada!");
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
          to="/transportes/excursoes"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para excursões
        </Link>

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
              <Link to="/transportes">Ir para Transporte</Link>
            </Button>
          </Card>
        ) : (
          <>
            {/* Header */}
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
                  {bundle.trip.price_cents > 0
                    ? formatBRL(bundle.trip.price_cents)
                    : "Grátis"}
                </span>
              </div>
              {bundle.trip.notes ? (
                <p className="text-[11px] text-muted-foreground border-t border-border/40 pt-2 whitespace-pre-wrap">
                  {bundle.trip.notes}
                </p>
              ) : null}
            </Card>

            {/* Seat map */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Escolha seu assento
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {bundle.seats.filter((s) => s.status === "free").length} livres
                </p>
              </div>
              {bundle.seats.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum assento cadastrado.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {bundle.seats.map((seat) => {
                    const palette = seatPalette[seat.status];
                    const isSelected = selectedSeat?.id === seat.id;
                    return (
                      <button
                        key={seat.id}
                        type="button"
                        disabled={palette.disabled}
                        onClick={() => setSelectedSeat(seat)}
                        className={`relative aspect-square rounded-lg border text-sm font-semibold transition ${palette.cls} ${
                          isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                        } disabled:cursor-not-allowed`}
                        aria-label={`Assento ${seat.seat_number} — ${palette.label}`}
                      >
                        {seat.seat_number}
                      </button>
                    );
                  })}
                </div>
              )}
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

            {/* Passenger form */}
            <form onSubmit={handleReserve}>
              <Card className="p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Seus dados
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="exc-name" className="text-xs">
                    Nome completo
                  </Label>
                  <Input
                    id="exc-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Como está no documento"
                    required
                    minLength={2}
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="exc-phone" className="text-xs">
                    WhatsApp com DDD
                  </Label>
                  <Input
                    id="exc-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 90000-0000"
                    inputMode="tel"
                    required
                    maxLength={20}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="exc-doc" className="text-xs">
                    Documento (opcional)
                  </Label>
                  <Input
                    id="exc-doc"
                    value={doc}
                    onChange={(e) => setDoc(e.target.value)}
                    placeholder="CPF ou RG"
                    maxLength={32}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 text-base"
                  disabled={
                    busy || !selectedSeat || !name.trim() || phone.trim().length < 10
                  }
                >
                  {busy
                    ? "Reservando…"
                    : selectedSeat
                      ? `Reservar assento ${selectedSeat.seat_number}`
                      : "Escolha um assento"}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Você receberá um QR Code para embarcar. Pagamento e cancelamento
                  são tratados diretamente com {bundle.partner?.name ?? "o operador"}.
                </p>
              </Card>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
