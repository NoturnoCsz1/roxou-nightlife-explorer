/**
 * PartnerProfilePage — placeholder (Fase 9C).
 * Consome PartnerContext apenas para leitura. Edição real virá em fases futuras
 * gravando direto em `partners`.
 */
import { usePartnerAuth } from "../hooks/usePartnerAuth";

const PartnerProfilePage = () => {
  const { selectedPartner, canEditProfile } = usePartnerAuth();
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Perfil do Estabelecimento</h1>
      <p className="text-muted-foreground">
        {selectedPartner?.name ?? "—"} · edição:{" "}
        {canEditProfile ? "habilitada" : "somente leitura"}
      </p>
    </main>
  );
};

export default PartnerProfilePage;
