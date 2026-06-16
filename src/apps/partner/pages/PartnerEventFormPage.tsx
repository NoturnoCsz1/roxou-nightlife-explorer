/**
 * PartnerEventFormPage — Fase 9G
 *
 * Página independente para criar/editar evento. Mantida como rota orfã
 * (sem registro em App.tsx) seguindo o padrão das fases 9D/9E.
 * Use o ID via prop ou via query (?eventId=...) quando integrada ao router.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import { PartnerEventForm } from "../components";
import {
  createPartnerEvent,
  getMyEvent,
  updatePartnerEvent,
  type PartnerEventPayload,
  type PartnerEventRow,
} from "../services/partnerEvents";

interface Props {
  eventId?: string;
  onSaved?: (event: PartnerEventRow) => void;
  onCancel?: () => void;
}

const PartnerEventFormPage = ({ eventId, onSaved, onCancel }: Props) => {
  const { selectedPartner, role } = usePartnerAuth();
  const partnerId = selectedPartner?.id ?? null;
  const canWrite = role === "owner" || role === "admin" || role === "editor";

  const [initial, setInitial] = useState<PartnerEventRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!eventId || !partnerId) return;
    setLoading(true);
    getMyEvent(eventId, partnerId)
      .then((row) => {
        if (!cancelled) setInitial(row);
      })
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
  if (!canWrite) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6 text-zinc-300">
        Você não tem permissão para criar ou editar eventos.
      </main>
    );
  }

  const handleSubmit = async (payload: PartnerEventPayload) => {
    setBusy(true);
    try {
      const saved = eventId
        ? await updatePartnerEvent(eventId, partnerId, payload)
        : await createPartnerEvent(partnerId, payload);
      toast.success(eventId ? "Evento atualizado." : "Evento criado.");
      onSaved?.(saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 p-4 text-white sm:p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-2xl font-bold">
          {eventId ? "Editar evento" : "Novo evento"}
        </h1>
        {loading ? (
          <p className="text-zinc-400">Carregando…</p>
        ) : (
          <PartnerEventForm
            initial={initial ?? undefined}
            busy={busy}
            submitLabel={eventId ? "Salvar alterações" : "Criar como rascunho"}
            onSubmit={handleSubmit}
            onCancel={onCancel}
          />
        )}
      </div>
    </main>
  );
};

export default PartnerEventFormPage;
