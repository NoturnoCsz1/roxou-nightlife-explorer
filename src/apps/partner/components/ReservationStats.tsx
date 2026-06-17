import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReservationStatsResult } from "../services/partnerReservations";

export function ReservationStats({ stats }: { stats: ReservationStatsResult }) {
  const available = Math.max(
    stats.totalCapacity - stats.reservedSeats - stats.pendingSeats,
    0,
  );
  const items: { label: string; value: string; hint?: string }[] = [
    { label: "Hoje", value: String(stats.today), hint: "Reservas criadas hoje" },
    {
      label: "Últimos 7 dias",
      value: String(stats.week),
      hint: "Reservas criadas",
    },
    { label: "Confirmação", value: `${stats.confirmedRate}%` },
    { label: "No-show", value: `${stats.noShowRate}%` },
    {
      label: "Capacidade",
      value: `${stats.capacityUsed}%`,
      hint: `${stats.reservedSeats} reservadas · ${stats.pendingSeats} pendentes · ${available} disponíveis`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {items.map((m) => (
        <Card key={m.label} className="bg-card/60 min-w-0">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground truncate">
              {m.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold">{m.value}</div>
            {m.hint && (
              <p className="mt-1 text-[10px] leading-tight text-muted-foreground break-words">
                {m.hint}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default ReservationStats;
