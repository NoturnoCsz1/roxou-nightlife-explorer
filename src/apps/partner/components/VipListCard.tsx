import { Card } from "@/components/ui/card";
import { VipListStatusBadge } from "./VipListStatusBadge";
import { formatDateTimeSP } from "@/lib/dateUtils";
import type { PartnerVipList } from "@modules/partner/vip";

interface Props {
  list: PartnerVipList;
  onOpen?: (list: PartnerVipList) => void;
}

export function VipListCard({ list, onOpen }: Props) {
  return (
    <Card
      className="cursor-pointer p-4 transition hover:border-primary/60"
      onClick={() => onOpen?.(list)}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{list.title}</h3>
          {list.description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {list.description}
            </p>
          ) : null}
        </div>
        <VipListStatusBadge status={list.status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {list.starts_at ? (
          <span>Início: {formatDateTimeSP(list.starts_at)}</span>
        ) : null}
        {list.max_entries ? <span>Capacidade de convidados: {list.max_entries}</span> : null}
      </div>
    </Card>
  );
}
