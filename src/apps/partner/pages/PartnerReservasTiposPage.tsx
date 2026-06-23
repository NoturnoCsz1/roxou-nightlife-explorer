/**
 * PartnerReservasTiposPage — FASE 6
 * Wrapper para gerenciamento de tipos de reserva (mesas, bistrôs, camarotes).
 */
import { PartnerScreen } from "../components/PartnerScreen";
import { PartnerEmptyState } from "../components/PartnerEmptyState";
import { ReservationTypesManager } from "../components";
import { usePartnerAuth } from "../hooks/usePartnerAuth";

const PartnerReservasTiposPage = () => {
  const { selectedPartner, selectedPartnerId, role } = usePartnerAuth();
  const canEdit = role === "owner" || role === "admin";

  if (!selectedPartnerId) {
    return (
      <PartnerScreen title="Tipos de reserva">
        <PartnerEmptyState ctaLabel="Voltar" ctaTo="/reservas" />
      </PartnerScreen>
    );
  }

  return (
    <PartnerScreen
      title="Tipos de reserva"
      subtitle={selectedPartner?.name ?? undefined}
    >
      <ReservationTypesManager partnerId={selectedPartnerId} canEdit={canEdit} />
    </PartnerScreen>
  );
};

export default PartnerReservasTiposPage;
