/**
 * PartnerExcursoesVeiculosPage — FASE 7.2
 *
 * CRUD de veículos do parceiro (cadastro simples). Usado para vincular
 * viagens e definir capacidade padrão. Mapa visual de layout fica para
 * subfases futuras (mantemos `seat_layout` JSONB livre no banco).
 */
import { useCallback, useEffect, useState } from "react";
import { Bus, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { PartnerScreen } from "../components/PartnerScreen";
import { PartnerEmptyState } from "../components/PartnerEmptyState";
import { onFabClick } from "../components/PartnerFab";
import { usePartnerAuth, canManageEvents } from "../hooks/usePartnerAuth";
import {
  createExcursionVehicle,
  deleteExcursionVehicle,
  listExcursionVehicles,
  updateExcursionVehicle,
  type ExcursionVehicle,
  type ExcursionVehiclePayload,
} from "../services/partnerExcursoes";

interface VehicleFormProps {
  initial?: ExcursionVehicle;
  submitting: boolean;
  onSubmit: (payload: ExcursionVehiclePayload) => void;
}

function VehicleForm({ initial, submitting, onSubmit }: VehicleFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [plate, setPlate] = useState(initial?.plate ?? "");
  const [capacity, setCapacity] = useState<string>(
    String(initial?.capacity ?? 40),
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [active, setActive] = useState(initial?.is_active ?? true);

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    const cap = Number(capacity);
    if (!name.trim()) {
      toast({ title: "Informe o nome do veículo" });
      return;
    }
    if (!Number.isFinite(cap) || cap <= 0) {
      toast({ title: "Capacidade inválida" });
      return;
    }
    onSubmit({
      name,
      plate: plate || null,
      capacity: cap,
      notes: notes || null,
      is_active: active,
    });
  };

  return (
    <form className="space-y-3 py-2" onSubmit={handle}>
      <div className="space-y-1">
        <Label htmlFor="ex-veh-name">Nome</Label>
        <Input
          id="ex-veh-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Ônibus 01"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="ex-veh-plate">Placa</Label>
          <Input
            id="ex-veh-plate"
            value={plate ?? ""}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            placeholder="ABC1D23"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ex-veh-cap">Capacidade</Label>
          <Input
            id="ex-veh-cap"
            inputMode="numeric"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ""))}
            placeholder="40"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="ex-veh-notes">Observações</Label>
        <Input
          id="ex-veh-notes"
          value={notes ?? ""}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ar-condicionado, banheiro…"
        />
      </div>
      <div className="flex items-center justify-between rounded-xl border border-white/8 px-3 py-2">
        <div>
          <p className="text-sm font-medium">Veículo ativo</p>
          <p className="text-[11px] text-muted-foreground">
            Desativados não aparecem ao criar viagem.
          </p>
        </div>
        <Switch checked={active} onCheckedChange={setActive} />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={submitting}
      >
        {submitting ? "Salvando…" : "Salvar veículo"}
      </Button>
    </form>
  );
}

const PartnerExcursoesVeiculosPage = () => {
  const { selectedPartner, role } = usePartnerAuth();
  const partnerId = selectedPartner?.id ?? null;
  const canEdit = canManageEvents(role);

  const [vehicles, setVehicles] = useState<ExcursionVehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExcursionVehicle | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const data = await listExcursionVehicles(partnerId);
      setVehicles(data);
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(
    () =>
      onFabClick("excursoes:vehicle:new", () => {
        if (!canEdit) return;
        setEditing(null);
        setFormOpen(true);
      }),
    [canEdit],
  );

  const handleSubmit = async (payload: ExcursionVehiclePayload) => {
    if (!partnerId) return;
    setSubmitting(true);
    try {
      if (editing) {
        await updateExcursionVehicle(editing.id, payload);
        toast({ title: "Veículo atualizado" });
      } else {
        await createExcursionVehicle(partnerId, payload);
        toast({ title: "Veículo criado" });
      }
      setFormOpen(false);
      setEditing(null);
      void load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (v: ExcursionVehicle) => {
    if (!window.confirm(`Excluir veículo "${v.name}"?`)) return;
    try {
      await deleteExcursionVehicle(v.id);
      toast({ title: "Veículo removido" });
      void load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    }
  };

  if (!partnerId) {
    return (
      <PartnerScreen title="Veículos">
        <PartnerEmptyState ctaLabel="Voltar" ctaTo="/excursoes" />
      </PartnerScreen>
    );
  }

  return (
    <PartnerScreen
      title="Veículos"
      subtitle="Excursões oficiais"
      right={
        canEdit ? (
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Novo
          </Button>
        ) : null
      }
    >
      {loading && !vehicles.length ? (
        <p className="text-xs text-muted-foreground text-center">Carregando…</p>
      ) : null}

      {!loading && !vehicles.length ? (
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <div className="mx-auto h-10 w-10 rounded-xl bg-white/8 flex items-center justify-center">
              <Bus className="h-5 w-5 text-foreground/70" />
            </div>
            <div>
              <p className="text-sm font-medium">Nenhum veículo cadastrado</p>
              <p className="text-[12px] text-muted-foreground">
                Cadastre um ônibus, van ou carro para criar viagens.
              </p>
            </div>
            {canEdit ? (
              <Button onClick={() => setFormOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Cadastrar veículo
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-2">
        {vehicles.map((v) => (
          <Card key={v.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-sky-500/15 text-sky-300 flex items-center justify-center">
                <Bus className="h-5 w-5" />
              </div>
              <button
                type="button"
                className="flex-1 min-w-0 text-left"
                onClick={() => {
                  if (!canEdit) return;
                  setEditing(v);
                  setFormOpen(true);
                }}
              >
                <p className="text-sm font-medium truncate">{v.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {v.capacity} lugares
                  {v.plate ? ` · ${v.plate}` : ""}
                  {!v.is_active ? " · inativo" : ""}
                </p>
              </button>
              {canEdit ? (
                <button
                  type="button"
                  aria-label="Excluir"
                  className="h-8 w-8 shrink-0 rounded-lg hover:bg-white/[0.05] text-muted-foreground hover:text-destructive flex items-center justify-center"
                  onClick={() => handleDelete(v)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null); }}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editing ? "Editar veículo" : "Novo veículo"}
            </SheetTitle>
          </SheetHeader>
          <VehicleForm
            initial={editing ?? undefined}
            submitting={submitting}
            onSubmit={handleSubmit}
          />
        </SheetContent>
      </Sheet>
    </PartnerScreen>
  );
};

export default PartnerExcursoesVeiculosPage;
