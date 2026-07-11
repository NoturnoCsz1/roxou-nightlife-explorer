/**
 * OccupancyInsightsPremium — Fase 8 (UI only)
 *
 * Repagina a IA de Ocupação com layout premium:
 * - Hero com resumo agregado (tipos analisados, ganho potencial de ocupação)
 * - Card por tipo com barra de confiança, comparação visual atual vs sugerido
 * - Sugestão clara em destaque e CTA grande
 *
 * Sem mudanças de lógica, services, RPCs ou cálculos. Reaproveita
 * getReservationOccupancyInsights e updateReservationTypeDuration.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  getReservationOccupancyInsights,
  updateReservationTypeDuration,
  type OccupancyInsight,
} from "@modules/partner/reservations";
import { GlassCard, SectionHeader, SkeletonBlock } from "./ui";

const KIND_LABEL: Record<OccupancyInsight["type_kind"], string> = {
  table: "Mesa",
  bistro: "Bistrô",
  box: "Camarote",
};

const CONFIDENCE_META: Record<
  OccupancyInsight["confidence"],
  { label: string; pct: number; cls: string; bar: string }
> = {
  low: {
    label: "Baixa",
    pct: 25,
    cls: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
    bar: "bg-zinc-500",
  },
  medium: {
    label: "Média",
    pct: 60,
    cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    bar: "bg-amber-500",
  },
  high: {
    label: "Alta",
    pct: 95,
    cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    bar: "bg-emerald-500",
  },
};

const formatDuration = (m: number): string => {
  if (!m || m <= 0) return "—";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}h` : `${h}h${String(r).padStart(2, "0")}`;
};

interface Props {
  partnerId: string;
  canEdit: boolean;
}

export function OccupancyInsightsPremium({ partnerId, canEdit }: Props) {
  const [rows, setRows] = useState<OccupancyInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    setErrored(false);
    try {
      const data = await getReservationOccupancyInsights(partnerId, 30);
      setRows(data);
    } catch (err) {
      // Fallback amigável — não mostra erro técnico ao parceiro.
      // Logamos para diagnóstico mas a UI segue limpa.
      console.warn("[OccupancyInsights] RPC error:", (err as Error).message);
      setErrored(true);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const analyzed = rows.length;
    const actionable = rows.filter(
      (r) =>
        r.confidence !== "low" &&
        r.suggested_duration_minutes !== r.current_duration_minutes,
    ).length;
    const totalCurrent = rows.reduce(
      (acc, r) => acc + r.current_duration_minutes,
      0,
    );
    const totalSuggested = rows.reduce(
      (acc, r) => acc + r.suggested_duration_minutes,
      0,
    );
    const deltaPct =
      totalCurrent > 0
        ? Math.round(((totalSuggested - totalCurrent) / totalCurrent) * 100)
        : 0;
    return { analyzed, actionable, deltaPct };
  }, [rows]);

  const handleApply = async (row: OccupancyInsight) => {
    setApplying(row.reservation_type_id);
    try {
      await updateReservationTypeDuration(
        row.reservation_type_id,
        partnerId,
        row.suggested_duration_minutes,
      );
      toast({ title: "Sugestão aplicada", description: row.type_name });
      void load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Hero */}
      <GlassCard className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "var(--partner-gradient)" }}
          >
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              IA de Ocupação · últimos 30 dias
            </p>
            <h3 className="text-lg font-semibold leading-tight">
              {summary.analyzed > 0
                ? `${summary.actionable} ${summary.actionable === 1 ? "ajuste recomendado" : "ajustes recomendados"}`
                : "Coletando histórico"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.analyzed > 0
                ? `${summary.analyzed} ${summary.analyzed === 1 ? "tipo analisado" : "tipos analisados"} · aplicar afeta apenas novas reservas.`
                : "Conforme as reservas forem liberadas, a IA passa a recomendar durações."}
            </p>
          </div>
          {summary.analyzed > 0 && summary.deltaPct !== 0 && (
            <div className="text-right shrink-0">
              <div className="flex items-center justify-end gap-1 text-sm font-semibold">
                {summary.deltaPct < 0 ? (
                  <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
                )}
                <span
                  className={
                    summary.deltaPct < 0 ? "text-emerald-400" : "text-amber-400"
                  }
                >
                  {summary.deltaPct > 0 ? "+" : ""}
                  {summary.deltaPct}%
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                duração média
              </p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* List */}
      {loading && rows.length === 0 ? (
        <div className="space-y-2">
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
        </div>
      ) : rows.length === 0 ? (
        <GlassCard className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {errored
              ? "Ainda não há dados suficientes para calcular sugestões."
              : "Sem dados suficientes ainda."}
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((r) => {
            const conf = CONFIDENCE_META[r.confidence];
            const delta =
              r.suggested_duration_minutes - r.current_duration_minutes;
            const changed = delta !== 0;
            const trendIcon =
              delta < 0 ? (
                <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />
              ) : delta > 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Minus className="h-3.5 w-3.5 text-muted-foreground" />
              );

            return (
              <GlassCard key={r.reservation_type_id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {KIND_LABEL[r.type_kind]}
                    </p>
                    <p className="text-sm font-semibold truncate">
                      {r.type_name}
                    </p>
                  </div>
                  <Badge variant="outline" className={conf.cls}>
                    {conf.label}
                  </Badge>
                </div>

                {/* Confidence bar */}
                <div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Confiança</span>
                    <span>{r.sample_size} amostras</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full ${conf.bar} transition-all`}
                      style={{ width: `${conf.pct}%` }}
                    />
                  </div>
                </div>

                {/* Comparison */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Atual
                    </p>
                    <p className="text-base font-semibold">
                      {formatDuration(r.current_duration_minutes)}
                    </p>
                  </div>
                  <div
                    className="rounded-lg px-3 py-2"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(236,72,153,0.10))",
                    }}
                  >
                    <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-primary">
                      Sugestão {trendIcon}
                    </p>
                    <p className="text-base font-semibold text-primary">
                      {formatDuration(r.suggested_duration_minutes)}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Média {formatDuration(r.avg_usage_minutes)} · mediana{" "}
                  {formatDuration(r.median_usage_minutes)}
                </p>

                {canEdit && changed && r.confidence !== "low" ? (
                  <Button
                    size="sm"
                    onClick={() => void handleApply(r)}
                    disabled={applying === r.reservation_type_id}
                    className="partner-tap min-h-[44px] w-full"
                    style={{ background: "var(--partner-gradient)" }}
                  >
                    <Sparkles className="mr-2 h-3.5 w-3.5" />
                    {applying === r.reservation_type_id
                      ? "Aplicando…"
                      : `Aplicar ${formatDuration(r.suggested_duration_minutes)}`}
                  </Button>
                ) : !changed && r.sample_size >= 5 ? (
                  <p className="text-[11px] text-emerald-400">
                    ✓ Já alinhado com o uso real.
                  </p>
                ) : r.confidence === "low" ? (
                  <p className="text-[11px] text-muted-foreground">
                    Aguardando mais dados para recomendar com segurança.
                  </p>
                ) : null}
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default OccupancyInsightsPremium;
