/**
 * PartnerProfilePage — Fase 9D (read-only).
 * Mostra dados de `partners`. Edição virá em fases futuras.
 */
import { useEffect, useState } from "react";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import { PartnerEmptyState, PartnerProfileCard } from "../components";
import {
  getPartnerDetails,
  type PartnerDetails,
} from "../services/partnerDashboard";

const PartnerProfilePage = () => {
  const { selectedPartnerId, canEditProfile, isLoading } = usePartnerAuth();
  const [details, setDetails] = useState<PartnerDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedPartnerId) {
      setDetails(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getPartnerDetails(selectedPartnerId)
      .then((d) => {
        if (!cancelled) setDetails(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPartnerId]);

  if (isLoading) {
    return (
      <main className="min-h-screen p-6">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </main>
    );
  }

  if (!selectedPartnerId) {
    return (
      <main className="min-h-screen p-6 space-y-4">
        <h1 className="text-2xl font-bold">Perfil do Estabelecimento</h1>
        <PartnerEmptyState />
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Perfil do Estabelecimento</h1>
        <span className="text-xs text-muted-foreground">
          {canEditProfile ? "Edição: em breve" : "Somente leitura"}
        </span>
      </header>

      <PartnerProfileCard partner={details} />

      {details?.full_description ? (
        <section className="rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold mb-2">Sobre</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {details.full_description}
          </p>
        </section>
      ) : null}

      <section className="rounded-lg border border-border p-4 text-xs text-muted-foreground">
        {loading ? "Atualizando…" : "Dados lidos diretamente da tabela `partners`."}
      </section>
    </main>
  );
};

export default PartnerProfilePage;
