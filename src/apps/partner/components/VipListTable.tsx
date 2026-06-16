import { VipListStatusBadge } from "./VipListStatusBadge";
import { VipListStateBadge } from "./VipListStateBadge";
import { Button } from "@/components/ui/button";
import {
  deriveVipListState,
  type PartnerVipList,
  type VipListOperationalState,
} from "../services/partnerVipLists";

interface Props {
  lists: PartnerVipList[];
  onOpen?: (list: PartnerVipList) => void;
  dim?: boolean;
  /** Layout compacto para listas fechadas/encerradas/arquivadas. */
  compact?: boolean;
}

const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleString("pt-BR") : "—";

const fmtCloses = (v: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

const cta = (op: VipListOperationalState) =>
  op === "open" || op === "sold_out" ? "Abrir" : "Histórico";

export function VipListTable({ lists, onOpen, dim, compact }: Props) {
  const renderState = (l: PartnerVipList) =>
    deriveVipListState(l, 0, l.starts_at);

  // ===== Compact card list (mobile + desktop) =====
  if (compact) {
    return (
      <div className={`w-full min-w-0 space-y-2 ${dim ? "opacity-70" : ""}`}>
        {lists.map((l) => {
          const op = renderState(l);
          return (
            <div
              key={l.id}
              className="min-w-0 flex items-center gap-3 rounded-md border bg-card/50 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="truncate text-sm font-medium">{l.title}</p>
                  <VipListStateBadge state={op} />
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {fmtDate(l.starts_at)}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0"
                onClick={() => onOpen?.(l)}
              >
                {cta(op)}
              </Button>
            </div>
          );
        })}
      </div>
    );
  }

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
                <p>Capacidade de convidados: {l.max_entries ?? "—"}</p>
                {l.closes_at ? (
                  <p>Fechamento: {fmtCloses(l.closes_at)}</p>
                ) : null}
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={() => onOpen?.(l)}
                variant={op === "open" || op === "sold_out" ? "default" : "secondary"}
              >
                {cta(op)}
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
              <th className="px-3 py-2 text-left">Capacidade de convidados</th>
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
                      variant={op === "open" || op === "sold_out" ? "default" : "secondary"}
                      onClick={() => onOpen?.(l)}
                    >
                      {cta(op)}
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
