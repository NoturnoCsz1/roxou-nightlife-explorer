/**
 * PartnerListasPromotersPage — FASE 6B
 * CRUD de promoters (ativar/desativar + criação rápida).
 */
import { useCallback, useEffect, useState } from "react";
import { Plus, Power, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";

import { PartnerScreen } from "../components/PartnerScreen";
import { PartnerEmptyState } from "../components/PartnerEmptyState";
import { usePartnerAuth, canManageEvents } from "../hooks/usePartnerAuth";
import { onFabClick } from "../components/PartnerFab";
import {
  createPromoter,
  listPromoters,
  updatePromoter,
  type PartnerPromoter,
} from "../services/partnerPromoters";

const PartnerListasPromotersPage = () => {
  const { selectedPartner, role } = usePartnerAuth();
  const partnerId = selectedPartner?.id ?? null;
  const canManage = canManageEvents(role);

  const [items, setItems] = useState<PartnerPromoter[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      setItems(await listPromoters(partnerId, { includeInactive: true }));
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => onFabClick("promoter:new", () => setOpen(true)), []);

  const reset = () => {
    setName("");
    setPhone("");
    setInstagram("");
  };

  const handleSave = async () => {
    if (!partnerId) return;
    if (!name.trim()) {
      toast({ title: "Informe o nome" });
      return;
    }
    setSaving(true);
    try {
      await createPromoter(partnerId, {
        name: name.trim(),
        phone: phone.trim() || null,
        instagram: instagram.trim() || null,
      });
      toast({ title: "Promoter criado" });
      setOpen(false);
      reset();
      void load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (p: PartnerPromoter) => {
    try {
      await updatePromoter(p.id, { is_active: !p.is_active });
      toast({ title: p.is_active ? "Desativado" : "Ativado" });
      void load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    }
  };

  if (!partnerId) {
    return (
      <PartnerScreen title="Promoters">
        <PartnerEmptyState ctaLabel="Voltar" ctaTo="/listas" />
      </PartnerScreen>
    );
  }

  return (
    <PartnerScreen
      title="Promoters"
      subtitle={selectedPartner?.name ?? undefined}
    >
      {canManage ? (
        <Button onClick={() => setOpen(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Novo promoter
        </Button>
      ) : null}

      {loading && items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6">Carregando…</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center space-y-2">
            <Megaphone className="h-8 w-8 mx-auto text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              Nenhum promoter cadastrado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {items.map((p) => (
            <Card key={p.id} className={p.is_active ? "" : "opacity-60"}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 shrink-0 rounded-full bg-fuchsia-500/15 text-fuchsia-300 flex items-center justify-center text-xs font-semibold">
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{p.name}</span>
                    {!p.is_active ? (
                      <Badge
                        variant="outline"
                        className="bg-rose-500/15 text-rose-300 border-rose-500/30 text-[10px]"
                      >
                        Inativo
                      </Badge>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {p.phone ?? "—"}
                    {p.instagram ? ` · @${p.instagram.replace(/^@/, "")}` : ""}
                  </div>
                </div>
                {canManage ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => void handleToggle(p)}
                    aria-label={p.is_active ? "Desativar" : "Ativar"}
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Novo promoter</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Nome</Label>
              <Input
                id="p-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-phone">Telefone</Label>
              <Input
                id="p-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-ig">Instagram</Label>
              <Input
                id="p-ig"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@usuario"
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Salvando…" : "Criar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PartnerScreen>
  );
};

export default PartnerListasPromotersPage;
