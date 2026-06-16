/**
 * PartnerReservationDetailPage — Fase 9H
 * Página de detalhe de uma reserva (não roteada em App.tsx).
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import { ReservationStatusBadge } from "../components/ReservationStatusBadge";
import {
  cancelReservation,
  completeReservation,
  confirmReservation,
  getReservation,
  type PartnerReservationRow,
} from "../services/partnerReservations";

const PartnerReservationDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { selectedPartner, role } = usePartnerAuth();
  const [row, setRow] = useState<PartnerReservationRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id || !selectedPartner?.id) return;
    setLoading(true);
    try {
      const r = await getReservation(id, selectedPartner.id);
      setRow(r);
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, selectedPartner?.id]);

  const canCancel = role === "owner" || role === "admin";
  const canConfirm =
    role === "owner" || role === "admin" || role === "editor" || role === "attendant";
  const canComplete = role === "owner" || role === "admin" || role === "attendant";

  const act = async (fn: () => Promise<unknown>, label: string) => {
    try {
      await fn();
      toast({ title: label });
      await load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    }
  };

  if (loading) {
    return <main className="min-h-screen p-6 text-muted-foreground">Carregando…</main>;
  }
  if (!row) {
    return (
      <main className="min-h-screen p-6">
        <p className="text-sm text-muted-foreground">Reserva não encontrada.</p>
        <Button asChild variant="outline" className="mt-3">
          <Link to="/painel/reservas">Voltar</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen space-y-4 p-4 sm:p-6">
      <Button asChild variant="outline" size="sm">
        <Link to="/painel/reservas">← Voltar</Link>
      </Button>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle>{row.name}</CardTitle>
            <ReservationStatusBadge status={row.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Quando: </span>
            {new Date(row.reservation_date).toLocaleString("pt-BR")}
          </p>
          <p>
            <span className="text-muted-foreground">Convidados: </span>
            {row.people_count}
          </p>
          {row.phone && (
            <p>
              <span className="text-muted-foreground">Telefone: </span>
              {row.phone}
            </p>
          )}
          {row.email && (
            <p>
              <span className="text-muted-foreground">E-mail: </span>
              {row.email}
            </p>
          )}
          {row.notes && (
            <p>
              <span className="text-muted-foreground">Observações: </span>
              {row.notes}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            {canConfirm && row.status === "pending" && (
              <Button onClick={() => act(() => confirmReservation(row.id), "Confirmada")}>
                Confirmar
              </Button>
            )}
            {canComplete && row.status === "confirmed" && (
              <Button
                variant="secondary"
                onClick={() => act(() => completeReservation(row.id), "Concluída")}
              >
                Concluir
              </Button>
            )}
            {canCancel && row.status !== "cancelled" && (
              <Button
                variant="ghost"
                onClick={() => act(() => cancelReservation(row.id), "Cancelada")}
              >
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default PartnerReservationDetailPage;
