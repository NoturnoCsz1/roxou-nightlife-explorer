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
  canCheckIn?: boolean;
}

export function VipEntryTable({
  entries,
  onCheckIn,
  onCancel,
  canCheckIn,
}: Props) {
  if (!entries.length) {
    return (
      <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
        Nenhum convidado adicionado ainda.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="px-3 py-2 text-left">Nome</th>
            <th className="px-3 py-2 text-left">Contato</th>
            <th className="px-3 py-2 text-left">Pessoas</th>
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
                <td className="px-3 py-2">
                  <Badge className={m.cls}>{m.label}</Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  {canCheckIn && e.status !== "checked_in" && e.status !== "cancelled" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onCheckIn?.(e)}
                    >
                      Check-in
                    </Button>
                  ) : null}
                  {canCheckIn && e.status !== "cancelled" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onCancel?.(e)}
                    >
                      Cancelar
                    </Button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
