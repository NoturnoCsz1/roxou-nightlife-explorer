/**
 * PartnerValidatorPage — Validador de QR Codes (Lista VIP, Reservas, Convites).
 *
 * - Câmera traseira preferencial (qr-scanner).
 * - Fallback manual: colar/digitar payload.
 * - Detecta tipo (vip/reservation/invite) e valida via partnerValidator service.
 * - Mostra resultado: válido (verde), já utilizado (amarelo), inválido/expirado (vermelho).
 * - Histórico básico das últimas validações (em memória).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import {
  validateQrCode,
  type ValidationOutcome,
  type ValidatorItemType,
} from "../services/partnerValidator";

type LastResult = Awaited<ReturnType<typeof validateQrCode>>;

interface HistoryItem {
  id: string;
  at: number;
  outcome: ValidationOutcome;
  type: ValidatorItemType;
  ref: string;
  message: string;
}

const outcomeStyle: Record<ValidationOutcome, { ring: string; bg: string; label: string }> = {
  valid: {
    ring: "border-emerald-500/60",
    bg: "bg-emerald-500/10 text-emerald-300",
    label: "Válido",
  },
  already_used: {
    ring: "border-amber-500/60",
    bg: "bg-amber-500/10 text-amber-300",
    label: "Já utilizado",
  },
  expired: {
    ring: "border-rose-500/60",
    bg: "bg-rose-500/10 text-rose-300",
    label: "Expirado",
  },
  not_found: {
    ring: "border-rose-500/60",
    bg: "bg-rose-500/10 text-rose-300",
    label: "Não encontrado",
  },
  wrong_event: {
    ring: "border-rose-500/60",
    bg: "bg-rose-500/10 text-rose-300",
    label: "Evento errado",
  },
  unsupported: {
    ring: "border-zinc-500/60",
    bg: "bg-zinc-500/10 text-zinc-300",
    label: "Em breve",
  },
  error: {
    ring: "border-rose-500/60",
    bg: "bg-rose-500/10 text-rose-300",
    label: "Erro",
  },
};

const typeLabel: Record<ValidatorItemType, string> = {
  vip: "Lista VIP",
  reservation: "Reserva",
  invite: "Convite",
  unknown: "Desconhecido",
};

const PartnerValidatorPage = () => {
  const { selectedPartner } = usePartnerAuth();
  const partnerId = selectedPartner?.id ?? null;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const lastScanRef = useRef<string>("");
  const lastScanAtRef = useRef<number>(0);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LastResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const pushHistory = useCallback(
    (r: LastResult) => {
      setHistory((prev) =>
        [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            at: Date.now(),
            outcome: r.outcome,
            type: r.type,
            ref: r.ref ?? "—",
            message: r.message,
          },
          ...prev,
        ].slice(0, 20),
      );
    },
    [],
  );

  const handleValidate = useCallback(
    async (raw: string) => {
      if (!raw.trim() || busy) return;
      setBusy(true);
      try {
        const r = await validateQrCode(raw, partnerId);
        setResult(r);
        pushHistory(r);
      } catch (err) {
        setResult({
          parsed: { type: "unknown", token: null, id: null, raw },
          outcome: "error",
          type: "unknown",
          message: err instanceof Error ? err.message : "Erro inesperado.",
        });
      } finally {
        setBusy(false);
      }
    },
    [busy, partnerId, pushHistory],
  );

  // Start camera
  const startCamera = useCallback(async () => {
    if (!videoRef.current || scannerRef.current) return;
    setCameraError(null);

    // HTTPS obrigatório (exceto localhost)
    if (
      typeof window !== "undefined" &&
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      setCameraError(
        "A câmera exige HTTPS. Abra esta página em https:// ou use a validação manual.",
      );
      return;
    }

    // API getUserMedia disponível?
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraError(
        "Este navegador não suporta câmera. Use a validação manual.",
      );
      return;
    }

    try {
      const hasCam = await QrScanner.hasCamera();
      if (!hasCam) {
        setCameraError(
          "Nenhuma câmera detectada neste dispositivo. Use a validação manual.",
        );
        return;
      }

      const scanner = new QrScanner(
        videoRef.current,
        (res) => {
          const data = res.data.trim();
          const now = Date.now();
          // Debounce mesmo QR
          if (data === lastScanRef.current && now - lastScanAtRef.current < 2500)
            return;
          lastScanRef.current = data;
          lastScanAtRef.current = now;
          void handleValidate(data);
        },
        {
          preferredCamera: "environment",
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
          returnDetailedScanResult: true,
        },
      );
      scannerRef.current = scanner;
      await scanner.start();
      setCameraOn(true);
    } catch (err) {
      if (import.meta.env.DEV) console.error("[VALIDATOR] camera error:", err);
      try {
        scannerRef.current?.destroy();
      } catch {
        /* noop */
      }
      scannerRef.current = null;
      setCameraOn(false);

      const name = (err as { name?: string })?.name ?? "";
      const msg = err instanceof Error ? err.message : String(err);
      const inIframe =
        typeof window !== "undefined" && window.self !== window.top;

      let friendly = "Câmera indisponível. Use a validação manual.";
      if (name === "NotAllowedError" || /permission|denied/i.test(msg)) {
        friendly =
          "Permissão da câmera negada. Habilite nas configurações do navegador ou use a validação manual.";
      } else if (name === "NotFoundError" || /no camera/i.test(msg)) {
        friendly =
          "Nenhuma câmera encontrada. Use a validação manual.";
      } else if (name === "NotReadableError") {
        friendly =
          "Câmera em uso por outro app. Feche-o e tente novamente.";
      } else if (inIframe) {
        friendly =
          "A câmera pode estar bloqueada dentro do Preview da Lovable. Abra /partner/validator em uma aba normal do celular ou use a validação manual.";
      }
      setCameraError(friendly);
    }
  }, [handleValidate]);

  const stopCamera = useCallback(() => {
    try {
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
    } catch {
      /* noop */
    }
    scannerRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => {
    return () => {
      try {
        scannerRef.current?.stop();
        scannerRef.current?.destroy();
      } catch {
        /* noop */
      }
      scannerRef.current = null;
    };
  }, []);

  const confirmCheckIn = async () => {
    if (!result?.confirm) return;
    setBusy(true);
    try {
      const r = await result.confirm();
      setResult({ ...r, parsed: result.parsed });
      pushHistory(r as LastResult);
    } finally {
      setBusy(false);
    }
  };

  const style = result ? outcomeStyle[result.outcome] : null;

  const partnerName = useMemo(
    () => selectedPartner?.name ?? "Sem estabelecimento",
    [selectedPartner?.name],
  );

  return (
    <main
      className="min-h-screen w-full overflow-x-hidden"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="w-full max-w-md mx-auto px-4 py-4 space-y-4">
        <header className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-primary">
            Partner Pro
          </p>
          <h1 className="text-2xl font-bold">Validador</h1>
          <p className="text-xs text-muted-foreground break-words">
            {partnerName} · valida Lista VIP, Reservas e Convites por QR.
          </p>
        </header>

        {/* Camera */}
        <Card className="overflow-hidden p-0">
          <div className="relative aspect-square w-full bg-black">
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              playsInline
              muted
            />
            {!cameraOn ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center text-white/70">
                <p className="text-sm">
                  {cameraError ?? "Toque para abrir a câmera traseira."}
                </p>
                <Button
                  onClick={startCamera}
                  className="h-12 w-full max-w-[240px] text-base"
                >
                  Abrir câmera
                </Button>
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-0 ring-2 ring-primary/30" />
            )}
          </div>
          {cameraOn ? (
            <div className="flex items-center justify-between gap-2 border-t border-border/40 p-2">
              <p className="text-xs text-muted-foreground">
                Aponte para o QR Code do convidado.
              </p>
              <Button size="sm" variant="secondary" onClick={stopCamera}>
                Parar
              </Button>
            </div>
          ) : null}
        </Card>

        {/* Manual */}
        <Card className="p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Validação manual
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Cole o código ou link do QR..."
              className="min-w-0 flex-1"
            />
            <Button
              onClick={() => {
                void handleValidate(manual);
              }}
              disabled={busy || !manual.trim()}
              className="shrink-0"
            >
              Validar
            </Button>
          </div>
        </Card>

        {/* Result */}
        {result && style ? (
          <Card
            className={`border-2 ${style.ring} p-4 space-y-3 break-words`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge className={style.bg}>{style.label}</Badge>
              <Badge variant="outline" className="text-[10px]">
                {typeLabel[result.type]}
              </Badge>
            </div>
            {result.ref ? (
              <p className="text-lg font-bold break-words">{result.ref}</p>
            ) : null}
            <p className="text-sm text-muted-foreground break-words">
              {result.message}
            </p>

            {result.vipEntry?.promoter_name_snapshot ? (
              <p className="text-xs text-muted-foreground break-words">
                Promoter: {result.vipEntry.promoter_name_snapshot}
              </p>
            ) : null}
            {result.reservation?.reservation_date ? (
              <p className="text-xs text-muted-foreground">
                {new Date(result.reservation.reservation_date).toLocaleString(
                  "pt-BR",
                  { timeZone: "America/Sao_Paulo" },
                )}
              </p>
            ) : null}

            {result.outcome === "valid" && result.confirm ? (
              <Button
                onClick={() => void confirmCheckIn()}
                disabled={busy}
                className="w-full h-12 text-base"
              >
                {busy ? "Confirmando..." : "Confirmar check-in"}
              </Button>
            ) : null}
          </Card>
        ) : null}

        {/* Histórico */}
        {history.length ? (
          <Card className="p-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Validações recentes
            </p>
            <ul className="space-y-1.5">
              {history.map((h) => {
                const s = outcomeStyle[h.outcome];
                return (
                  <li
                    key={h.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/40 px-2 py-1.5 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{h.ref}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {typeLabel[h.type]} ·{" "}
                        {new Date(h.at).toLocaleTimeString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                        })}
                      </p>
                    </div>
                    <Badge className={`${s.bg} shrink-0 text-[10px]`}>
                      {s.label}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}

        <p className="text-[10px] text-center text-muted-foreground">
          Compatível com QR antigos da Lista VIP. Padrão novo: roxou://checkin?type=...
        </p>
      </div>
    </main>
  );
};

export default PartnerValidatorPage;
