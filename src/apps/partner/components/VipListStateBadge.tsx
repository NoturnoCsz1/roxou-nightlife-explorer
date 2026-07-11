/**
 * VipListStateBadge — Complemento Fase 10F
 *
 * Mostra o estado operacional derivado da lista (open, sold_out, closed, ended)
 * com rótulo curto em PT-BR: Aberto / Lotado / Fechado / Encerrado.
 */
import { Badge } from "@/components/ui/badge";
import type { VipListOperationalState } from "@modules/partner/vip";

const MAP: Record<VipListOperationalState, { label: string; cls: string }> = {
  open: { label: "Aberto", cls: "bg-emerald-500/20 text-emerald-300" },
  sold_out: { label: "Lotado", cls: "bg-orange-500/20 text-orange-300" },
  closed: { label: "Fechado", cls: "bg-amber-500/20 text-amber-300" },
  ended: { label: "Encerrado", cls: "bg-zinc-500/20 text-zinc-300" },
  archived: { label: "Arquivado", cls: "bg-fuchsia-500/20 text-fuchsia-300" },
};

export function VipListStateBadge({
  state,
}: {
  state: VipListOperationalState;
}) {
  const m = MAP[state] ?? MAP.closed;
  return <Badge className={m.cls}>{m.label}</Badge>;
}
