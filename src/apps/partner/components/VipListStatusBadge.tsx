import { Badge } from "@/components/ui/badge";
import type { VipListStatus } from "@modules/partner/vip";

const MAP: Record<VipListStatus, { label: string; cls: string }> = {
  draft: { label: "Rascunho", cls: "bg-muted text-muted-foreground" },
  open: { label: "Aberta", cls: "bg-emerald-500/20 text-emerald-300" },
  closed: { label: "Fechada", cls: "bg-amber-500/20 text-amber-300" },
  archived: { label: "Arquivada", cls: "bg-zinc-500/20 text-zinc-300" },
};

export function VipListStatusBadge({ status }: { status: VipListStatus }) {
  const m = MAP[status] ?? MAP.draft;
  return <Badge className={m.cls}>{m.label}</Badge>;
}
