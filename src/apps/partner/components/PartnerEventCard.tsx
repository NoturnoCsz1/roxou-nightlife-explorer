import { PartnerEventStatusBadge } from "./PartnerEventStatusBadge";
import { PartnerEventQuickActions } from "./PartnerEventQuickActions";
import type { PartnerEventRow } from "../services/partnerEvents";

interface Props {
  event: PartnerEventRow;
  canEdit?: boolean;
  canDuplicate?: boolean;
  canArchive?: boolean;
  onEdit?: (e: PartnerEventRow) => void;
  onDuplicate?: (e: PartnerEventRow) => void;
  onArchive?: (e: PartnerEventRow) => void;
  busy?: boolean;
}

export function PartnerEventCard({
  event,
  canEdit,
  canDuplicate,
  canArchive,
  onEdit,
  onDuplicate,
  onArchive,
  busy,
}: Props) {
  const date = new Date(event.date_time);
  const dateLabel = date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <article className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-fuchsia-500/30 w-full max-w-full min-w-0 overflow-hidden break-words">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 break-words">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <h3 className="line-clamp-2 text-sm font-semibold text-white">
            {event.title}
          </h3>
          <PartnerEventStatusBadge status={event.status} />
        </div>
        <p className="mt-0.5 text-xs text-zinc-400">{dateLabel}</p>
        {event.venue_name && (
          <p className="text-xs text-zinc-500">{event.venue_name}</p>
        )}
        <div className="mt-2">
          <PartnerEventQuickActions
            canEdit={canEdit}
            canDuplicate={canDuplicate}
            canArchive={canArchive && event.status !== "archived"}
            onEdit={onEdit ? () => onEdit(event) : undefined}
            onDuplicate={onDuplicate ? () => onDuplicate(event) : undefined}
            onArchive={onArchive ? () => onArchive(event) : undefined}
            busy={busy}
          />
        </div>
      </div>
    </article>
  );
}
