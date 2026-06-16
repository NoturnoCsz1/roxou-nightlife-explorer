import { VipListStatusBadge } from "./VipListStatusBadge";
import { Button } from "@/components/ui/button";
import type { PartnerVipList } from "../services/partnerVipLists";

interface Props {
  lists: PartnerVipList[];
  onOpen?: (list: PartnerVipList) => void;
}

const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleString("pt-BR") : "—";

export function VipListTable({ lists, onOpen }: Props) {
  return (
    <div className="w-full min-w-0">
      {/* Mobile cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {lists.map((l) => (
          <div
            key={l.id}
            className="min-w-0 break-words rounded-lg border bg-card p-4 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-base flex-1 min-w-0 break-words">
                {l.title}
              </p>
              <VipListStatusBadge status={l.status} />
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Início: {fmtDate(l.starts_at)}</p>
              <p>Capacidade: {l.max_entries ?? "—"}</p>
            </div>
            <Button size="sm" className="w-full" onClick={() => onOpen?.(l)}>
              Abrir
            </Button>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left">Título</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Início</th>
              <th className="px-3 py-2 text-left">Capacidade</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lists.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-3 py-2 font-medium">{l.title}</td>
                <td className="px-3 py-2">
                  <VipListStatusBadge status={l.status} />
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {fmtDate(l.starts_at)}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {l.max_entries ?? "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" onClick={() => onOpen?.(l)}>
                    Abrir
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
