import { VipListStatusBadge } from "./VipListStatusBadge";
import { VipListStateBadge } from "./VipListStateBadge";
import { Button } from "@/components/ui/button";
import {
  deriveVipListState,
  type PartnerVipList,
} from "../services/partnerVipLists";

interface Props {
  lists: PartnerVipList[];
  onOpen?: (list: PartnerVipList) => void;
  dim?: boolean;
}

const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleString("pt-BR") : "—";

const fmtCloses = (v: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

export function VipListTable({ lists, onOpen, dim }: Props) {
  const renderState = (l: PartnerVipList) =>
    deriveVipListState(l, 0, l.starts_at);

  return (
    <div className={`w-full min-w-0 ${dim ? "opacity-70" : ""}`}>
      {/* Mobile cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {lists.map((l) => {
          const op = renderState(l);
          return (
            <div
              key={l.id}
              className="min-w-0 break-words rounded-lg border bg-card p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-base flex-1 min-w-0 break-words">
                  {l.title}
                </p>
                <div className="flex flex-col items-end gap-1">
                  <VipListStateBadge state={op} />
                  <VipListStatusBadge status={l.status} />
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Início: {fmtDate(l.starts_at)}</p>
                <p>Capacidade: {l.max_entries ?? "—"}</p>
                {l.closes_at ? (
                  <p>Fechamento: {fmtCloses(l.closes_at)}</p>
                ) : null}
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={() => onOpen?.(l)}
                variant={op === "ended" ? "secondary" : "default"}
              >
                {op === "ended" ? "Ver histórico" : "Abrir"}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left">Título</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-left">Início</th>
              <th className="px-3 py-2 text-left">Fechamento</th>
              <th className="px-3 py-2 text-left">Capacidade</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lists.map((l) => {
              const op = renderState(l);
              return (
                <tr key={l.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{l.title}</td>
                  <td className="px-3 py-2">
                    <VipListStateBadge state={op} />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {fmtDate(l.starts_at)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {fmtCloses(l.closes_at) ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {l.max_entries ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      size="sm"
                      variant={op === "ended" ? "secondary" : "default"}
                      onClick={() => onOpen?.(l)}
                    >
                      {op === "ended" ? "Histórico" : "Abrir"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
