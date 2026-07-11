/**
 * PartnerListasConfiguracoesPage — FASE 6B
 * Configurações por lista: público on/off, regras de aprovação, limites
 * e link público. Por enquanto, alterna entre listas via picker.
 */
import { useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, QrCode, Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

import { PartnerScreen } from "../components/PartnerScreen";
import { PartnerEmptyState } from "../components/PartnerEmptyState";
import { PublicLinkQrDialog } from "../components";
import { usePartnerAuth, canManageEvents } from "../hooks/usePartnerAuth";
import {
  listVipLists,
  setVipListPublicEnabled,
  updateVipList,
  type PartnerVipList,
} from "@modules/partner/vip";

const PartnerListasConfiguracoesPage = () => {
  const { selectedPartner, role } = usePartnerAuth();
  const partnerId = selectedPartner?.id ?? null;
  const canManage = canManageEvents(role);

  const [lists, setLists] = useState<PartnerVipList[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [maxEntries, setMaxEntries] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const load = useCallback(async () => {
    if (!partnerId) return;
    try {
      const ls = await listVipLists(partnerId);
      setLists(ls);
      setSelectedId((prev) => prev || ls[0]?.id || "");
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    }
  }, [partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const list = lists.find((l) => l.id === selectedId) ?? null;

  useEffect(() => {
    setMaxEntries(list?.max_entries != null ? String(list.max_entries) : "");
  }, [selectedId, list]);

  const publicUrl = (() => {
    if (!list?.public_slug) return "";
    if (typeof window === "undefined") return `/vip/${list.public_slug}`;
    const host = window.location.hostname;
    if (host === "parceiro.roxou.com.br") {
      return `https://roxou.com.br/vip/${list.public_slug}`;
    }
    return `${window.location.origin}/vip/${list.public_slug}`;
  })();

  const handleTogglePublic = async (enabled: boolean) => {
    if (!list) return;
    try {
      await setVipListPublicEnabled(list.id, enabled);
      toast({ title: enabled ? "Inscrições ativadas" : "Inscrições pausadas" });
      void load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    }
  };

  const handleToggleApproval = async (requires: boolean) => {
    if (!list) return;
    try {
      // requires_approval não está no payload tipado — usa update via RPC com cast
      await updateVipList(list.id, {} as never);
      // Alternativa: atualizar via supabase direto
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase
        .from("partner_vip_lists")
        .update({ requires_approval: requires } as never)
        .eq("id", list.id);
      if (error) throw error;
      toast({ title: requires ? "Aprovação manual" : "Aprovação automática" });
      void load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    }
  };

  const handleSaveMax = async () => {
    if (!list) return;
    setSaving(true);
    try {
      await updateVipList(list.id, {
        max_entries: maxEntries.trim() ? Number(maxEntries) : null,
      });
      toast({ title: "Limites salvos" });
      void load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    toast({ title: "Link copiado" });
  };
  const handleShare = async () => {
    if (!publicUrl) return;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: list?.title ?? "Lista VIP", url: publicUrl });
        return;
      } catch { /* cancelado */ }
    }
    void handleCopy();
  };

  if (!partnerId) {
    return (
      <PartnerScreen title="Configurações de listas">
        <PartnerEmptyState ctaLabel="Voltar" ctaTo="/listas" />
      </PartnerScreen>
    );
  }

  return (
    <PartnerScreen
      title="Configurações de listas"
      subtitle={selectedPartner?.name ?? undefined}
    >
      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Lista
        </Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma lista" />
          </SelectTrigger>
          <SelectContent>
            {lists.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!list ? (
        <PartnerEmptyState ctaLabel="Criar lista" ctaTo="/listas" />
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Geral</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Aceitar inscrições</p>
                  <p className="text-[11px] text-muted-foreground">
                    Permite cadastro pelo link público.
                  </p>
                </div>
                <Switch
                  checked={list.public_enabled}
                  onCheckedChange={(v) => void handleTogglePublic(v)}
                  disabled={!canManage}
                />
              </div>
              <div className="border-t border-white/5" />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Autoaprovar</p>
                  <p className="text-[11px] text-muted-foreground">
                    Inscrições entram já confirmadas.
                  </p>
                </div>
                <Switch
                  checked={!list.requires_approval}
                  onCheckedChange={(v) => void handleToggleApproval(!v)}
                  disabled={!canManage}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Limites</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="cfg-max">Máximo de participantes</Label>
                <Input
                  id="cfg-max"
                  type="number"
                  inputMode="numeric"
                  value={maxEntries}
                  onChange={(e) => setMaxEntries(e.target.value)}
                  placeholder="Sem limite"
                />
              </div>
              <Button
                size="sm"
                onClick={() => void handleSaveMax()}
                disabled={saving || !canManage}
              >
                {saving ? "Salvando…" : "Salvar limites"}
              </Button>
            </CardContent>
          </Card>

          {list.public_enabled && list.public_slug ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Link público</CardTitle>
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
                    Compartilhar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      window.open(publicUrl, "_blank", "noopener,noreferrer")
                    }
                    className="min-h-[44px]"
                  >
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    Abrir
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void handleCopy()}
                    className="min-h-[44px]"
                  >
                    <Copy className="mr-1.5 h-4 w-4" />
                    Copiar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setQrOpen(true)}
                    className="min-h-[44px]"
                  >
                    <QrCode className="mr-1.5 h-4 w-4" />
                    QR
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      <PublicLinkQrDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        url={publicUrl}
        filename={`vip-${list?.public_slug ?? "qr"}.png`}
      />
    </PartnerScreen>
  );
};

export default PartnerListasConfiguracoesPage;
