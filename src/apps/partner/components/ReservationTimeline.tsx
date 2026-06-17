/**
 * ReservationTimeline — visão cronológica das reservas do dia.
 *
 * Agrupa por HH:mm, ordena ascendente, exibe StatusDot + cliente + tipo.
 * Clique no item dispara onSelect (abre modal/visualização externa).
 */
import { useMemo } from "react";
import { Users } from "lucide-react";
import { GlassCard, SectionHeader, StatusDot, type StatusKind } from "./ui";
import type {
  PartnerReservationRow,
  PartnerReservationType,
} from "../services/partnerReservations";
import { isTodaySP } from "@/lib/dateUtils";

const fmtHM = (d: Date) =>
  d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

const statusToKind = (s: PartnerReservationRow["status"]): StatusKind => {
  switch (s) {
    case "confirmed":
      return "confirmed";
    case "completed":
      return "completed";
    case "pending":
    case "pending_payment":
      return "pending";
    case "cancelled":
      return "cancelled";
    case "expired":
      return "expired";
    case "no_show":
      return "no_show";
    default:
      return "neutral";
  }
};

interface Props {
  reservations: PartnerReservationRow[];
  types: PartnerReservationType[];
  onSelect?: (r: PartnerReservationRow) => void;
}

export function ReservationTimeline({ reservations, types, onSelect }: Props) {
  const typeName = useMemo(() => {
    const map = new Map<string, string>();
    types.forEach((t) => map.set(t.id, t.name));
    return map;
  }, [types]);

  const grouped = useMemo(() => {
    const today = reservations
      .filter((r) => {
        const d = new Date(r.reservation_date);
        return !Number.isNaN(d.getTime()) && isTodaySP(d);
      })
      .sort(
        (a, b) =>
          new Date(a.reservation_date).getTime() -
          new Date(b.reservation_date).getTime(),
      );

    const map = new Map<string, PartnerReservationRow[]>();
    for (const r of today) {
      const key = fmtHM(new Date(r.reservation_date));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries());
  }, [reservations]);

  return (
    <GlassCard padding="md" className="min-w-0">
      <SectionHeader
        title="Timeline do dia"
        description="Toque em uma reserva para ver os detalhes e ações rápidas."
      />
      {grouped.length === 0 ? (
        <p className="text-sm text-foreground/55 py-6">
          Nenhuma reserva agendada para hoje.
        </p>
      ) : (
        <div className="relative mt-3 pl-4">
          {/* linha vertical */}
          <div
            aria-hidden
            className="absolute left-[7px] top-1 bottom-1 w-px bg-gradient-to-b from-white/15 via-white/5 to-transparent"
          />
          <ul className="space-y-3">
            {grouped.map(([slot, items]) => (
              <li key={slot} className="relative">
                <div className="flex items-baseline gap-2 mb-1.5">
                  <span className="absolute -left-[1px] top-1.5 h-2 w-2 rounded-full bg-white/60 ring-2 ring-background" />
                  <span className="text-sm font-semibold tabular-nums">
                    {slot}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-foreground/45">
                    {items.length} reserva{items.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-1.5 ml-2">
                  {items.map((r) => {
                    const kind = statusToKind(r.status);
                    const tName = r.reservation_type_id
                      ? typeName.get(r.reservation_type_id)
                      : null;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onSelect?.(r)}
                        className="w-full text-left min-w-0 flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition px-3 py-2"
                      >
                        <StatusDot kind={kind} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            {r.name}
                          </div>
                          <div className="text-[11px] text-foreground/55 truncate">
                            {tName ?? "Sem tipo"}
                          </div>
                        </div>
                        <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-foreground/60 tabular-nums">
                          <Users className="h-3 w-3" />
                          {r.people_count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </GlassCard>
  );
}

export default ReservationTimeline;
