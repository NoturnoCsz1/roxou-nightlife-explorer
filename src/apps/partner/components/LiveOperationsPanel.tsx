/**
 * LiveOperationsPanel — central operacional em tempo real.
 *
 * 4 estados clicáveis (filtram a Timeline/Recentes via callback opcional).
 * Sem queries: usa rows + waitlist já carregados.
 */
import { useMemo } from "react";
import { CheckCircle2, Clock, Hourglass, UserCheck } from "lucide-react";
import { GlassCard, SectionHeader } from "./ui";
import { isTodaySP } from "@/lib/dateUtils";
import type {
  PartnerReservationRow,
  ReservationWaitlistEntry,
} from "@modules/partner/reservations";

type Bucket = "present" | "incoming" | "waitlist" | "released";

interface Props {
  rows: PartnerReservationRow[];
  waitlist: ReservationWaitlistEntry[];
  onSelectBucket?: (bucket: Bucket) => void;
}

export function LiveOperationsPanel({ rows, waitlist, onSelectBucket }: Props) {
  const data = useMemo(() => {
    const now = Date.now();
    const today = rows.filter((r) => {
      const d = new Date(r.reservation_date);
      return !Number.isNaN(d.getTime()) && isTodaySP(d);
    });
    const present = today.filter(
      (r) => r.checked_in_at && !r.released_at && r.status !== "completed",
    ).length;
    const incoming = today.filter(
      (r) =>
        (r.status === "confirmed" ||
          r.status === "pending" ||
          r.status === "pending_payment") &&
        new Date(r.reservation_date).getTime() >= now,
    ).length;
    const queue = waitlist.filter(
      (w) => w.status === "waiting" || w.status === "notified",
    ).length;
    const released = today.filter((r) => !!r.released_at).length;
    return { present, incoming, queue, released };
  }, [rows, waitlist]);

  const cards: Array<{
    key: Bucket;
    label: string;
    value: number;
    icon: React.ReactNode;
    dotClass: string;
    tint: string;
  }> = [
    {
      key: "present",
      label: "Clientes presentes",
      value: data.present,
      icon: <UserCheck className="h-4 w-4" />,
      dotClass: "bg-emerald-400",
      tint: "text-emerald-300",
    },
    {
      key: "incoming",
      label: "Próximas chegadas",
      value: data.incoming,
      icon: <Clock className="h-4 w-4" />,
      dotClass: "bg-amber-400",
      tint: "text-amber-300",
    },
    {
      key: "waitlist",
      label: "Fila aguardando",
      value: data.queue,
      icon: <Hourglass className="h-4 w-4" />,
      dotClass: "bg-violet-400",
      tint: "text-violet-300",
    },
    {
      key: "released",
      label: "Mesas liberadas",
      value: data.released,
      icon: <CheckCircle2 className="h-4 w-4" />,
      dotClass: "bg-sky-400",
      tint: "text-sky-300",
    },
  ];

  return (
    <GlassCard padding="md" className="min-w-0 partner-fade-in">
      <SectionHeader
        title="Operação em tempo real"
        description="O que está acontecendo agora na casa"
      />
      <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 min-w-0 partner-fade-in-stagger">
        {cards.map((c) => {
          const interactive = !!onSelectBucket;
          const Comp = (interactive ? "button" : "div") as
            | "button"
            | "div";
          return (
            <Comp
              key={c.key}
              type={interactive ? "button" : undefined}
              onClick={
                interactive ? () => onSelectBucket?.(c.key) : undefined
              }
              className={`group relative min-w-0 text-left rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-3 partner-tap ${
                interactive ? "partner-hover-lift cursor-pointer" : ""
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`h-2 w-2 rounded-full ${c.dotClass} animate-pulse`} />
                <span className="text-[10px] uppercase tracking-wider text-foreground/55 truncate">
                  {c.label}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <div className={`text-2xl font-bold tabular-nums ${c.tint}`}>
                  {c.value}
                </div>
                <span className={`shrink-0 p-1.5 rounded-lg bg-white/[0.04] ${c.tint}`}>
                  {c.icon}
                </span>
              </div>
            </Comp>
          );
        })}
      </div>
    </GlassCard>
  );
}

export default LiveOperationsPanel;
