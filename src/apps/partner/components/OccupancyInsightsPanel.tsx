/**
 * OccupancyInsightsPanel — IA de Ocupação Roxou
 *
 * Aprende automaticamente o tempo médio de uso por tipo (mesa/bistrô/camarote)
 * via released_at - checked_in_at (ou reservation_date como fallback).
 *
 * Nunca altera automaticamente: o gestor decide aplicar a sugestão.
 * Afeta apenas novas reservas — reservas antigas mantêm `duration_minutes` snapshot.
 */
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Brain } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  getReservationOccupancyInsights,
  updateReservationTypeDuration,
  type OccupancyInsight,
} from "@modules/partner/reservations";

const KIND_LABEL: Record<OccupancyInsight["type_kind"], string> = {
  table: "Mesa",
  bistro: "Bistrô",
  box: "Camarote",
};

const CONFIDENCE_META: Record<
  OccupancyInsight["confidence"],
  { label: string; cls: string }
> = {
  low: { label: "Baixa", cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
  medium: { label: "Média", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  high: { label: "Alta", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
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

export function OccupancyInsightsPanel({ partnerId, canEdit }: Props) {
  const [rows, setRows] = useState<OccupancyInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const data = await getReservationOccupancyInsights(partnerId, 30);
      setRows(data);
    } catch (err) {
      toast({
        title: "Erro ao carregar IA de ocupação",
        description: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-4 w-4 text-primary" />
          IA de Ocupação
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Sugestões baseadas no tempo real de uso (últimos 30 dias). Aplicar
          afeta apenas novas reservas — as antigas mantêm o snapshot.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Analisando histórico…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem dados suficientes ainda. Conforme as reservas forem concluídas e
            liberadas, a IA passa a sugerir durações automaticamente.
          </p>
        ) : (
          rows.map((r) => {
            const conf = CONFIDENCE_META[r.confidence];
            const changed = r.suggested_duration_minutes !== r.current_duration_minutes;
            return (
              <div
                key={r.reservation_type_id}
                className="rounded-md border border-border/60 bg-card/40 p-3 text-xs space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {KIND_LABEL[r.type_kind]} · {r.type_name}
                  </p>
                  <Badge variant="outline" className={conf.cls}>
                    Confiança: {conf.label} ({r.sample_size})
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Média
                    </p>
                    <p className="font-semibold">{formatDuration(r.avg_usage_minutes)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Mediana
                    </p>
                    <p className="font-semibold">{formatDuration(r.median_usage_minutes)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Atual
                    </p>
                    <p className="font-semibold">{formatDuration(r.current_duration_minutes)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-primary">
                      Sugestão
                    </p>
                    <p className="font-semibold text-primary">
                      {formatDuration(r.suggested_duration_minutes)}
                    </p>
                  </div>
                </div>
                {canEdit && changed && r.confidence !== "low" ? (
                  <Button
                    size="sm"
                    onClick={() => void handleApply(r)}
                    disabled={applying === r.reservation_type_id}
                    className="min-h-[44px] w-full sm:w-auto"
                  >
                    <Sparkles className="mr-2 h-3.5 w-3.5" />
                    {applying === r.reservation_type_id
                      ? "Aplicando…"
                      : `Aplicar ${formatDuration(r.suggested_duration_minutes)}`}
                  </Button>
                ) : !changed && r.sample_size >= 5 ? (
                  <p className="text-[11px] text-emerald-500">
                    ✓ Duração atual já está alinhada com o uso real.
                  </p>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export default OccupancyInsightsPanel;
