/**
 * Comprovante público de reserva — /reserva/sucesso/:publicToken
 *
 * Card de status (pending_payment / confirmed / completed / expired /
 * cancelled / no_show), contador regressivo em SP, QR Code condicional
 * (somente quando confirmed/completed), e ações: Salvar PNG,
 * Compartilhar comprovante e Enviar pelo WhatsApp.
 *
 * Nunca expõe o QR isoladamente.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { generateQrSvg } from "@/lib/qrcode";
import { formatDateTimeSP } from "@/lib/dateUtils";
import {
  getPublicReservation,
  type PublicReservationInfo,
  type PublicReservationResult,
} from "@/services/publicReservations";
import SaveToAccountButton from "@/components/customer/SaveToAccountButton";

type ReservationStatus =
  | "pending"
  | "pending_payment"
  | "confirmed"
  | "completed"
  | "expired"
  | "cancelled"
  | "no_show";

const KIND_LABEL: Record<"table" | "bistro" | "box", string> = {
  table: "Mesa",
  bistro: "Bistrô",
  box: "Camarote",
};

interface StatusMeta {
  label: string;
  badgeClass: string;
  description?: string;
}

const STATUS_META: Record<ReservationStatus, StatusMeta> = {
  pending: {
    label: "AGUARDANDO CONFIRMAÇÃO",
    badgeClass: "bg-amber-500/15 text-amber-500 border border-amber-500/40",
    description:
      "Sua reserva foi criada e ficará disponível para confirmação.",
  },
  pending_payment: {
    label: "AGUARDANDO CONFIRMAÇÃO",
    badgeClass: "bg-amber-500/15 text-amber-500 border border-amber-500/40",
  },
  confirmed: {
    label: "RESERVA CONFIRMADA",
    badgeClass:
      "bg-emerald-500/15 text-emerald-500 border border-emerald-500/40",
    description:
      "Sua reserva está confirmada. Apresente este comprovante na entrada.",
  },
  completed: {
    label: "CHECK-IN REALIZADO",
    badgeClass: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/40",
    description: "Check-in já realizado na entrada.",
  },
  expired: {
    label: "RESERVA EXPIRADA",
    badgeClass: "bg-zinc-500/15 text-zinc-300 border border-zinc-500/40",
    description:
      "O prazo para confirmação foi encerrado. Esta reserva não está mais disponível.",
  },
  cancelled: {
    label: "RESERVA CANCELADA",
    badgeClass: "bg-rose-500/15 text-rose-400 border border-rose-500/40",
    description: "Esta reserva foi cancelada.",
  },
  no_show: {
    label: "NÃO COMPARECEU",
    badgeClass: "bg-orange-500/15 text-orange-400 border border-orange-500/40",
    description: "Cliente não compareceu na data agendada.",
  },
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");

const formatRemaining = (ms: number): string => {
  if (ms <= 0) return "00:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const PublicReservationSuccessPage = () => {
  const { publicToken } = useParams<{ publicToken: string }>();
  const location = useLocation();
  const state = (location.state ?? {}) as { result?: PublicReservationResult };
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement | null>(null);

  const [info, setInfo] = useState<PublicReservationInfo | null>(null);
  const [qrSvg, setQrSvg] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const refetch = async () => {
    if (!publicToken) return;
    try {
      const updated = await getPublicReservation(publicToken);
      if (updated) setInfo(updated);
    } catch {
      /* noop */
    }
  };

  useEffect(() => {
    if (!publicToken) return;
    let alive = true;
    getPublicReservation(publicToken)
      .then((data) => {
        if (alive) setInfo(data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [publicToken]);

  const status = (info?.status ?? state.result?.status ?? "pending_payment") as
    | ReservationStatus
    | string;

  // refetch every 15s while pending_payment, com tick imediato após expirar
  useEffect(() => {
    if (!publicToken) return;
    if (status !== "pending_payment") return;
    const iv = setInterval(() => {
      void refetch();
    }, 15000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicToken, status]);

  // contador regressivo
  useEffect(() => {
    if (status !== "pending_payment") return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [status]);

  const expiresMs = useMemo(() => {
    if (!info?.expires_at) return 0;
    return new Date(info.expires_at).getTime() - now;
  }, [info?.expires_at, now]);

  // quando o contador zera, faz um refetch para mover para 'expired'
  const triggeredExpireRefetch = useRef(false);
  useEffect(() => {
    if (status !== "pending_payment") {
      triggeredExpireRefetch.current = false;
      return;
    }
    if (
      info?.expires_at &&
      expiresMs <= 0 &&
      !triggeredExpireRefetch.current
    ) {
      triggeredExpireRefetch.current = true;
      void refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresMs, status, info?.expires_at]);

  const qrAllowed = status === "confirmed" || status === "completed";

  useEffect(() => {
    if (!qrAllowed) {
      setQrSvg("");
      return;
    }
    const payload =
      info?.qr_payload ??
      state.result?.qr_payload ??
      (publicToken ? `roxou://checkin?type=reservation&token=${publicToken}` : "");
    if (!payload) return;
    generateQrSvg(payload).then(setQrSvg).catch(() => setQrSvg(""));
  }, [qrAllowed, info?.qr_payload, state.result?.qr_payload, publicToken]);

  const partnerName =
    info?.partner_name?.trim() ||
    state.result?.partner_name?.trim() ||
    "Estabelecimento";
  const customerName = info?.name?.trim() || "Cliente não informado";
  const typeLabel = info?.type_kind
    ? `${KIND_LABEL[info.type_kind]}${info.type_name ? ` · ${info.type_name}` : ""}`
    : info?.type_name || "Reserva";
  const peopleCount = info?.people_count ?? info?.type_seats ?? 1;
  const peopleFixed =
    info?.type_seats != null && info.type_seats === info.people_count;
  const code = info?.code ?? state.result?.code ?? publicToken?.slice(0, 8).toUpperCase() ?? "";
  const dateLabel = info ? formatDateTimeSP(info.reservation_date) : "Carregando…";
  const expiresLabel = info?.expires_at ? formatDateTimeSP(info.expires_at) : "";

  const meta =
    STATUS_META[(status as ReservationStatus) in STATUS_META
      ? (status as ReservationStatus)
      : "pending_payment"];

  const filenameBase = slugify(info?.name ?? "reserva");

  const generateCardPng = async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    try {
      return await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0b0814",
      });
    } catch {
      toast({
        title: "Não foi possível gerar o comprovante.",
        variant: "destructive",
      });
      return null;
    }
  };

  const downloadCard = async () => {
    const url = await generateCardPng();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `comprovante-reserva-${filenameBase}.png`;
    a.click();
  };

  const buildShareText = () => {
    const lines: (string | null | false)[] = [
      `Reserva — ${partnerName}`,
      info?.type_name
        ? `${KIND_LABEL[info.type_kind ?? "table"]}: ${info.type_name}`
        : null,
      info?.name ? `Nome: ${info.name}` : null,
      `Pessoas: ${info?.people_count ?? 1}`,
      `Data: ${dateLabel}`,
      code ? `Código: ${code}` : null,
      "",
      "Comprovante de solicitação de reserva.",
      "A reserva só estará garantida após confirmação do estabelecimento ou pagamento.",
    ];
    return lines.filter(Boolean).join("\n");
  };

  const buildWhatsappMessage = () => {
    const link = typeof window !== "undefined" ? window.location.href : "";
    const valorLine = info?.total_price
      ? `Valor: R$ ${Number(info.total_price).toFixed(2)}\n`
      : "";
    const tipoLine = info?.type_name
      ? `Tipo: ${KIND_LABEL[info.type_kind ?? "table"]} — ${info.type_name}\n`
      : "";

    if (status === "confirmed" || status === "completed") {
      return (
        `Sua reserva está confirmada!\n\n` +
        `Estabelecimento: ${partnerName}\n` +
        tipoLine +
        `Data: ${dateLabel}\n` +
        `Pessoas: ${info?.people_count ?? 1}\n` +
        valorLine +
        `\nApresente o comprovante na entrada:\n${link}`
      );
    }

    if (status === "pending_payment") {
      return (
        `Sua reserva foi criada com sucesso!\n\n` +
        `Estabelecimento: ${partnerName}\n` +
        tipoLine +
        `Data: ${dateLabel}\n` +
        `Pessoas: ${info?.people_count ?? 1}\n` +
        valorLine +
        (expiresLabel
          ? `\nSua reserva precisa ser confirmada até ${expiresLabel}. Após esse prazo, ela poderá expirar automaticamente.\n`
          : "") +
        `\nComprovante:\n${link}`
      );
    }

    return (
      `Comprovante de reserva — ${partnerName}\n` +
      tipoLine +
      `Data: ${dateLabel}\n` +
      `Status: ${meta.label}\n\n${link}`
    );
  };

  const openWhatsapp = () => {
    const text = buildWhatsappMessage();
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const shareCard = async () => {
    const dataUrl = await generateCardPng();
    if (!dataUrl) return;
    const text = buildShareText();
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `comprovante-reserva-${filenameBase}.png`, {
        type: "image/png",
      });
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
      };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: "Comprovante de Reserva", text });
        return;
      }
    } catch {
      /* fallback */
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const showCountdown =
    status === "pending_payment" && !!info?.expires_at && expiresMs > 0;
  const countdownUrgent = showCountdown && expiresMs <= 5 * 60 * 1000;

  return (
    <main className="min-h-screen w-full bg-background overflow-x-hidden pb-24">
      <SEO
        title="Comprovante de Reserva | Roxou"
        description="Comprovante de solicitação de reserva."
      />
      <div className="mx-auto w-full max-w-md space-y-4 px-4 py-6">
        <header className="text-center space-y-1">
          <p className="text-xs uppercase tracking-wide text-primary">Reserva</p>
          <h1 className="text-2xl font-bold">
            {status === "confirmed"
              ? "Reserva confirmada!"
              : status === "expired"
              ? "Reserva expirada"
              : "Solicitação recebida"}
          </h1>
        </header>

        {/* Card de status */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider ${meta.badgeClass}`}
            >
              {meta.label}
            </span>
            {showCountdown ? (
              <span
                className={`font-mono text-lg font-bold ${
                  countdownUrgent ? "text-orange-500" : "text-amber-500"
                }`}
              >
                {formatRemaining(expiresMs)}
              </span>
            ) : null}
          </div>
          {meta.description ? (
            <p className="text-xs text-muted-foreground">{meta.description}</p>
          ) : null}
          {status === "pending_payment" && expiresLabel ? (
            <>
              <p className="text-xs text-foreground">
                Sua reserva precisa ser confirmada até{" "}
                <strong>{expiresLabel}</strong>.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Caso a confirmação não aconteça dentro do prazo, a reserva será
                cancelada automaticamente e a disponibilidade retornará ao
                sistema.
              </p>
              {countdownUrgent ? (
                <p className="text-[11px] font-semibold text-orange-500">
                  Atenção: sua reserva expira em breve.
                </p>
              ) : null}
            </>
          ) : null}
        </Card>

        {/* Sinal/PIX — quando habilitado e pendente */}
        {info?.deposit_enabled &&
        status === "pending_payment" &&
        (info.deposit_amount ?? 0) > 0 ? (
          <Card className="p-4 space-y-3 border-amber-500/40 bg-amber-500/5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">
                Pagamento do sinal
              </p>
              <p className="mt-1 text-sm">
                Para garantir sua reserva, envie o sinal de{" "}
                <strong>R$ {Number(info.deposit_amount).toFixed(2)}</strong>
                {expiresLabel ? (
                  <>
                    {" "}
                    até <strong>{expiresLabel}</strong>
                  </>
                ) : null}
                .
              </p>
              {(info.remaining_amount ?? 0) > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Restante no local: R${" "}
                  {Number(info.remaining_amount).toFixed(2)}
                </p>
              ) : null}
            </div>
            {info.pix_key ? (
              <div className="rounded-md border border-border/60 bg-background/40 p-3 text-xs space-y-1">
                <p className="text-muted-foreground">Chave PIX</p>
                <p className="font-mono break-all text-sm">{info.pix_key}</p>
                {info.pix_receiver_name ? (
                  <p className="text-[11px] text-muted-foreground">
                    Recebedor: {info.pix_receiver_name}
                  </p>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(info.pix_key ?? "");
                      toast({ title: "Chave PIX copiada" });
                    } catch {
                      toast({ title: "Não foi possível copiar" });
                    }
                  }}
                >
                  Copiar chave PIX
                </Button>
              </div>
            ) : null}
            {info.payment_instructions ? (
              <p className="text-xs whitespace-pre-line text-muted-foreground">
                {info.payment_instructions}
              </p>
            ) : null}
            <p className="text-[11px] text-muted-foreground">
              A confirmação é manual. Após o envio do comprovante, aguarde o
              estabelecimento confirmar sua reserva.
            </p>
          </Card>
        ) : null}



        {/* Comprovante (área capturada no PNG) */}
        <div
          ref={cardRef}
          className="rounded-2xl p-5 space-y-4"
          style={{
            background:
              "linear-gradient(160deg, #15102b 0%, #0b0814 60%, #1a0b2a 100%)",
            border: "1px solid rgba(168,85,247,0.25)",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {info?.partner_logo_url ? (
              <img
                src={info.partner_logo_url}
                alt={partnerName}
                crossOrigin="anonymous"
                className="w-12 h-12 rounded-full object-contain bg-white/10 shrink-0 p-1"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-white font-bold">
                {partnerName.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-primary">
                Comprovante de Reserva
              </p>
              <p className="text-sm font-bold text-white break-words line-clamp-2">
                {partnerName}
              </p>
            </div>
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${meta.badgeClass}`}
            >
              {meta.label}
            </span>
          </div>

          <div className="text-center text-white">
            <p className="text-xs text-white/60">Cliente</p>
            <p className="text-lg font-bold break-words line-clamp-2">{customerName}</p>
            {info?.phone ? (
              <p className="text-xs text-white/60 mt-0.5 break-all">{info.phone}</p>
            ) : null}
          </div>

          {/* QR condicional */}
          {qrAllowed ? (
            <>
              <div className="bg-white p-3 rounded-xl mx-auto w-full max-w-[260px] sm:max-w-[360px] aspect-square flex items-center justify-center overflow-hidden">
                {qrSvg ? (
                  <div
                    className="w-full h-full [&_svg]:w-full [&_svg]:h-full [&_svg]:max-w-full"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                ) : (
                  <div className="w-full h-full bg-muted" />
                )}
              </div>
              <p className="text-[11px] text-center text-white/70">
                Apresente este QR Code na entrada.
              </p>
            </>
          ) : status === "pending_payment" ? (
            <div className="mx-auto w-full max-w-[260px] sm:max-w-[360px] aspect-square flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 text-center px-4">
              <p className="text-[11px] uppercase tracking-wider text-amber-400">
                QR Code bloqueado
              </p>
              <p className="text-[11px] text-white/70">
                O QR Code será liberado após a confirmação da reserva.
              </p>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[260px] sm:max-w-[360px] aspect-square flex items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/5 text-center px-4">
              <p className="text-[11px] text-white/60">
                QR Code indisponível para esta reserva.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-[11px] text-white/80">
            <div>
              <p className="text-white/50">Tipo</p>
              <p className="font-medium break-words line-clamp-2">{typeLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-white/50">Código</p>
              <p className="font-mono font-bold tracking-widest break-all">{code}</p>
            </div>
            <div>
              <p className="text-white/50">Pessoas</p>
              <p className="font-medium">
                {peopleCount}
                {peopleFixed ? (
                  <span className="ml-1 text-[9px] text-white/60">(incluídas)</span>
                ) : null}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/50">Data / horário</p>
              <p className="font-medium">{dateLabel}</p>
            </div>
            {info?.total_price ? (
              <div className="col-span-2">
                <p className="text-white/50">Valor</p>
                <p className="font-bold text-white">
                  R$ {Number(info.total_price).toFixed(2)}
                </p>
              </div>
            ) : null}
            {status === "pending_payment" && expiresLabel ? (
              <div className="col-span-2">
                <p className="text-white/50">Confirmar até</p>
                <p className="font-medium text-amber-300">{expiresLabel}</p>
              </div>
            ) : null}
            {(info as unknown as { checked_in_at?: string | null } | null)
              ?.checked_in_at ? (
              <div className="col-span-2">
                <p className="text-white/50">Check-in</p>
                <p className="font-medium text-emerald-300">
                  {formatDateTimeSP(
                    (info as unknown as { checked_in_at: string }).checked_in_at,
                  )}
                </p>
              </div>
            ) : null}
          </div>

          <p className="text-[9px] text-white/50 text-center leading-relaxed border-t border-white/10 pt-3">
            Este documento é um comprovante de solicitação de reserva. A reserva
            só estará garantida após confirmação do estabelecimento ou pagamento,
            conforme regras do local.
          </p>

          <p className="text-[9px] text-white/40 text-center">
            Powered by Roxou Partner Pro
          </p>
        </div>

        {/* Ações */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
          <Button
            variant="secondary"
            onClick={downloadCard}
            className="w-full min-w-0 truncate"
          >
            Salvar comprovante
          </Button>
          <Button
            variant="outline"
            onClick={shareCard}
            className="w-full min-w-0 truncate"
          >
            Compartilhar
          </Button>
          <Button
            onClick={openWhatsapp}
            className="w-full min-w-0 truncate bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Enviar pelo WhatsApp
          </Button>
        </div>

        {publicToken ? (
          <SaveToAccountButton kind="reservation" token={publicToken} />
        ) : null}



        <div className="text-center">
          <Link to="/" className="text-xs text-muted-foreground underline">
            Voltar para Roxou
          </Link>
        </div>
      </div>
    </main>
  );
};

export default PublicReservationSuccessPage;
