/**
 * PartnerProfilePage — backend oficial
 * Lê e edita o venue oficial da organização ativa da sessão do Partner Pro.
 */
import { useCallback, useEffect, useState } from "react";
import { usePartnerSession } from "../hooks/usePartnerSession";
import { PartnerEmptyState, PartnerProfileEditor } from "../components";
import {
  getVenueProfile,
  type VenueProfileRow,
} from "../services/partnerProfile";

const PartnerProfilePage = () => {
  const { session, venueId, isLoading, isManagerOrOwner } = usePartnerSession();
  const [profile, setProfile] = useState<VenueProfileRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const canSave = isManagerOrOwner;
  const canSuggest = !isManagerOrOwner && session.status === "active";

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      setProfile(await getVenueProfile(id));
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Falha ao carregar o perfil.",
      );
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!venueId) {
      setProfile(null);
      return;
    }
    void load(venueId);
  }, [venueId, load]);

  if (isLoading) {
    return (
      <main className="min-h-screen p-6">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </main>
    );
  }

  if (!venueId) {
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
          {canSave ? "Edição habilitada" : "Somente leitura"}
        </span>
      </header>

      {loading && !profile ? (
        <p className="text-sm text-muted-foreground">Carregando perfil…</p>
      ) : profile ? (
        <PartnerProfileEditor
          profile={profile}
          canSave={canSave}
          canSuggest={canSuggest}
          onSaved={(row) => setProfile(row)}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          {loadError ?? "Estabelecimento não encontrado."}
        </p>
      )}
    </main>
  );
};

export default PartnerProfilePage;
