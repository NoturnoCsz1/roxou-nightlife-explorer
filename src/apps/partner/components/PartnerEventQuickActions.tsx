import { Copy, Archive, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  canEdit?: boolean;
  canDuplicate?: boolean;
  canArchive?: boolean;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onArchive?: () => void;
  busy?: boolean;
}

export function PartnerEventQuickActions({
  canEdit,
  canDuplicate,
  canArchive,
  onEdit,
  onDuplicate,
  onArchive,
  busy,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {canEdit && (
        <Button size="sm" variant="secondary" onClick={onEdit} disabled={busy}>
          <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
        </Button>
      )}
      {canDuplicate && (
        <Button
          size="sm"
          variant="outline"
          onClick={onDuplicate}
          disabled={busy}
        >
          <Copy className="mr-1 h-3.5 w-3.5" /> Duplicar
        </Button>
      )}
      {canArchive && (
        <Button size="sm" variant="ghost" onClick={onArchive} disabled={busy}>
          <Archive className="mr-1 h-3.5 w-3.5" /> Arquivar
        </Button>
      )}
    </div>
  );
}
