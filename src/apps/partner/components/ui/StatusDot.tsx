/**
 * StatusDot — bolinha colorida para status de reservas/lista.
 */
import { cn } from "@/lib/utils";

export type StatusKind =
  | "confirmed"
  | "pending"
  | "waitlist"
  | "cancelled"
  | "expired"
  | "completed"
  | "no_show"
  | "neutral";

const map: Record<StatusKind, string> = {
  confirmed: "text-emerald-400",
  pending: "text-amber-400",
  waitlist: "text-fuchsia-400",
  cancelled: "text-rose-400",
  expired: "text-zinc-500",
  completed: "text-sky-400",
  no_show: "text-rose-500",
  neutral: "text-zinc-400",
};

export function StatusDot({
  kind = "neutral",
  className,
}: {
  kind?: StatusKind;
  className?: string;
}) {
  return (
    <span
      className={cn("partner-status-dot", map[kind], className)}
      aria-hidden
    />
  );
}

export default StatusDot;
