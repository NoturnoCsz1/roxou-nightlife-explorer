/**
 * PartnerOperationalStateBadge — FIX 10F
 *
 * Estado unificado para Lista VIP, Reservas e Eventos:
 *   open      → Aberto
 *   sold_out  → Lotado
 *   closed    → Fechado
 *   ended     → Encerrado
 *   archived  → Arquivado
 */
import { Badge } from "@/components/ui/badge";

export type PartnerOperationalState =
  | "open"
  | "sold_out"
  | "closed"
  | "ended"
  | "archived";

const MAP: Record<PartnerOperationalState, { label: string; cls: string }> = {
  open: { label: "Aberto", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  sold_out: { label: "Lotado", cls: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  closed: { label: "Fechado", cls: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  ended: { label: "Encerrado", cls: "bg-zinc-700/40 text-zinc-300 border-zinc-600/40" },
  archived: { label: "Arquivado", cls: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30" },
};

export function PartnerOperationalStateBadge({
  state,
}: {
  state: PartnerOperationalState;
}) {
  const m = MAP[state] ?? MAP.closed;
  return (
    <Badge variant="outline" className={`text-xs ${m.cls}`}>
      {m.label}
    </Badge>
  );
}

export default PartnerOperationalStateBadge;
