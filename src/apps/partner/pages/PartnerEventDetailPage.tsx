/**
 * PartnerEventDetailPage — Fase 9G
 *
 * Visualização detalhada (somente leitura) de um evento do parceiro.
 * Ações de editar/duplicar/arquivar reaproveitam o serviço partnerEvents.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import {
  PartnerEventQuickActions,
  PartnerEventStatusBadge,
} from "../components";
import {
  archivePartnerEvent,
  duplicatePartnerEvent,
  getMyEvent,
  type PartnerEventRow,
} from "../services/partnerEvents";

interface Props {
  eventId: string;
  onEdit?: (e: PartnerEventRow) => void;
  onClose?: () => void;
}

const PartnerEventDetailPage = ({ eventId, onEdit, onClose }: Props) => {
  const { selectedPartner, role } = usePartnerAuth();
  const partnerId = selectedPartner?.id ?? null;
  const canEdit = role === "owner" || role === "admin" || role === "editor";
  const canManage = role === "owner" || role === "admin";

  const [event, setEvent] = useState<PartnerEventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!partnerId) return;
    getMyEvent(eventId, partnerId)
      .then((row) => !cancelled && setEvent(row))
      .catch((err) => toast.error(err.message ?? "Erro ao carregar"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [eventId, partnerId]);

  if (!partnerId) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6 text-zinc-300">
        Selecione um estabelecimento.
      </main>
    );
  }
  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6 text-zinc-400">
        Carregando…
      </main>
    );
  }
  if (!event) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6 text-zinc-300">
        Evento não encontrado.
      </main>
    );
  }

  const dateLabel = new Date(event.date_time).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "full",
    timeStyle: "short",
  });

  return (
    <main className="min-h-screen bg-zinc-950 p-4 text-white sm:p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <p className="text-sm text-zinc-400">{dateLabel}</p>
            {event.venue_name && (
              <p className="text-sm text-zinc-500">{event.venue_name}</p>
            )}
          </div>
          <PartnerEventStatusBadge status={event.status} />
        </header>

        {event.image_url && (
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full rounded-2xl border border-white/10 object-cover"
          />
        )}

        {event.short_summary && (
          <p className="text-base text-zinc-200">{event.short_summary}</p>
        )}
        {event.description && (
          <article className="whitespace-pre-line text-sm text-zinc-300">
            {event.description}
          </article>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
          <span>Categoria: {event.category}</span>
          {event.sub_category && <span>· {event.sub_category}</span>}
          {event.ticket_url && (
            <a
              className="text-fuchsia-300 underline"
              href={event.ticket_url}
              target="_blank"
              rel="noreferrer"
            >
              Ingressos
            </a>
          )}
        </div>

        <PartnerEventQuickActions
          canEdit={canEdit}
          canDuplicate={canManage}
          canArchive={canManage && event.status !== "archived"}
          onEdit={() => onEdit?.(event)}
          onDuplicate={async () => {
            setBusy(true);
            try {
              await duplicatePartnerEvent(event.id);
              toast.success("Evento duplicado.");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Falha.");
            } finally {
              setBusy(false);
            }
          }}
          onArchive={async () => {
            if (!confirm("Arquivar este evento?")) return;
            setBusy(true);
            try {
              await archivePartnerEvent(event.id);
              toast.success("Arquivado.");
              onClose?.();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Falha.");
            } finally {
              setBusy(false);
            }
          }}
          busy={busy}
        />
      </div>
    </main>
  );
};

export default PartnerEventDetailPage;
