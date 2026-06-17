/**
 * Página pública de reservas — /:partnerSlug/reservas
 *
 * Landing mobile-first com identidade do parceiro.
 * Cliente seleciona tipo (mesa/bistrô/camarote), data e dados pessoais.
 * Após submissão, redireciona para o comprovante com contador.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Instagram,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Users,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import {
  getPublicPartnerReservationsContext,
  getReservationSlotAvailability,
  submitPublicReservation,
  submitReservationWaitlist,
  type PublicPartnerForReservations,
  type PublicReservationType,
  type ReservationSlot,
} from "@/services/publicReservations";

const KIND_LABEL: Record<PublicReservationType["kind"], string> = {
  table: "Mesa",
  bistro: "Bistrô",
  box: "Camarote",
};

const KIND_LABEL_PLURAL: Record<PublicReservationType["kind"], string> = {
  table: "Mesas",
  bistro: "Bistrôs",
  box: "Camarotes",
};

const todayLocalDate = (hoursAhead = 0): string => {
  const d = new Date(Date.now() + hoursAhead * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const slotLabel = (iso: string): string =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDuration = (m: number): string => {
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}h` : `${h}h${String(r).padStart(2, "0")}`;
};

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const sanitizeWhatsapp = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
};

const sanitizeInstagram = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const handle = raw.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/$/, "");
  if (!handle) return null;
  return handle;
};

const PublicReservationPage = () => {
  const { partnerSlug } = useParams<{ partnerSlug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const preselectTypeId = searchParams.get("type");
  const preselectDate = searchParams.get("date");
  const preselectSlot = searchParams.get("slot");
  const waitlistToken = searchParams.get("waitlist");

  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<PublicPartnerForReservations | null>(null);
  const [types, setTypes] = useState<PublicReservationType[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState(2);
  const [date, setDate] = useState("");
  const [slotIso, setSlotIso] = useState<string>("");
  const [slots, setSlots] = useState<ReservationSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [notes, setNotes] = useState("");

  const [waitlistType, setWaitlistType] = useState<PublicReservationType | null>(
    null,
  );
  const [waitlistName, setWaitlistName] = useState("");
  const [waitlistPhone, setWaitlistPhone] = useState("");
  const [waitlistGuests, setWaitlistGuests] = useState(2);
  const [waitlistNotes, setWaitlistNotes] = useState("");
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistSent, setWaitlistSent] = useState(false);

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
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log(
            "[PUBLIC RESERVATIONS]",
            partnerSlug,
            ctx.partner?.reservations_enabled,
          );
        }
        if (preselectTypeId) {
          const match = ctx.types.find((t) => t.id === preselectTypeId);
          if (match) setSelectedType(match.id);
        }
        if (preselectDate) {
          setDate(preselectDate);
        } else {
          setDate(todayLocalDate(Math.ceil((ctx.partner.advance_booking_hours || 0) / 24)));
        }
      } catch (err) {
        toast({ title: "Erro", description: (err as Error).message });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [partnerSlug, toast, preselectTypeId]);

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

  const minDate = useMemo(
    () => todayLocalDate(Math.ceil((partner?.advance_booking_hours ?? 0) / 24)),
    [partner?.advance_booking_hours],
  );

  const whatsappDigits = useMemo(
    () => sanitizeWhatsapp(partner?.whatsapp),
    [partner?.whatsapp],
  );
  const instagramHandle = useMemo(
    () => sanitizeInstagram(partner?.instagram),
    [partner?.instagram],
  );

  // Effective people count: capacity-fixed types ignore the guests input.
  const effectiveGuests = useMemo(() => {
    if (selected && selected.requires_guest_count === false) return selected.seats;
    return guests;
  }, [selected, guests]);

  const effectiveDuration = useMemo(() => {
    return selected?.duration_minutes ?? 90;
  }, [selected]);

  // Load slot grid whenever (type, date) changes
  useEffect(() => {
    if (!partner?.id || !selected || !date) {
      setSlots([]);
      setSlotIso("");
      return;
    }
    let alive = true;
    setLoadingSlots(true);
    (async () => {
      try {
        const data = await getReservationSlotAvailability(
          partner.id,
          selected.id,
          date,
        );
        if (!alive) return;
        setSlots(data);
        // Try to honour preselected slot (HH:mm) from waitlist link
        if (preselectSlot && !slotIso) {
          const match = data.find((s) => {
            const d = new Date(s.slot_start);
            const hh = String(d.getHours()).padStart(2, "0");
            const mm = String(d.getMinutes()).padStart(2, "0");
            return `${hh}:${mm}` === preselectSlot && s.available_count > 0;
          });
          if (match) {
            setSlotIso(match.slot_start);
            return;
          }
        }
        // Reset slot if previous slot disappeared / unavailable
        const stillOk = data.find(
          (s) => s.slot_start === slotIso && s.available_count > 0,
        );
        if (!stillOk) setSlotIso("");
      } catch (err) {
        if (alive) {
          toast({ title: "Erro ao carregar horários", description: (err as Error).message });
          setSlots([]);
        }
      } finally {
        if (alive) setLoadingSlots(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner?.id, selected?.id, date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerSlug || !partner) return;
    if (!name.trim()) return toast({ title: "Informe seu nome" });
    if (phone.replace(/[^0-9]/g, "").length < 10)
      return toast({ title: "Telefone inválido" });
    if (!date) return toast({ title: "Escolha a data" });
    if (!slotIso) return toast({ title: "Escolha um horário disponível" });
    const slot = slots.find((s) => s.slot_start === slotIso);
    if (slot && slot.available_count <= 0)
      return toast({ title: "Horário esgotado para este tipo de reserva" });
    if (effectiveGuests < 1 || effectiveGuests > partner.max_people_per_reservation)
      return toast({
        title: `Máximo de ${partner.max_people_per_reservation} pessoas por reserva`,
      });
    if (selected && selected.available <= 0)
      return toast({ title: `Esgotado: ${selected.name}` });

    setSubmitting(true);
    try {
      const result = await submitPublicReservation({
        partner_slug: partnerSlug,
        type_id: selectedType,
        name,
        phone,
        email: email || null,
        guests: effectiveGuests,
        reservation_date: slotIso,
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
          As reservas estão temporariamente indisponíveis.
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

      {/* ============ HERO ============ */}
      <section className="relative w-full overflow-hidden">
        {/* Background: blurred logo if exists + gradient overlay */}
        <div className="absolute inset-0 -z-10">
          {partner.logo_url ? (
            <img
              src={partner.logo_url}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover opacity-30 blur-2xl scale-125"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/30 via-background/80 to-background" />
        </div>

        <div className="mx-auto w-full max-w-xl px-4 pt-8 pb-6">
          <div className="flex items-center gap-2 mb-4">
            <Badge className="bg-primary/90 text-primary-foreground border-0 gap-1">
              <ShieldCheck className="h-3 w-3" />
              Reservas oficiais
            </Badge>
            <Badge variant="outline" className="border-primary/40 text-[10px] gap-1">
              <Sparkles className="h-3 w-3" />
              Powered by Roxou
            </Badge>
          </div>

          <div className="flex items-center gap-4 min-w-0">
            {partner.logo_url ? (
              <img
                src={partner.logo_url}
                alt={partner.name}
                className="h-20 w-20 shrink-0 rounded-2xl object-cover border-2 border-primary/40 shadow-[0_0_24px_-6px_hsl(var(--primary)/0.6)]"
              />
            ) : (
              <div className="h-20 w-20 shrink-0 rounded-2xl bg-gradient-to-br from-primary to-primary/60 border-2 border-primary/40 flex items-center justify-center text-2xl font-bold text-primary-foreground">
                {partner.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold leading-tight break-words">
                {partner.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                {partner.city ? <span>{partner.city}</span> : null}
                {partner.type ? (
                  <>
                    <span className="opacity-50">•</span>
                    <span className="capitalize">{partner.type}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {partner.short_description ? (
            <p className="mt-3 text-sm text-foreground/80 leading-relaxed break-words">
              {partner.short_description}
            </p>
          ) : null}

          {partner.address ? (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground break-words">
              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="min-w-0">{partner.address}</span>
            </p>
          ) : null}

          {(instagramHandle || whatsappDigits) ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {instagramHandle ? (
                <a
                  href={`https://instagram.com/${instagramHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-3 py-1.5 text-xs hover:border-primary/60 transition"
                >
                  <Instagram className="h-3.5 w-3.5" />
                  @{instagramHandle}
                </a>
              ) : null}
              {whatsappDigits ? (
                <a
                  href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent("Olá, tenho uma dúvida sobre reservas.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-green-600 text-white px-3 py-1.5 text-xs hover:bg-green-700 transition"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Falar com o estabelecimento
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <div className="mx-auto w-full max-w-xl space-y-6 px-4 pb-10">
        {waitlistToken ? (
          <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
            ✅ Você está vindo da lista de espera. Reservamos seu tipo e horário sugerido — basta confirmar abaixo.
          </div>
        ) : null}

        {/* ============ TIPOS ============ */}
        {types.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold">Escolha sua reserva</h2>
              <p className="text-xs text-muted-foreground">
                Selecione mesa, bistrô ou camarote.
              </p>
            </div>

            {(["table", "bistro", "box"] as const).map((kind) =>
              grouped[kind].length === 0 ? null : (
                <div key={kind} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">
                    {KIND_LABEL_PLURAL[kind]}
                  </p>
                  <div className="grid gap-2">
                    {grouped[kind].map((t) => {
                      const active = selectedType === t.id;
                      const soldOut = t.available <= 0;
                      const lowStock = !soldOut && t.available <= 2;
                      return (
                        <div
                          key={t.id}
                          className={`relative rounded-xl border-2 px-3 py-3 transition min-w-0 ${
                            soldOut
                              ? "border-border/30 bg-muted/20 opacity-70"
                              : active
                              ? "border-primary bg-primary/10 shadow-[0_0_20px_-8px_hsl(var(--primary)/0.8)]"
                              : "border-border/60 bg-card/40 hover:border-primary/40"
                          }`}
                        >
                          {active && !soldOut ? (
                            <div className="absolute -top-2 -right-2 rounded-full bg-primary p-1 shadow-md">
                              <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                            </div>
                          ) : null}
                          <button
                            type="button"
                            disabled={soldOut}
                            onClick={() => {
                              if (soldOut) return;
                              setSelectedType(t.id);
                              if (kind === "box") setGuests(t.seats);
                            }}
                            className={`block w-full text-left ${
                              soldOut ? "cursor-not-allowed" : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 min-w-0">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold break-words">
                                  {t.name}
                                </p>
                                <p className="mt-0.5 text-[11px] text-muted-foreground break-words">
                                  <Users className="inline h-3 w-3 mr-0.5" />
                                  {t.seats} {t.requires_guest_count === false ? "pessoas incluídas" : kind === "box" ? "pessoas" : "lugares"}
                                  {t.minimum_consumption
                                    ? ` • consumo mín. ${formatBRL(Number(t.minimum_consumption))}`
                                    : ""}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                {soldOut ? (
                                  <Badge variant="destructive" className="text-[10px]">
                                    Esgotado
                                  </Badge>
                                ) : (
                                  <>
                                    <span className="whitespace-nowrap text-sm font-bold text-primary">
                                      {formatBRL(Number(t.price))}
                                    </span>
                                    {lowStock ? (
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] border-amber-500/50 text-amber-600"
                                      >
                                        Poucas
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] border-emerald-500/50 text-emerald-600"
                                      >
                                        {t.available} disp.
                                      </Badge>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            {t.description ? (
                              <p className="mt-2 text-[11px] text-muted-foreground break-words">
                                {t.description}
                              </p>
                            ) : null}
                          </button>
                          {soldOut && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="mt-2 w-full"
                              onClick={() => {
                                setWaitlistType(t);
                                setWaitlistGuests(
                                  kind === "box" ? t.seats : 2,
                                );
                                setWaitlistSent(false);
                              }}
                            >
                              Entrar na lista de espera
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
          </section>
        )}

        {/* ============ FORM ============ */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Seus dados</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div>
                <Label className="text-xs">Nome completo</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como aparece no documento"
                  className="h-11"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">WhatsApp</Label>
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(18) 99999-9999"
                    className="h-11"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs">E-mail (opcional)</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com"
                    className="h-11"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Data</Label>
                <Input
                  type="date"
                  min={minDate}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11"
                  required
                />
              </div>

              {/* Slot grid */}
              {selected ? (
                <div className="space-y-2">
                  <Label className="text-xs">Horário disponível</Label>
                  {loadingSlots ? (
                    <p className="text-xs text-muted-foreground">Carregando horários…</p>
                  ) : slots.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Selecione uma data para ver os horários.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {slots.map((s) => {
                        const taken = s.available_count <= 0;
                        const low = !taken && s.available_count <= 2;
                        const active = slotIso === s.slot_start;
                        return (
                          <button
                            key={s.slot_start}
                            type="button"
                            disabled={taken}
                            onClick={() => setSlotIso(s.slot_start)}
                            className={`rounded-lg border-2 px-2 py-2 text-xs font-medium transition ${
                              taken
                                ? "border-border/30 bg-muted/20 text-muted-foreground line-through cursor-not-allowed"
                                : active
                                  ? "border-primary bg-primary/20 text-primary shadow-[0_0_18px_-4px_hsl(var(--primary)/0.9)] ring-1 ring-primary/60"
                                  : low
                                    ? "border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-300 hover:border-amber-500"
                                    : "border-border/60 bg-card/40 hover:border-primary/60"
                            }`}
                          >
                            <div className="font-bold">{slotLabel(s.slot_start)}</div>
                            <div className="text-[10px] opacity-80 leading-tight">
                              {taken
                                ? "Esgotado"
                                : `${s.available_count} de ${s.quantity_total} disponíveis`}
                            </div>
                            {low ? (
                              <div className="text-[9px] font-semibold uppercase tracking-wide mt-0.5">
                                Poucas vagas
                              </div>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}

              {selected && selected.requires_guest_count ? (
                <div>
                  <Label className="text-xs">Pessoas</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={partner.max_people_per_reservation}
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value) || 1)}
                    className="h-11"
                  />
                </div>
              ) : null}

              <div>
                <Label className="text-xs">Observações (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Aniversário, preferências, etc."
                />
              </div>

              {/* Resumo */}
              {selected ? (
                <div className="rounded-xl border-2 border-primary/30 bg-primary/5 px-3 py-3 space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Resumo da reserva
                  </p>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">Tipo</span>
                    <span className="font-medium text-right break-words min-w-0">
                      {KIND_LABEL[selected.kind]} — {selected.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">Pessoas</span>
                    <span className="font-medium">
                      {effectiveGuests}
                      {selected.requires_guest_count === false ? (
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          (incluídas)
                        </span>
                      ) : null}
                    </span>
                  </div>
                  {slotIso ? (
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">Quando</span>
                      <span className="font-medium text-right">
                        {new Date(slotIso).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">Duração prevista</span>
                    <span className="font-medium">{formatDuration(effectiveDuration)}</span>
                  </div>
                  {slotIso ? (() => {
                    const s = slots.find((x) => x.slot_start === slotIso);
                    if (!s) return null;
                    return (
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">Disponibilidade</span>
                        <span className="font-medium">
                          {s.available_count} de {s.quantity_total} disponíveis
                        </span>
                      </div>
                    );
                  })() : null}
                  <div className="flex items-center justify-between gap-2 text-sm pt-1 border-t border-primary/20">
                    <span className="text-muted-foreground">Valor</span>
                    <span className="font-bold text-primary">
                      {formatBRL(Number(selected.price))}
                    </span>
                  </div>
                  {selected.minimum_consumption ? (
                    <p className="text-[11px] text-muted-foreground">
                      Consumo mínimo: {formatBRL(Number(selected.minimum_consumption))}
                    </p>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Sua mesa ficará reservada por até {formatDuration(effectiveDuration)}.
                    Após esse período, a mesa poderá ser liberada para novas reservas.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 px-3 py-3 text-xs text-muted-foreground text-center">
                  Selecione uma reserva acima para ver o resumo.
                </div>
              )}

              {!partner.auto_confirm && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
                  ⏱️ Sua reserva ficará disponível por{" "}
                  <strong>{partner.confirmation_timeout_minutes} minutos</strong>{" "}
                  para confirmação/pagamento com o estabelecimento.
                </p>
              )}

              <Button
                type="submit"
                disabled={submitting || (selected ? selected.available <= 0 : false)}
                className="w-full h-12 text-base font-semibold"
              >
                {submitting
                  ? "Enviando…"
                  : selected && selected.available <= 0
                  ? "Esgotado"
                  : "Continuar reserva"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ============ COMO FUNCIONA ============ */}
        <Card className="bg-card/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Como funciona</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-xs text-muted-foreground">
              {[
                "Escolha sua mesa, bistrô ou camarote.",
                "Preencha seus dados de contato.",
                "Receba o comprovante com QR Code.",
                "Confirme o pagamento/sinal com o estabelecimento.",
                "Apresente o QR Code na entrada.",
              ].map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                    {i + 1}
                  </span>
                  <span className="min-w-0 break-words leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* ============ CTA WHATSAPP ============ */}
        {whatsappDigits ? (
          <a
            href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent("Olá, tenho uma dúvida sobre reservas.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-green-600 text-white px-4 py-3 text-sm font-medium hover:bg-green-700 transition"
          >
            <Phone className="h-4 w-4" />
            Falar com {partner.name} no WhatsApp
          </a>
        ) : null}

        <p className="text-[10px] text-center text-muted-foreground leading-relaxed px-4">
          A reserva está sujeita à confirmação do estabelecimento e às regras
          do local.
          <br />
          <span className="opacity-70">Powered by Roxou Partner Pro</span>
        </p>
      </div>

      <Dialog
        open={!!waitlistType}
        onOpenChange={(o) => {
          if (!o) {
            setWaitlistType(null);
            setWaitlistSent(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {waitlistSent
                ? "Você entrou na lista de espera"
                : `Lista de espera — ${waitlistType?.name ?? ""}`}
            </DialogTitle>
            <DialogDescription>
              {waitlistSent
                ? "Caso uma vaga seja liberada, o estabelecimento poderá entrar em contato pelo telefone informado."
                : "Deixe seus dados. Se uma vaga abrir, o estabelecimento entra em contato."}
            </DialogDescription>
          </DialogHeader>
          {!waitlistSent ? (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Nome</Label>
                <Input
                  value={waitlistName}
                  onChange={(e) => setWaitlistName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Telefone</Label>
                  <Input
                    value={waitlistPhone}
                    onChange={(e) => setWaitlistPhone(e.target.value)}
                    placeholder="(18) 99999-9999"
                  />
                </div>
                <div>
                  <Label className="text-xs">Pessoas</Label>
                  <Input
                    type="number"
                    min={1}
                    value={waitlistGuests}
                    onChange={(e) =>
                      setWaitlistGuests(Number(e.target.value) || 1)
                    }
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Observação (opcional)</Label>
                <Textarea
                  rows={2}
                  value={waitlistNotes}
                  onChange={(e) => setWaitlistNotes(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setWaitlistType(null)}
                  disabled={waitlistSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  disabled={waitlistSubmitting}
                  onClick={async () => {
                    if (!partnerSlug || !waitlistType) return;
                    if (!waitlistName.trim())
                      return toast({ title: "Informe seu nome" });
                    if (waitlistPhone.replace(/[^0-9]/g, "").length < 10)
                      return toast({ title: "Telefone inválido" });
                    setWaitlistSubmitting(true);
                    try {
                      await submitReservationWaitlist({
                        partner_slug: partnerSlug,
                        type_id: waitlistType.id,
                        name: waitlistName,
                        phone: waitlistPhone,
                        guests: waitlistGuests,
                        notes: waitlistNotes || null,
                      });
                      setWaitlistSent(true);
                    } catch (err) {
                      toast({
                        title: "Erro",
                        description: (err as Error).message,
                      });
                    } finally {
                      setWaitlistSubmitting(false);
                    }
                  }}
                >
                  {waitlistSubmitting ? "Enviando…" : "Entrar na lista"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <DialogFooter>
              <Button onClick={() => setWaitlistType(null)}>Fechar</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default PublicReservationPage;
