/**
 * PartnerProfilePage — Fase 9E
 * Read + Edit do perfil do parceiro, sempre via tabela `partners`.
 */
import { useCallback, useEffect, useState } from "react";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import { PartnerEmptyState, PartnerProfileEditor } from "../components";
import {
  getPartnerProfile,
  type PartnerProfileRow,
} from "../services/partnerProfile";

const PartnerProfilePage = () => {
  const { selectedPartnerId, role, canEditProfile, isLoading } =
    usePartnerAuth();
  const [profile, setProfile] = useState<PartnerProfileRow | null>(null);
  const [loading, setLoading] = useState(false);

  const canSuggest = role === "editor";

  const load = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const row = await getPartnerProfile(id);
      setProfile(row);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedPartnerId) {
      setProfile(null);
      return;
    }
    load(selectedPartnerId);
  }, [selectedPartnerId, load]);

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
        <h1 className="text-xl md:text-2xl font-bold">
          Perfil do Estabelecimento
        </h1>
        <span className="text-xs text-muted-foreground">
          {canEditProfile
            ? "Edição habilitada"
            : canSuggest
              ? "Sugestões (em breve)"
              : "Somente leitura"}
        </span>
      </header>

      {loading && !profile ? (
        <p className="text-sm text-muted-foreground">Carregando perfil…</p>
      ) : profile ? (
        <PartnerProfileEditor
          profile={profile}
          canSave={canEditProfile}
          canSuggest={canSuggest}
          onSaved={(row) => setProfile(row)}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Estabelecimento não encontrado.
        </p>
      )}
    </main>
  );
};

export default PartnerProfilePage;
