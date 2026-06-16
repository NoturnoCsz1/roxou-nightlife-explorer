import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  PartnerVipEntry,
  VipEntryStatus,
} from "../services/partnerVipLists";

const STATUS_MAP: Record<VipEntryStatus, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-amber-500/20 text-amber-300" },
  approved: { label: "Aprovado", cls: "bg-blue-500/20 text-blue-300" },
  checked_in: {
    label: "Check-in",
    cls: "bg-emerald-500/20 text-emerald-300",
  },
  cancelled: { label: "Cancelado", cls: "bg-zinc-500/20 text-zinc-300" },
  no_show: { label: "No-show", cls: "bg-red-500/20 text-red-300" },
};

interface Props {
  entries: PartnerVipEntry[];
  onCheckIn?: (entry: PartnerVipEntry) => void;
  onCancel?: (entry: PartnerVipEntry) => void;
  onNoShow?: (entry: PartnerVipEntry) => void;
  canCheckIn?: boolean;
}

export function VipEntryTable({
  entries,
  onCheckIn,
  onCancel,
  onNoShow,
  canCheckIn,
}: Props) {
  if (!entries.length) {
    return (
      <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
        Nenhum convidado adicionado ainda.
      </p>
    );
  }

  const renderActions = (e: PartnerVipEntry) => {
    if (!canCheckIn) return null;
    const active = e.status !== "checked_in" && e.status !== "cancelled";
    return (
      <div className="flex flex-wrap justify-end gap-2">
        {active ? (
          <Button size="sm" onClick={() => onCheckIn?.(e)}>
            Confirmar entrada
          </Button>
        ) : null}
        {active && onNoShow ? (
          <Button size="sm" variant="outline" onClick={() => onNoShow(e)}>
            No-show
          </Button>
        ) : null}
        {e.status !== "cancelled" ? (
          <Button size="sm" variant="ghost" onClick={() => onCancel?.(e)}>
            Cancelar
          </Button>
        ) : null}
      </div>
    );
  };

  return (
    <div className="w-full min-w-0">
      {/* Mobile cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {entries.map((e) => {
          const m = STATUS_MAP[e.status] ?? STATUS_MAP.pending;
          return (
            <div
              key={e.id}
              className="min-w-0 break-words rounded-lg border bg-card p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold min-w-0 break-words flex-1">
                  {e.name}
                </p>
                <Badge className={m.cls}>{m.label}</Badge>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>{e.phone ?? e.email ?? "—"}</p>
                <p>
                  {e.people_count} pessoa{e.people_count > 1 ? "s" : ""}
                  {e.promoter_name_snapshot
                    ? ` · Promoter: ${e.promoter_name_snapshot}`
                    : ""}
                </p>
              </div>
              {renderActions(e)}
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left">Nome</th>
              <th className="px-3 py-2 text-left">Contato</th>
              <th className="px-3 py-2 text-left">Pessoas</th>
              <th className="px-3 py-2 text-left">Promoter</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const m = STATUS_MAP[e.status] ?? STATUS_MAP.pending;
              return (
                <tr key={e.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{e.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {e.phone ?? e.email ?? "—"}
                  </td>
                  <td className="px-3 py-2">{e.people_count}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {e.promoter_name_snapshot ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Badge className={m.cls}>{m.label}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right">{renderActions(e)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
