import type { PilotStatus } from "../partnerPilotService";

interface Props {
  status: PilotStatus | null;
}

export default function PartnerPilotMetrics({ status }: Props) {
  const items = [
    { label: "Eventos criados", value: status?.events_created ?? 0 },
    { label: "Reservas", value: status?.reservations_count ?? 0 },
    { label: "Listas VIP", value: status?.vip_lists_count ?? 0 },
    { label: "Feedbacks", value: status?.feedback_count ?? 0 },
  ];
  return (
    <div className="rounded-xl border border-border/40 bg-card p-4">
      <header className="text-sm font-semibold mb-3">Métricas de uso</header>
      <div className="grid grid-cols-2 gap-2">
        {items.map((m) => (
          <div key={m.label} className="rounded-md bg-muted/20 p-3">
            <div className="text-[10px] uppercase text-muted-foreground">{m.label}</div>
            <div className="text-xl font-semibold">{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
