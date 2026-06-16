import { VipListStatusBadge } from "./VipListStatusBadge";
import { Button } from "@/components/ui/button";
import type { PartnerVipList } from "../services/partnerVipLists";

interface Props {
  lists: PartnerVipList[];
  onOpen?: (list: PartnerVipList) => void;
}

export function VipListTable({ lists, onOpen }: Props) {
  return (
    <div className="overflow-x-auto rounded-md border">
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
                {l.starts_at
                  ? new Date(l.starts_at).toLocaleString("pt-BR")
                  : "—"}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {l.max_entries ?? "—"}
              </td>
              <td className="px-3 py-2 text-right">
                <Button size="sm" variant="ghost" onClick={() => onOpen?.(l)}>
                  Abrir
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
