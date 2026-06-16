import { CalendarOff } from "lucide-react";

export function ReservationEmptyState({
  message = "Nenhuma reserva encontrada.",
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-card/40 p-10 text-center">
      <CalendarOff className="h-10 w-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default ReservationEmptyState;
