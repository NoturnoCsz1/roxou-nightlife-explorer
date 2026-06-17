/**
 * WeeklyHeatmap — barras visuais por dia da semana + por horário.
 *
 * Consome `rows` já carregados; sem novas queries. Usa últimos 30 dias.
 */
import { useMemo } from "react";
import { GlassCard, SectionHeader } from "./ui";
import type { PartnerReservationRow } from "../services/partnerReservations";

interface Props {
  rows: PartnerReservationRow[];
}

const WD = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"]; // index 1..0

export function WeeklyHeatmap({ rows }: Props) {
  const data = useMemo(() => {
    const now = Date.now();
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;
    const week = new Array(7).fill(0); // [SEG..DOM]
    const hours = new Map<number, number>();

    for (const r of rows) {
      const t = new Date(r.reservation_date).getTime();
      if (Number.isNaN(t) || t < cutoff || t > now) continue;
      if (r.status === "cancelled" || r.status === "expired") continue;
      const d = new Date(r.reservation_date);
      // weekday SP-safe: usa horário local (suficiente p/ heatmap aproximado)
      const wd = d.getDay(); // 0=Dom..6=Sáb
      const idx = wd === 0 ? 6 : wd - 1;
      week[idx] += 1;
      const h = d.getHours();
      if (h >= 12 && h <= 23) hours.set(h, (hours.get(h) ?? 0) + 1);
    }

    const maxWeek = Math.max(1, ...week);
    const hourArr: Array<{ h: number; v: number }> = [];
    for (let h = 18; h <= 23; h++) {
      hourArr.push({ h, v: hours.get(h) ?? 0 });
    }
    const maxHour = Math.max(1, ...hourArr.map((x) => x.v));

    const isEmpty = week.every((v) => v === 0);
    return { week, maxWeek, hourArr, maxHour, isEmpty };
  }, [rows]);

  return (
    <GlassCard padding="md" className="min-w-0 partner-fade-in">
      <SectionHeader
        title="Heatmap"
        description="Quando o bar mais enche (últimos 30 dias)"
      />
      {data.isEmpty ? (
        <p className="mt-3 text-sm text-foreground/55">
          Coletando dados — em breve aparecerá aqui o padrão semanal.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-5 min-w-0">
          <div className="min-w-0">
            <h4 className="text-[10px] uppercase tracking-wider text-foreground/55 mb-2">
              Por dia da semana
            </h4>
            <ul className="space-y-1.5">
              {data.week.map((v, i) => (
                <li key={i} className="flex items-center gap-2 min-w-0">
                  <span className="w-9 shrink-0 text-[11px] font-semibold text-foreground/70">
                    {WD[i]}
                  </span>
                  <div className="relative flex-1 h-3 rounded-full bg-white/5 overflow-hidden min-w-0">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${Math.max(4, (v / data.maxWeek) * 100)}%`,
                        background: "var(--partner-gradient)",
                      }}
                    />
                  </div>
                  <span className="w-7 shrink-0 text-right text-[11px] tabular-nums text-foreground/70">
                    {v}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            <h4 className="text-[10px] uppercase tracking-wider text-foreground/55 mb-2">
              Por horário (18h–23h)
            </h4>
            <ul className="space-y-1.5">
              {data.hourArr.map(({ h, v }) => (
                <li key={h} className="flex items-center gap-2 min-w-0">
                  <span className="w-9 shrink-0 text-[11px] font-semibold text-foreground/70 tabular-nums">
                    {String(h).padStart(2, "0")}h
                  </span>
                  <div className="relative flex-1 h-3 rounded-full bg-white/5 overflow-hidden min-w-0">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${Math.max(4, (v / data.maxHour) * 100)}%`,
                        background: "var(--partner-gradient)",
                      }}
                    />
                  </div>
                  <span className="w-7 shrink-0 text-right text-[11px] tabular-nums text-foreground/70">
                    {v}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

export default WeeklyHeatmap;
