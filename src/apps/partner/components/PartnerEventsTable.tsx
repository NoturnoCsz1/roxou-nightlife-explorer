import { PartnerEventCard } from "./PartnerEventCard";
import type { PartnerEventRow } from "../services/partnerEvents";

interface Props {
  events: PartnerEventRow[];
  canEdit?: boolean;
  canDuplicate?: boolean;
  canArchive?: boolean;
  onEdit?: (e: PartnerEventRow) => void;
  onDuplicate?: (e: PartnerEventRow) => void;
  onArchive?: (e: PartnerEventRow) => void;
  busy?: boolean;
}

export function PartnerEventsTable(props: Props) {
  return (
    <div className="grid gap-2">
      {props.events.map((ev) => (
        <PartnerEventCard
          key={ev.id}
          event={ev}
          canEdit={props.canEdit}
          canDuplicate={props.canDuplicate}
          canArchive={props.canArchive}
          onEdit={props.onEdit}
          onDuplicate={props.onDuplicate}
          onArchive={props.onArchive}
          busy={props.busy}
        />
      ))}
    </div>
  );
}
