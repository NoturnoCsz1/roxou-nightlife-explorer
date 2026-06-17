/**
 * Comprovante público de reserva — /reserva/sucesso/:publicToken
 *
 * Cartão completo com logo, dados, QR, status e contador regressivo
 * quando pending_payment. Suporta salvar comprovante (PNG) e
 * compartilhar comprovante. Nunca expõe o QR isolado.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { generateQrSvg } from "@/lib/qrcode";
import {
  getPublicReservation,
  type PublicReservationInfo,
  type PublicReservationResult,
} from "@/services/publicReservations";

const KIND_LABEL: Record<"table" | "bistro" | "box", string> = {
  table: "Mesa",
  bistro: "Bistrô",
  box: "Camarote",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  pending_payment: "Aguardando confirmação/pagamento",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Concluída",
  expired: "Expirada",
  no_show: "No-show",
};

const STATUS_COLOR: Record<string, string> = {
  pending_payment: "#f59e0b",
  confirmed: "#10b981",
  completed: "#3b82f6",
  expired: "#71717a",
  cancelled: "#f43f5e",
  no_show: "#fb923c",
  pending: "#f59e0b",
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

  // refetch every 15s while pending_payment
  useEffect(() => {
    if (!publicToken) return;
    if (info?.status !== "pending_payment") return;
    const iv = setInterval(async () => {
      try {
        const updated = await getPublicReservation(publicToken);
        if (updated) setInfo(updated);
      } catch {
        /* noop */
      }
    }, 15000);
    return () => clearInterval(iv);
  }, [publicToken, info?.status]);

  useEffect(() => {
    if (info?.status !== "pending_payment") return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [info?.status]);

  useEffect(() => {
    const payload =
      info?.qr_payload ??
      state.result?.qr_payload ??
      (publicToken ? `roxou://checkin?type=reservation&token=${publicToken}` : "");
    if (!payload) return;
    generateQrSvg(payload).then(setQrSvg).catch(() => setQrSvg(""));
  }, [info?.qr_payload, state.result?.qr_payload, publicToken]);

  const partnerName = info?.partner_name ?? "Estabelecimento";
  const code = info?.code ?? publicToken?.slice(0, 8).toUpperCase() ?? "";
  const dateLabel = info
    ? new Date(info.reservation_date).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";

  const expiresMs = useMemo(() => {
    if (!info?.expires_at) return 0;
    return new Date(info.expires_at).getTime() - now;
  }, [info?.expires_at, now]);

  const status = info?.status ?? state.result?.status ?? "pending_payment";
  const statusColor = STATUS_COLOR[status] ?? "#71717a";

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

  const buildShareText = () =>
    [
      `Reserva — ${partnerName}`,
      info?.type_name ? `${KIND_LABEL[info.type_kind ?? "table"]}: ${info.type_name}` : null,
      info?.name ? `Nome: ${info.name}` : null,
      `Pessoas: ${info?.people_count ?? 1}`,
      `Data: ${dateLabel}`,
      code ? `Código: ${code}` : null,
      "",
      "Comprovante de solicitação de reserva.",
      "A reserva só estará garantida após confirmação do estabelecimento ou pagamento.",
    ]
      .filter(Boolean)
      .join("\n");

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

  const showCountdown = status === "pending_payment" && expiresMs > 0;
  const expired = status === "expired" || (status === "pending_payment" && expiresMs <= 0 && info?.expires_at);

  return (
    <main className="min-h-screen w-full bg-background overflow-x-hidden">
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
              : "Solicitação recebida"}
          </h1>
        </header>

        {showCountdown ? (
          <Card className="border-amber-500/40 bg-amber-500/5 p-3 text-center">
            <p className="text-xs text-amber-600">
              Tempo restante para confirmação
            </p>
            <p className="font-mono text-3xl font-bold text-amber-500">
              {formatRemaining(expiresMs)}
            </p>
          </Card>
        ) : null}

        {expired ? (
          <Card className="border-rose-500/40 bg-rose-500/5 p-3 text-center text-sm text-rose-500">
            Reserva expirada. Faça uma nova solicitação.
          </Card>
        ) : null}

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
          <div className="flex items-center gap-3">
            {info?.partner_logo_url ? (
              <img
                src={info.partner_logo_url}
                alt={partnerName}
                crossOrigin="anonymous"
                className="w-12 h-12 rounded-full object-cover bg-white/5 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-white/10 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-primary">
                Comprovante de Reserva
              </p>
              <p className="text-sm font-bold text-white break-words">
                {partnerName}
              </p>
            </div>
            <span
              className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: `${statusColor}22`, color: statusColor }}
            >
              {STATUS_LABEL[status] ?? status}
            </span>
          </div>

          <div className="text-center text-white">
            <p className="text-xs text-white/60">Cliente</p>
            <p className="text-lg font-bold break-words">{info?.name ?? "—"}</p>
            {info?.phone ? (
              <p className="text-xs text-white/60 mt-0.5">{info.phone}</p>
            ) : null}
          </div>

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

          <div className="grid grid-cols-2 gap-2 text-[11px] text-white/80">
            <div>
              <p className="text-white/50">Tipo</p>
              <p className="font-medium break-words">
                {info?.type_kind
                  ? `${KIND_LABEL[info.type_kind]}${info.type_name ? ` · ${info.type_name}` : ""}`
                  : "Reserva geral"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/50">Código</p>
              <p className="font-mono font-bold tracking-widest">{code}</p>
            </div>
            <div>
              <p className="text-white/50">Pessoas</p>
              <p className="font-medium">{info?.people_count ?? 1}</p>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
          <Button
            variant="secondary"
            onClick={downloadCard}
            className="w-full min-w-0 truncate"
          >
            Salvar comprovante (PNG)
          </Button>
          <Button
            onClick={shareCard}
            className="w-full min-w-0 truncate"
          >
            Compartilhar comprovante
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Apresente este QR Code na portaria para validar sua reserva.
        </p>

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
