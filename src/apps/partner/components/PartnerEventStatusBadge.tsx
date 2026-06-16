import { Badge } from "@/components/ui/badge";

const MAP: Record<string, { label: string; cls: string }> = {
  draft: { label: "Rascunho", cls: "bg-zinc-700/40 text-zinc-200 border-zinc-600/40" },
  pending: { label: "Em revisão", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  published: { label: "Publicado", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  archived: { label: "Arquivado", cls: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30" },
  rejected: { label: "Recusado", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  ended: { label: "Encerrado", cls: "bg-zinc-800/60 text-zinc-400 border-zinc-700/40" },
};

export function PartnerEventStatusBadge({ status }: { status: string }) {
  const cfg = MAP[status] ?? { label: status, cls: "bg-zinc-700/40 text-zinc-200" };
  return (
    <Badge variant="outline" className={`text-xs ${cfg.cls}`}>
      {cfg.label}
    </Badge>
  );
}
