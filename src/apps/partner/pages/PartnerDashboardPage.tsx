/**
 * PartnerDashboardPage — placeholder (Fase 9C).
 * Agora consome o PartnerContext via usePartnerAuth.
 * Continua sem rota registrada no App.tsx.
 */
import { usePartnerAuth } from "../hooks/usePartnerAuth";

const PartnerDashboardPage = () => {
  const { selectedPartner, role, subscription, isLoading } = usePartnerAuth();

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Dashboard do Parceiro</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : selectedPartner ? (
        <p className="text-muted-foreground">
          {selectedPartner.name} · papel: {role} · plano:{" "}
          {subscription?.plan ?? "free"}
        </p>
      ) : (
        <p className="text-muted-foreground">Nenhum estabelecimento vinculado.</p>
      )}
    </main>
  );
};

export default PartnerDashboardPage;
