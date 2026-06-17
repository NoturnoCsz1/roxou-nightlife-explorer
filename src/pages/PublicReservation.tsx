/**
 * Página pública de reservas — /:partnerSlug/reservas
 *
 * Cliente seleciona tipo (mesa/bistrô/camarote), data e dados pessoais.
 * Após submissão, redireciona para o comprovante com contador.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import {
  getPublicPartnerReservationsContext,
  submitPublicReservation,
  type PublicPartnerForReservations,
  type PublicReservationType,
} from "@/services/publicReservations";

const KIND_LABEL: Record<PublicReservationType["kind"], string> = {
  table: "Mesa",
  bistro: "Bistrô",
  box: "Camarote",
};

const minLocalInput = (hoursAhead: number): string => {
  const d = new Date(Date.now() + hoursAhead * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const PublicReservationPage = () => {
  const { partnerSlug } = useParams<{ partnerSlug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<PublicPartnerForReservations | null>(null);
  const [types, setTypes] = useState<PublicReservationType[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState(2);
  const [when, setWhen] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!partnerSlug) return;
    let alive = true;
    (async () => {
      try {
        const ctx = await getPublicPartnerReservationsContext(partnerSlug);
        if (!alive) return;
        if (!ctx) {
          toast({ title: "Estabelecimento não encontrado" });
          setLoading(false);
          return;
        }
        setPartner(ctx.partner);
        setTypes(ctx.types);
        setWhen(minLocalInput(ctx.partner.advance_booking_hours + 1));
      } catch (err) {
        toast({ title: "Erro", description: (err as Error).message });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [partnerSlug, toast]);

  const grouped = useMemo(() => {
    const acc: Record<PublicReservationType["kind"], PublicReservationType[]> = {
      table: [],
      bistro: [],
      box: [],
    };
    for (const t of types) acc[t.kind].push(t);
    return acc;
  }, [types]);

  const selected = useMemo(
    () => types.find((t) => t.id === selectedType) ?? null,
    [types, selectedType],
  );

  const minWhen = useMemo(
    () => minLocalInput(partner?.advance_booking_hours ?? 2),
    [partner?.advance_booking_hours],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerSlug || !partner) return;
    if (!name.trim()) return toast({ title: "Informe seu nome" });
    if (phone.replace(/[^0-9]/g, "").length < 10)
      return toast({ title: "Telefone inválido" });
    if (!when) return toast({ title: "Escolha data e horário" });
    if (guests < 1 || guests > partner.max_people_per_reservation)
      return toast({
        title: `Máximo de ${partner.max_people_per_reservation} pessoas por reserva`,
      });

    setSubmitting(true);
    try {
      const result = await submitPublicReservation({
        partner_slug: partnerSlug,
        type_id: selectedType,
        name,
        phone,
        email: email || null,
        guests,
        reservation_date: new Date(when).toISOString(),
        notes: notes || null,
      });
      navigate(`/reserva/sucesso/${result.public_token}`, {
        state: { result },
      });
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-6">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </main>
    );
  }

  if (!partner) {
    return (
      <main className="min-h-screen p-6">
        <h1 className="text-xl font-bold">Estabelecimento não encontrado</h1>
        <Link to="/" className="text-sm text-primary underline">
          Voltar
        </Link>
      </main>
    );
  }

  if (!partner.reservations_enabled) {
    return (
      <main className="min-h-screen p-6">
        <SEO title={`Reservas — ${partner.name}`} description="" />
        <h1 className="text-xl font-bold">{partner.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este estabelecimento não está aceitando reservas online no momento.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-background overflow-x-hidden">
      <SEO
        title={`Reservar em ${partner.name} | Roxou`}
        description={`Reserve mesa, bistrô ou camarote em ${partner.name}.`}
      />
      <div className="mx-auto w-full max-w-xl space-y-4 px-4 py-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-primary">Reservas</p>
          <h1 className="text-2xl font-bold">{partner.name}</h1>
          {partner.city ? (
            <p className="text-sm text-muted-foreground">{partner.city}</p>
          ) : null}
        </header>

        {types.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Escolha o tipo</h2>
            {(["table", "bistro", "box"] as const).map((kind) =>
              grouped[kind].length === 0 ? null : (
                <div key={kind} className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {KIND_LABEL[kind]}s
                  </p>
                  <div className="grid gap-2">
                    {grouped[kind].map((t) => {
                      const active = selectedType === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedType(t.id);
                            if (kind === "box") setGuests(t.seats);
                          }}
                          className={`text-left rounded-lg border px-3 py-3 transition ${
                            active
                              ? "border-primary bg-primary/10"
                              : "border-border/60 bg-card/40"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {t.name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {t.seats} {kind === "box" ? "pess." : "lug."}
                                {t.minimum_consumption
                                  ? ` · consumo mín. R$ ${Number(t.minimum_consumption).toFixed(2)}`
                                  : ""}
                              </p>
                            </div>
                            <Badge variant="outline">
                              R$ {Number(t.price).toFixed(2)}
                            </Badge>
                          </div>
                          {t.description ? (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {t.description}
                            </p>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
          </section>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seus dados</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div>
                <Label className="text-xs">Nome completo</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Telefone / WhatsApp</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(18) 99999-9999"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs">E-mail (opcional)</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Pessoas</Label>
                  <Input
                    type="number"
                    min={1}
                    max={partner.max_people_per_reservation}
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Data e horário</Label>
                  <Input
                    type="datetime-local"
                    min={minWhen}
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Observações (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              {selected ? (
                <div className="rounded-md border border-border/60 bg-card/40 px-3 py-2 text-xs">
                  <p className="font-medium">
                    {KIND_LABEL[selected.kind]} — {selected.name}
                  </p>
                  <p className="text-muted-foreground">
                    Valor: R$ {Number(selected.price).toFixed(2)}
                  </p>
                </div>
              ) : null}

              {!partner.auto_confirm && (
                <p className="text-[11px] text-amber-600">
                  Sua reserva ficará disponível por{" "}
                  {partner.confirmation_timeout_minutes} minutos para confirmação/pagamento.
                </p>
              )}

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Enviando…" : "Solicitar reserva"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-[10px] text-center text-muted-foreground">
          A reserva só estará garantida após confirmação do estabelecimento ou
          pagamento, conforme regras do local.
        </p>
      </div>
    </main>
  );
};

export default PublicReservationPage;
