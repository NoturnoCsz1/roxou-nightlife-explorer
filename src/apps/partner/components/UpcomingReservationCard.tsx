/**
 * UpcomingReservationCard — próxima reserva do dia em destaque mobile.
 *
 * Apenas UI; recebe lista já filtrada/ordenada.
 */
import { useMemo } from "react";
import { Clock, FileText, MessageCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard, SectionHeader } from "./ui";
import { isTodaySP } from "@/lib/dateUtils";
import type {
  PartnerReservationRow,
  PartnerReservationType,
} from "@modules/partner/reservations";

interface Props {
  reservations: PartnerReservationRow[];
  types: PartnerReservationType[];
}

const fmtHM = (d: Date) =>
  d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

export function UpcomingReservationCard({ reservations, types }: Props) {
  const next = useMemo(() => {
    const now = Date.now();
    return (
      reservations
        .filter((r) => {
          const d = new Date(r.reservation_date);
          if (Number.isNaN(d.getTime())) return false;
          if (!isTodaySP(d)) return false;
          if (
            r.status === "cancelled" ||
            r.status === "expired" ||
            r.status === "no_show" ||
            r.status === "completed"
          )
            return false;
          return d.getTime() >= now;
        })
        .sort(
          (a, b) =>
            new Date(a.reservation_date).getTime() -
            new Date(b.reservation_date).getTime(),
        )[0] ?? null
    );
  }, [reservations]);

  const typeName = useMemo(() => {
    if (!next?.reservation_type_id) return null;
    return types.find((t) => t.id === next.reservation_type_id)?.name ?? null;
  }, [next, types]);

  return (
    <GlassCard padding="md" className="min-w-0">
      <SectionHeader
        title="Próxima reserva"
        description="Quem chega agora"
      />
      {!next ? (
        <p className="mt-2 text-sm text-foreground/55">
          Nenhuma reserva programada.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2">
              <Clock className="h-4 w-4 text-violet-300" />
              <span className="text-lg font-bold tabular-nums">
                {fmtHM(new Date(next.reservation_date))}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{next.name}</div>
              <div className="text-[11px] text-foreground/60 truncate flex items-center gap-1">
                <Users className="h-3 w-3" />
                {typeName ?? "Sem tipo"} · {next.people_count} lugar
                {next.people_count > 1 ? "es" : ""}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {next.phone && (
              <Button
                size="sm"
                variant="outline"
                className="min-h-[44px] flex-1"
                onClick={() => {
                  const phone = (next.phone ?? "").replace(/[^0-9]/g, "");
                  if (!phone) return;
                  window.open(
                    `https://wa.me/55${phone}`,
                    "_blank",
                    "noopener,noreferrer",
                  );
                }}
              >
                <MessageCircle className="mr-1 h-3.5 w-3.5" /> WhatsApp
              </Button>
            )}
            {next.public_token && (
              <Button
                size="sm"
                variant="outline"
                className="min-h-[44px] flex-1"
                onClick={() =>
                  window.open(
                    `/reserva/sucesso/${next.public_token}`,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
              >
                <FileText className="mr-1 h-3.5 w-3.5" /> Comprovante
              </Button>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

export default UpcomingReservationCard;
