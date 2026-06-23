/**
 * PartnerReservasEquipePage — FASE 6
 *
 * CRUD de acessos temporários da equipe operacional.
 * Perfis: validador, recepção, caixa, gerente.
 * Persiste em `partner_staff_accounts` (RLS por partner_users).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Trash2,
  Power,
  Plus,
  Shield,
  AlertTriangle,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

import { PartnerScreen } from "../components/PartnerScreen";
import { PartnerEmptyState } from "../components/PartnerEmptyState";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import { onFabClick } from "../components/PartnerFab";
import {
  createStaffAccount,
  deleteStaffAccount,
  generatePin,
  listStaffAccounts,
  revokeAllStaff,
  updateStaffAccount,
  DEFAULT_PERMISSIONS,
  ROLE_LABEL,
  type PartnerStaffAccount,
  type PartnerStaffRole,
} from "../services/partnerStaff";

const ROLES: PartnerStaffRole[] = ["validador", "recepcao", "caixa", "gerente"];

const formatExpiry = (iso: string | null): string => {
  if (!iso) return "Sem expiração";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const PartnerReservasEquipePage = () => {
  const { selectedPartner, selectedPartnerId, role: userRole } = usePartnerAuth();
  const canManage = userRole === "owner" || userRole === "admin";
  const [items, setItems] = useState<PartnerStaffAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PartnerStaffAccount | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState<PartnerStaffRole>("validador");
  const [formPin, setFormPin] = useState("");
  const [formExpires, setFormExpires] = useState(""); // datetime-local
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!selectedPartnerId) return;
    setLoading(true);
    try {
      const list = await listStaffAccounts(selectedPartnerId);
      setItems(list);
    } catch (err) {
      toast.error("Erro ao carregar equipe", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [selectedPartnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openSheet = useCallback(() => {
    if (!canManage) {
      toast.error("Sem permissão para gerenciar equipe");
      return;
    }
    setFormName("");
    setFormRole("validador");
    setFormPin(generatePin("validador"));
    setFormExpires("");
    setSheetOpen(true);
  }, [canManage]);

  useEffect(() => onFabClick("staff:new", openSheet), [openSheet]);

  // Quando role muda, regenera o PIN sugerido se ainda não foi editado manualmente
  const handleRoleChange = (next: PartnerStaffRole) => {
    setFormRole(next);
    setFormPin(generatePin(next));
  };

  const handleSave = async () => {
    if (!selectedPartnerId || !canManage) return;
    if (!formName.trim()) {
      toast.error("Informe o nome");
      return;
    }
    setSaving(true);
    try {
      await createStaffAccount(selectedPartnerId, {
        name: formName.trim(),
        role: formRole,
        pin: formPin.trim() || null,
        permissions: DEFAULT_PERMISSIONS[formRole],
        expires_at: formExpires ? new Date(formExpires).toISOString() : null,
      });
      toast.success("Acesso criado");
      setSheetOpen(false);
      void load();
    } catch (err) {
      toast.error("Erro ao salvar", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (acc: PartnerStaffAccount) => {
    if (!canManage) return;
    try {
      await updateStaffAccount(acc.id, { is_active: !acc.is_active });
      toast.success(acc.is_active ? "Acesso revogado" : "Acesso ativado");
      void load();
    } catch (err) {
      toast.error("Erro", { description: (err as Error).message });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete || !canManage) return;
    try {
      await deleteStaffAccount(confirmDelete.id);
      toast.success("Acesso removido");
      setConfirmDelete(null);
      void load();
    } catch (err) {
      toast.error("Erro", { description: (err as Error).message });
    }
  };

  const handleRevokeAll = async () => {
    if (!selectedPartnerId || !canManage) return;
    try {
      const n = await revokeAllStaff(selectedPartnerId);
      toast.success(`${n} acesso${n === 1 ? "" : "s"} revogado${n === 1 ? "" : "s"}`);
      setConfirmRevokeAll(false);
      void load();
    } catch (err) {
      toast.error("Erro", { description: (err as Error).message });
    }
  };

  const handleCopyPin = (pin: string | null) => {
    if (!pin) return;
    void navigator.clipboard?.writeText(pin);
    toast.success("PIN copiado");
  };

  const activeCount = useMemo(() => items.filter((i) => i.is_active).length, [items]);

  if (!selectedPartnerId) {
    return (
      <PartnerScreen title="Equipe e acessos">
        <PartnerEmptyState ctaLabel="Voltar" ctaTo="/reservas" />
      </PartnerScreen>
    );
  }

  return (
    <PartnerScreen
      title="Equipe e acessos"
      subtitle={selectedPartner?.name ?? undefined}
    >
      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Acessos ativos</p>
            <p className="text-2xl font-semibold tabular-nums">{activeCount}</p>
          </div>
          {canManage ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setConfirmRevokeAll(true)}>
                <Power className="h-4 w-4 mr-1.5" />
                Revogar tudo
              </Button>
              <Button size="sm" onClick={openSheet}>
                <Plus className="h-4 w-4 mr-1.5" />
                Novo
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {loading && items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6">Carregando…</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center space-y-2">
            <Shield className="h-8 w-8 mx-auto text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              Nenhum acesso criado ainda.
            </p>
            {canManage ? (
              <Button onClick={openSheet} size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Criar primeiro acesso
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {items.map((acc) => (
            <Card key={acc.id} className={acc.is_active ? "" : "opacity-60"}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-violet-500/15 text-violet-300 flex items-center justify-center text-sm font-semibold">
                  {acc.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{acc.name}</span>
                    <Badge
                      variant="outline"
                      className="bg-white/5 text-[10px] uppercase tracking-wider"
                    >
                      {ROLE_LABEL[acc.role]}
                    </Badge>
                    {!acc.is_active ? (
                      <Badge variant="outline" className="bg-rose-500/15 text-rose-300 border-rose-500/30 text-[10px]">
                        Revogado
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
                    {acc.pin ? (
                      <button
                        type="button"
                        onClick={() => handleCopyPin(acc.pin)}
                        className="inline-flex items-center gap-1 font-mono hover:text-foreground transition-colors"
                      >
                        {acc.pin}
                        <Copy className="h-3 w-3" />
                      </button>
                    ) : null}
                    <span>{formatExpiry(acc.expires_at)}</span>
                  </div>
                </div>
                {canManage ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => void handleToggle(acc)}
                      className="h-8 w-8"
                      aria-label={acc.is_active ? "Revogar" : "Ativar"}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setConfirmDelete(acc)}
                      className="h-8 w-8 text-rose-300 hover:text-rose-200"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sheet criar */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Novo acesso da equipe</SheetTitle>
            <SheetDescription>
              Crie um login temporário (PIN) para validador, recepção, caixa ou gerente.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="staff-name">Nome</Label>
              <Input
                id="staff-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex.: João"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Perfil</Label>
              <Select value={formRole} onValueChange={(v) => handleRoleChange(v as PartnerStaffRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Permissões padrão aplicadas conforme o perfil.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-pin">PIN</Label>
              <div className="flex gap-2">
                <Input
                  id="staff-pin"
                  value={formPin}
                  onChange={(e) => setFormPin(e.target.value.toUpperCase())}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormPin(generatePin(formRole))}
                >
                  Gerar
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-expires">Expira em</Label>
              <Input
                id="staff-expires"
                type="datetime-local"
                value={formExpires}
                onChange={(e) => setFormExpires(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Deixe vazio para não expirar. Encerrar a operação revoga todos manualmente.
              </p>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando…" : "Criar acesso"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Confirmar excluir */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover acesso?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.name} não poderá mais entrar. Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 hover:bg-rose-600 text-white"
              onClick={handleDelete}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar revogar todos */}
      <AlertDialog open={confirmRevokeAll} onOpenChange={setConfirmRevokeAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Revogar todos os acessos?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Todos os PINs ficam inativos imediatamente. Os registros permanecem para reativação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 hover:bg-rose-600 text-white"
              onClick={handleRevokeAll}
            >
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PartnerScreen>
  );
};

export default PartnerReservasEquipePage;
