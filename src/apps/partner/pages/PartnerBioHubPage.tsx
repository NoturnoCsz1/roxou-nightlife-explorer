/**
 * PartnerBioHubPage — /partner/bio
 *
 * Shell premium V1.1:
 *  - Layout split (editor à esquerda, preview de celular à direita no desktop)
 *  - Tabs: Home (dashboard) · Perfil · Links · Cardápio · Analytics · QR · Módulos
 *  - Painel de compartilhamento (copiar, share nativo, baixar QR)
 *  - Mobile: botão flutuante "Visualizar" abrindo a bio pública
 *
 * 100% reutiliza `services/bio.ts` — sem novas tabelas/RPCs.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ExternalLink, Eye } from "lucide-react";
import { usePartnerAuth } from "@/apps/partner/hooks/usePartnerAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  getBioByPartner,
  createBioForPartner,
  type BioProfile,
} from "@/services/bio";
import {
  BioTabsContainer,
  BioLivePreview,
  BioSharePanel,
} from "@/apps/partner/bio/BioTabs";

const VALID_TABS = ["home", "perfil", "links", "menu", "analytics", "qr", "configuracoes"] as const;
type TabId = (typeof VALID_TABS)[number];

export default function PartnerBioHubPage() {
  const navigate = useNavigate();
  const params = useParams<{ tab?: string }>();
  const tab: TabId = (VALID_TABS as readonly string[]).includes(params.tab ?? "")
    ? (params.tab as TabId)
    : "home";

  const { selectedPartner, selectedPartnerId } = usePartnerAuth();
  const [bio, setBio] = useState<BioProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!selectedPartnerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getBioByPartner(selectedPartnerId)
      .then(setBio)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [selectedPartnerId]);

  async function handleCreate() {
    if (!selectedPartnerId || !selectedPartner) return;
    setCreating(true);
    try {
      const { data: p } = await supabase
        .from("partners")
        .select("*")
        .eq("id", selectedPartnerId)
        .maybeSingle();

      await createBioForPartner({
        id: selectedPartnerId,
        slug: (p as { slug?: string } | null)?.slug ?? selectedPartner.slug ?? null,
        name: (p as { name?: string } | null)?.name ?? selectedPartner.name,
        avatar_url: (p as { avatar_url?: string } | null)?.avatar_url ?? null,
        cover_url: (p as { cover_url?: string } | null)?.cover_url ?? null,
        bio: (p as { bio?: string } | null)?.bio ?? null,
        city: (p as { city?: string } | null)?.city ?? null,
        whatsapp: (p as { whatsapp?: string } | null)?.whatsapp ?? null,
        instagram: (p as { instagram?: string } | null)?.instagram ?? null,
      });
      const fresh = await getBioByPartner(selectedPartnerId);
      setBio(fresh);
      toast.success("Bio criada com sucesso");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  if (!selectedPartnerId) {
    return (
      <div className="container py-10">
        <Card className="p-6 text-center text-muted-foreground">
          Selecione um parceiro para gerenciar a Bio.
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container py-6 space-y-3">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!bio) {
    return (
      <div className="container py-10">
        <Card className="p-8 text-center max-w-lg mx-auto bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <h2 className="text-xl font-bold mb-2">Crie sua Roxou Bio</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Uma página única que centraliza eventos, reservas, lista VIP, excursões, cardápio e
            todos os seus links — integrada ao ecossistema Roxou.
          </p>
          <Button onClick={handleCreate} disabled={creating} size="lg">
            {creating ? "Criando…" : "Criar minha Bio"}
          </Button>
        </Card>
      </div>
    );
  }

  const publicUrl = `/bio/${bio.slug}`;

  return (
    <div className="container py-4 sm:py-6 max-w-7xl">
      {/* Header */}
      <header className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            Roxou Bio · {bio.display_name}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Página única e inteligente · /bio/{bio.slug}
          </p>
        </div>
        <BioSharePanel bio={bio} />
      </header>

      {/* Layout split */}
      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        <div className="min-w-0">
          <BioTabsContainer
            bio={bio}
            partnerId={selectedPartnerId}
            tab={tab}
            onTabChange={(t) => navigate(`/partner/bio/${t === "home" ? "" : t}`)}
            onBioUpdated={setBio}
          />
        </div>

        <BioLivePreview bio={bio} />
      </div>

      {/* FAB mobile */}
      <div className="lg:hidden fixed bottom-20 right-4 z-40">
        <Button
          asChild
          size="lg"
          className="rounded-full shadow-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <Link to={publicUrl} target="_blank">
            <Eye className="h-5 w-5 mr-2" /> Visualizar
          </Link>
        </Button>
      </div>
    </div>
  );
}
