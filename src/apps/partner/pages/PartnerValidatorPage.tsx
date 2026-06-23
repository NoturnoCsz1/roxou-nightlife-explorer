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
  excursion: "Excursão",
  unknown: "Desconhecido",
};

// ============ Feedback sonoro + vibração ============
let audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    if (!audioCtx) audioCtx = new Ctor();
    return audioCtx;
  } catch {
    return null;
  }
}
function beep(kind: "success" | "warn" | "error") {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const playTone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + start + 0.01);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.02);
    };
    if (kind === "success") {
      playTone(880, 0, 0.12);
      playTone(1320, 0.1, 0.14);
    } else if (kind === "warn") {
      playTone(520, 0, 0.18);
    } else {
      playTone(200, 0, 0.18);
      playTone(160, 0.18, 0.22);
    }
  } catch {
    /* noop */
  }
}
function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* noop */
  }
}

const PartnerValidatorPage = () => {
  const { selectedPartner } = usePartnerAuth();
  const partnerId = selectedPartner?.id ?? null;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const lastScanRef = useRef<string>("");
  const lastScanAtRef = useRef<number>(0);
  const processingRef = useRef<boolean>(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LastResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const pushHistory = useCallback((r: LastResult) => {
    setHistory((prev) => {
      const ref = r.ref ?? "—";
      const now = Date.now();
      const idx = prev.findIndex(
        (h) => h.ref === ref && h.type === r.type && now - h.at < 10_000,
      );
      const item: HistoryItem = {
        id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
        at: now,
        outcome: r.outcome,
        type: r.type,
        ref,
        message: r.message,
      };
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = { ...item, id: prev[idx].id };
        return next.slice(0, 20);
      }
      return [item, ...prev].slice(0, 20);
    });
  }, []);

  const playFeedback = useCallback((outcome: ValidationOutcome) => {
    if (outcome === "valid") {
      beep("success");
      vibrate(120);
    } else if (outcome === "already_used") {
      beep("warn");
      vibrate([80, 80, 80]);
    } else if (outcome === "unsupported") {
      /* silencioso */
    } else {
      beep("error");
      vibrate([80, 80, 80]);
    }
  }, []);

  const handleValidate = useCallback(
    async (raw: string) => {
      if (!raw.trim()) return;
      if (processingRef.current) return;
      processingRef.current = true;
      setBusy(true);
      try {
        const r = await validateQrCode(raw, partnerId);
        // Auto check-in se válido
        if (r.outcome === "valid" && typeof r.confirm === "function") {
          try {
            const confirmed = await r.confirm();
            const final: LastResult = { ...confirmed, parsed: r.parsed };
            setResult(final);
            pushHistory(final);
            playFeedback(final.outcome);
            return;
          } catch (err) {
            const errRes: LastResult = {
              parsed: r.parsed,
              outcome: "error",
              type: r.type,
              message:
                err instanceof Error ? err.message : "Falha no check-in.",
            };
            setResult(errRes);
            pushHistory(errRes);
            playFeedback("error");
            return;
          }
        }
        setResult(r);
        pushHistory(r);
        playFeedback(r.outcome);
      } catch (err) {
        const errRes: LastResult = {
          parsed: { type: "unknown", token: null, id: null, raw },
          outcome: "error",
          type: "unknown",
          message: err instanceof Error ? err.message : "Erro inesperado.",
        };
        setResult(errRes);
        pushHistory(errRes);
        playFeedback("error");
      } finally {
        setBusy(false);
        setTimeout(() => {
          processingRef.current = false;
        }, 1500);
      }
    },
    [partnerId, pushHistory, playFeedback],
  );

  // Start camera
  const startCamera = useCallback(async () => {
    if (!videoRef.current || scannerRef.current) return;
    setCameraError(null);
    try {
      const ctx = getAudioCtx();
      if (ctx?.state === "suspended") void ctx.resume();
    } catch {
      /* noop */
    }

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
          if (processingRef.current) return;
          if (data === lastScanRef.current && now - lastScanAtRef.current < 3000)
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
        friendly = "Nenhuma câmera encontrada. Use a validação manual.";
      } else if (name === "NotReadableError") {
        friendly = "Câmera em uso por outro app. Feche-o e tente novamente.";
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

  const scanNext = useCallback(() => {
    lastScanRef.current = "";
    lastScanAtRef.current = 0;
    setResult(null);
    setManual("");
  }, []);

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
            {partnerName} · valida Lista VIP, Reservas, Convites e Excursões 🚍 por QR.
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
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text").trim();
                if (pasted) {
                  setManual(pasted);
                  // Aguarda state propagar
                  setTimeout(() => void handleValidate(pasted), 0);
                }
              }}
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
              <Badge className={`${style.bg} text-sm font-bold uppercase tracking-wide`}>
                {result.outcome === "valid"
                  ? result.type === "reservation"
                    ? "Reserva validada"
                    : result.type === "excursion"
                      ? "Embarque confirmado"
                      : "Check-in realizado"
                  : result.outcome === "already_used"
                    ? "Já utilizado"
                    : style.label}
              </Badge>
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
            <p className="text-[11px] text-muted-foreground">
              {new Date().toLocaleTimeString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}
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

            <Button
              onClick={scanNext}
              disabled={busy}
              variant="secondary"
              className="w-full h-11"
            >
              Escanear próximo
            </Button>
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
