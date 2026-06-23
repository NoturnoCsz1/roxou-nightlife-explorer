/**
 * PartnerReservasConfiguracoesPage — FASE 6
 * Configurações da reserva: geral, prazos, limites, pagamentos e link público.
 */
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, QrCode, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

import { PartnerScreen } from "../components/PartnerScreen";
import { PartnerEmptyState } from "../components/PartnerEmptyState";
import {
  PublicLinkQrDialog,
  ReservationSettingsForm,
} from "../components";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import {
  getReservationSettings,
  updateReservationSettings,
  type PartnerReservationSettings,
} from "../services/partnerReservations";

const PartnerReservasConfiguracoesPage = () => {
  const { selectedPartner, selectedPartnerId, role } = usePartnerAuth();
  const [settings, setSettings] = useState<PartnerReservationSettings | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const canEdit = role === "owner" || role === "admin";

  const load = useCallback(async () => {
    if (!selectedPartnerId) return;
    setLoading(true);
    try {
      const s = await getReservationSettings(selectedPartnerId);
      setSettings(s);
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [selectedPartnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!selectedPartnerId) {
    return (
      <PartnerScreen title="Configurações de reservas">
        <PartnerEmptyState ctaLabel="Voltar" ctaTo="/reservas" />
      </PartnerScreen>
    );
  }

  const slug = selectedPartner?.slug;
  const publicUrl = (() => {
    if (!slug) return "";
    if (typeof window === "undefined") return `/${slug}/reservas`;
    const host = window.location.hostname;
    if (host === "parceiro.roxou.com.br") {
      return `https://roxou.com.br/${slug}/reservas`;
    }
    return `${window.location.origin}/${slug}/reservas`;
  })();

  const handleCopy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast({ title: "Link copiado" });
    } catch {
      toast({ title: "Não foi possível copiar" });
    }
  };

  const handleShare = async () => {
    if (!publicUrl) return;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "Reservas", url: publicUrl });
        return;
      } catch { /* cancelado */ }
    }
    void handleCopy();
  };

  return (
    <PartnerScreen
      title="Configurações de reservas"
      subtitle={selectedPartner?.name ?? undefined}
    >
      {loading && !settings ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <ReservationSettingsForm
          initial={settings}
          onSave={async (payload) => {
            if (!canEdit) {
              toast({ title: "Sem permissão" });
              return;
            }
            try {
              const updated = await updateReservationSettings(selectedPartnerId, payload);
              setSettings(updated);
              toast({ title: "Configurações salvas" });
            } catch (err) {
              toast({ title: "Erro", description: (err as Error).message });
            }
          }}
        />
      )}

      {settings?.reservations_enabled && slug && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Link público de reservas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs truncate font-mono"
              title={publicUrl}
            >
              {publicUrl}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button onClick={() => void handleShare()} className="min-h-[44px]">
                <Share2 className="mr-1.5 h-4 w-4" />
                <span className="truncate">Compartilhar</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")}
                className="min-h-[44px]"
              >
                <ExternalLink className="mr-1.5 h-4 w-4" />
                <span className="truncate">Abrir</span>
              </Button>
              <Button variant="outline" onClick={() => void handleCopy()} className="min-h-[44px]">
                <Copy className="mr-1.5 h-4 w-4" />
                <span className="truncate">Copiar</span>
              </Button>
              <Button variant="outline" onClick={() => setQrOpen(true)} className="min-h-[44px]">
                <QrCode className="mr-1.5 h-4 w-4" />
                <span className="truncate">QR</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <PublicLinkQrDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        url={publicUrl}
        filename={`reservas-${slug ?? "qr"}.png`}
      />
    </PartnerScreen>
  );
};

export default PartnerReservasConfiguracoesPage;
