import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReservationStatsResult } from "../services/partnerReservations";

export function ReservationStats({ stats }: { stats: ReservationStatsResult }) {
  const items: { label: string; value: string }[] = [
    { label: "Hoje", value: String(stats.today) },
    { label: "Últimos 7 dias", value: String(stats.week) },
    { label: "Confirmação", value: `${stats.confirmedRate}%` },
    { label: "No-show", value: `${stats.noShowRate}%` },
    { label: "Capacidade de convidados hoje", value: `${stats.capacityUsed}%` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {items.map((m) => (
        <Card key={m.label} className="bg-card/60">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {m.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold">{m.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default ReservationStats;
