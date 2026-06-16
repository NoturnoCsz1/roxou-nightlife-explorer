import { Card } from "@/components/ui/card";
import type { VipListStatsResult } from "../services/partnerVipLists";

interface Props {
  stats: VipListStatsResult;
}

export function VipListStats({ stats }: Props) {
  const items: Array<[string, string | number]> = [
    ["Entradas", stats.total],
    ["Aprovados", stats.approved],
    ["Check-ins", stats.checkedIn],
    ["No-show", stats.noShow],
    ["Convidados", stats.peopleTotal],
    ["Capacidade de convidados", `${stats.capacityUsed}%`],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map(([label, value]) => (
        <Card key={label} className="p-3 text-center">
          <p className="text-xs uppercase text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-semibold">{value}</p>
        </Card>
      ))}
    </div>
  );
}
