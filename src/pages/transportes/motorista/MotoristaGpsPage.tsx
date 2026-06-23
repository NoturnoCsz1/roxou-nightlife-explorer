/**
 * MotoristaGpsPage — Fase 7.4
 *
 * Página do motorista que ativa watchPosition do navegador e envia
 * pings GPS para o backend via RPC `excursion_push_gps`.
 *
 * Throttle: envia se passaram ≥15s OU se movimento for ≥50 metros desde o
 * último envio. Não há polling — toda atualização vem do GPS do device.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, MapPin, Pause, Play, Radio, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  pushGps,
  setOperationStatus,
  operationStatusLabel,
  type ExcursionOperationStatus,
} from "@/services/excursionGps";
import {
  listPartnerExcursionTrips,
  type ExcursionTrip,
} from "@/apps/partner/services/partnerExcursoes";
import { supabase } from "@/integrations/supabase/client";
import { trackExcursion } from "@/lib/analyticsExcursoes";

const MIN_INTERVAL_MS = 15_000;
const MIN_DISTANCE_M = 50;

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export default function MotoristaGpsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTrip = searchParams.get("trip") ?? "";

  const [trips, setTrips] = useState<ExcursionTrip[]>([]);
  const [tripId, setTripId] = useState<string>(initialTrip);
  const [tracking, setTracking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lastPing, setLastPing] = useState<{
    lat: number;
    lng: number;
    sentAt: number;
  } | null>(null);
  const [pingCount, setPingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<{ lat: number; lng: number; ts: number } | null>(null);
  const inflightRef = useRef(false);

  useEffect(() => {
    document.title = "Compartilhar GPS · Roxou Motorista";
  }, []);

  // Carrega viagens em que o usuário tem acesso (partner staff em qualquer parceiro)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) return;
        const { data: pus } = await supabase
          .from("partner_users")
          .select("partner_id")
          .eq("user_id", uid);
        const partnerIds = (pus ?? []).map((p) => p.partner_id);
        if (partnerIds.length === 0) return;
        const all: ExcursionTrip[] = [];
        for (const pid of partnerIds) {
          const t = await listPartnerExcursionTrips(pid).catch(() => []);
          all.push(...t);
        }
        all.sort((a, b) => a.departure_at.localeCompare(b.departure_at));
        if (alive) setTrips(all.filter((t) => t.status !== "cancelled"));
      } catch {
        /* silent */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === tripId) ?? null,
    [trips, tripId],
  );

  const stopWatch = useCallback(() => {
    if (watchIdRef.current != null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    setTracking(false);
    setPaused(false);
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handlePosition = useCallback(
    async (pos: GeolocationPosition) => {
      if (!tripId || paused || inflightRef.current) return;
      const now = Date.now();
      const cur = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const prev = lastSentRef.current;
      if (prev) {
        const dt = now - prev.ts;
        const dist = haversineMeters(prev, cur);
        if (dt < MIN_INTERVAL_MS && dist < MIN_DISTANCE_M) return;
      }
      inflightRef.current = true;
      try {
        const res = await pushGps({
          trip_id: tripId,
          lat: cur.lat,
          lng: cur.lng,
          speed: pos.coords.speed ?? null,
          heading: pos.coords.heading ?? null,
          accuracy: pos.coords.accuracy ?? null,
        });
        if (res.ok) {
          lastSentRef.current = { ...cur, ts: now };
          setLastPing({ ...cur, sentAt: now });
          setPingCount((c) => c + 1);
          setError(null);
        } else {
          setError(`Falha ao enviar (${res.reason ?? "erro"})`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro de rede");
      } finally {
        inflightRef.current = false;
      }
    },
    [tripId, paused],
  );

  async function handleStart() {
    if (!tripId) {
      toast.error("Selecione uma viagem.");
      return;
    }
    if (!("geolocation" in navigator)) {
      toast.error("Este dispositivo não suporta GPS.");
      return;
    }
    try {
      await setOperationStatus(tripId, "en_route");
    } catch {
      /* não bloqueia start se RPC falhar */
    }
    trackExcursion("excursion_gps_start", { trip_id: tripId });
    const id = navigator.geolocation.watchPosition(
      handlePosition,
      (err) => {
        setError(err.message || "Permissão negada");
        toast.error(err.message || "Não foi possível acessar o GPS");
        stopWatch();
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30_000 },
    );
    watchIdRef.current = id;
    setTracking(true);
    setPaused(false);
    toast.success("Transmissão ao vivo iniciada");
  }

  function handlePauseToggle() {
    setPaused((p) => !p);
    toast.info(paused ? "Transmissão retomada" : "Transmissão pausada");
  }

  async function handleFinish(opStatus: ExcursionOperationStatus) {
    stopWatch();
    if (tripId) {
      try {
        await setOperationStatus(tripId, opStatus);
        trackExcursion("excursion_complete", { trip_id: tripId, opStatus });
        toast.success(`Viagem marcada como ${operationStatusLabel[opStatus]}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
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
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </button>

        <header className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-primary">
            🚍 Motorista
          </p>
          <h1 className="text-2xl font-bold leading-tight">Compartilhar GPS</h1>
          <p className="text-xs text-muted-foreground">
            A transmissão respeita seu plano de dados: envia a cada 15s ou 50m.
          </p>
        </header>

        <Card className="p-4 space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Viagem
          </label>
          <select
            value={tripId}
            onChange={(e) => setTripId(e.target.value)}
            disabled={tracking}
            className="w-full h-10 rounded-md bg-background border border-border px-2 text-sm"
          >
            <option value="">Selecione…</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ·{" "}
                {new Date(t.departure_at).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </option>
            ))}
          </select>
          {selectedTrip ? (
            <p className="text-[11px] text-muted-foreground">
              {selectedTrip.destination ?? "Sem destino"} · {selectedTrip.capacity} lugares
            </p>
          ) : null}
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio
                className={`h-4 w-4 ${tracking && !paused ? "text-emerald-400 animate-pulse" : "text-muted-foreground"}`}
              />
              <span className="text-sm font-semibold">
                {tracking
                  ? paused
                    ? "Pausado"
                    : "Transmitindo ao vivo"
                  : "Inativo"}
              </span>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              {pingCount} envios
            </Badge>
          </div>

          {lastPing ? (
            <div className="text-[11px] text-muted-foreground space-y-0.5">
              <p className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {lastPing.lat.toFixed(5)}, {lastPing.lng.toFixed(5)}
              </p>
              <p>
                Último envio há{" "}
                {Math.round((Date.now() - lastPing.sentAt) / 1000)}s
              </p>
            </div>
          ) : tracking ? (
            <p className="text-[11px] text-muted-foreground">
              Aguardando primeira posição…
            </p>
          ) : null}

          {error ? (
            <p className="text-[11px] text-rose-400">{error}</p>
          ) : null}

          {!tracking ? (
            <Button onClick={handleStart} className="w-full h-12" disabled={!tripId}>
              <Play className="h-4 w-4 mr-1" /> Iniciar transmissão
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={handlePauseToggle}
                className="h-11"
              >
                <Pause className="h-4 w-4 mr-1" />
                {paused ? "Retomar" : "Pausar"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleFinish("completed")}
                className="h-11"
              >
                <Square className="h-4 w-4 mr-1" /> Finalizar
              </Button>
            </div>
          )}
        </Card>

        {tracking ? (
          <Card className="p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status operacional
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  "boarding",
                  "en_route",
                  "arrived",
                  "returning",
                ] as ExcursionOperationStatus[]
              ).map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!tripId) return;
                    try {
                      await setOperationStatus(tripId, s);
                      toast.success(operationStatusLabel[s]);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Erro");
                    }
                  }}
                >
                  {operationStatusLabel[s]}
                </Button>
              ))}
            </div>
          </Card>
        ) : null}

        <p className="text-[10px] text-muted-foreground text-center">
          Deixe esta tela aberta durante a viagem. Em alguns dispositivos, o GPS
          pausa com a tela bloqueada — use modo de tela ativa.
        </p>

        <div className="flex justify-center pt-2">
          <Link
            to="/transportes/motorista"
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Voltar para motorista
          </Link>
        </div>
      </div>
    </main>
  );
}
