/**
 * Gestor de tipos de reserva (mesas, bistrôs, camarotes).
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Save, X, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { NumberField } from "./NumberField";
import {
  listReservationTypes,
  upsertReservationType,
  deleteReservationType,
  getReservationTypesAvailability,
  type PartnerReservationType,
  type PartnerReservationTypeKind,
  type ReservationTypeAvailability,
} from "../services/partnerReservations";

const KIND_LABELS: Record<PartnerReservationTypeKind, string> = {
  table: "Mesas",
  bistro: "Bistrôs",
  box: "Camarotes",
};

const KIND_LABELS_MOBILE: Record<PartnerReservationTypeKind, string> = {
  table: "📋 Mesas",
  bistro: "🍸 Bistrôs",
  box: "👑 Camarotes",
};

interface DraftRow {
  id?: string;
  kind: PartnerReservationTypeKind;
  name: string;
  seats: number;
  quantity: number;
  price: number;
  minimum_consumption: number | null;
  extra_people_limit: number | null;
  extra_people_price: number | null;
  description: string;
  active: boolean;
}

const blankDraft = (kind: PartnerReservationTypeKind): DraftRow => ({
  kind,
  name: "",
  seats: kind === "box" ? 10 : kind === "bistro" ? 4 : 2,
  quantity: 1,
  price: 0,
  minimum_consumption: null,
  extra_people_limit: kind === "box" ? 4 : 0,
  extra_people_price: null,
  description: "",
  active: true,
});

const fromRow = (r: PartnerReservationType): DraftRow => ({
  id: r.id,
  kind: r.kind,
  name: r.name,
  seats: r.seats,
  quantity: r.quantity,
  price: Number(r.price),
  minimum_consumption: r.minimum_consumption,
  extra_people_limit: r.extra_people_limit,
  extra_people_price: r.extra_people_price,
  description: r.description ?? "",
  active: r.active,
});

export function ReservationTypesManager({
  partnerId,
  canEdit,
}: {
  partnerId: string;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<PartnerReservationType[]>([]);
  const [availability, setAvailability] = useState<
    Record<string, ReservationTypeAvailability>
  >({});
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<PartnerReservationTypeKind>("table");
  const [draft, setDraft] = useState<DraftRow | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const [rowsRes, availRes] = await Promise.all([
        listReservationTypes(partnerId),
        getReservationTypesAvailability(partnerId),
      ]);
      setRows(rowsRes);
      const map: Record<string, ReservationTypeAvailability> = {};
      for (const a of availRes) map[a.type_id] = a;
      setAvailability(map);
    } catch (err) {
      toast({ title: "Erro ao carregar tipos", description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  const byKind = useMemo(() => {
    const acc: Record<PartnerReservationTypeKind, PartnerReservationType[]> = {
      table: [],
      bistro: [],
      box: [],
    };
    for (const r of rows) acc[r.kind].push(r);
    return acc;
  }, [rows]);

  const handleSave = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast({ title: "Nome é obrigatório" });
      return;
    }
    setSaving(true);
    try {
      await upsertReservationType(partnerId, {
        id: draft.id,
        kind: draft.kind,
        name: draft.name,
        seats: draft.seats,
        quantity: draft.quantity,
        price: draft.price,
        minimum_consumption: draft.minimum_consumption,
        extra_people_limit: draft.extra_people_limit,
        extra_people_price: draft.extra_people_price,
        description: draft.description,
        active: draft.active,
      });
      toast({ title: "Tipo salvo" });
      setDraft(null);
      void load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: PartnerReservationType) => {
    if (!window.confirm(`Excluir "${r.name}"?`)) return;
    try {
      await deleteReservationType(r.id);
      toast({ title: "Tipo removido" });
      void load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    }
  };

  const renderEditor = () => {
    if (!draft) return null;
    return (
      <Card className="border-primary/40">
        <CardHeader>
          <CardTitle className="text-sm">
            {draft.id ? "Editar" : "Novo"} {KIND_LABELS[draft.kind]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder={
                  draft.kind === "table"
                    ? "Ex: Mesa 4 lugares"
                    : draft.kind === "bistro"
                      ? "Ex: Bistrô Lounge"
                      : "Ex: Camarote Premium"
                }
              />
            </div>
            <div>
              <Label className="text-xs">
                {draft.kind === "box" ? "Pessoas incluídas" : "Lugares / capacidade"}
              </Label>
              <NumberField
                min={1}
                value={draft.seats}
                onChange={(v) =>
                  setDraft({ ...draft, seats: Math.max(1, v || 1) })
                }
                fallback={1}
              />
            </div>
            <div>
              <Label className="text-xs">Quantidade disponível</Label>
              <NumberField
                min={1}
                value={draft.quantity}
                onChange={(v) =>
                  setDraft({ ...draft, quantity: Math.max(1, v || 1) })
                }
                fallback={1}
              />
            </div>
            <div>
              <Label className="text-xs">Valor (R$)</Label>
              <NumberField
                min={0}
                value={draft.price}
                onChange={(v) => setDraft({ ...draft, price: v })}
                allowDecimal
                fallback={0}
              />
            </div>
            {draft.kind === "table" ? (
              <div>
                <Label className="text-xs">Consumo mínimo (R$, opcional)</Label>
                <NumberField
                  min={0}
                  value={draft.minimum_consumption}
                  onChange={(v) =>
                    setDraft({ ...draft, minimum_consumption: v })
                  }
                  nullable
                  allowDecimal
                />
              </div>
            ) : null}
            {draft.kind === "box" ? (
              <>
                <div>
                  <Label className="text-xs">Limite de pessoas extras</Label>
                  <NumberField
                    min={0}
                    value={draft.extra_people_limit ?? 0}
                    onChange={(v) =>
                      setDraft({ ...draft, extra_people_limit: v })
                    }
                    fallback={0}
                  />
                </div>
                <div>
                  <Label className="text-xs">Valor por pessoa extra (R$)</Label>
                  <NumberField
                    min={0}
                    value={draft.extra_people_price}
                    onChange={(v) =>
                      setDraft({ ...draft, extra_people_price: v })
                    }
                    nullable
                    allowDecimal
                  />
                </div>
              </>
            ) : null}
          </div>
          <div>
            <Label className="text-xs">Descrição (opcional)</Label>
            <Textarea
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
              rows={2}
            />
          </div>

          {/* Datas por tipo — backend ainda não suporta, UI preparada. */}
          <div className="rounded-md border border-dashed border-border/60 p-3 text-xs">
            <div className="mb-1 flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-medium">Janela específica deste tipo</span>
              <Badge variant="outline" className="ml-auto text-[10px]">
                Em breve
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Em breve você poderá definir data/hora de início, término e
              fechamento automático individuais para cada{" "}
              {KIND_LABELS[draft.kind].slice(0, -1).toLowerCase()}. Hoje vale a
              janela global definida em Configurações.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.active}
                onCheckedChange={(v) => setDraft({ ...draft, active: v })}
              />
              <Label className="text-xs">Ativo</Label>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={() => setDraft(null)}
              disabled={saving}
              className="min-h-[44px] w-full"
            >
              <X className="mr-1 h-4 w-4" /> Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="min-h-[44px] w-full"
            >
              <Save className="mr-1 h-4 w-4" />
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderList = (kind: PartnerReservationTypeKind) => {
    const list = byKind[kind];
    if (loading && !list.length) {
      return <p className="text-sm text-muted-foreground py-4">Carregando…</p>;
    }
    if (!list.length) {
      return (
        <p className="text-sm text-muted-foreground py-4">
          Nenhum {KIND_LABELS[kind].toLowerCase()} cadastrado ainda.
        </p>
      );
    }
    return (
      <div className="grid gap-2">
        {list.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card/50 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium">{r.name}</p>
                {!r.active && (
                  <Badge variant="outline" className="text-[10px]">
                    inativo
                  </Badge>
                )}
                {(() => {
                  const a = availability[r.id];
                  if (!a) return null;
                  if (a.available <= 0)
                    return (
                      <Badge variant="destructive" className="text-[10px]">
                        Esgotado
                      </Badge>
                    );
                  return (
                    <Badge variant="secondary" className="text-[10px]">
                      {a.available} disp.
                    </Badge>
                  );
                })()}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {r.seats} {kind === "box" ? "pess." : "lug."} · R${" "}
                {Number(r.price).toFixed(2)}
                {r.minimum_consumption
                  ? ` · mín. R$ ${Number(r.minimum_consumption).toFixed(2)}`
                  : ""}
              </p>
              {(() => {
                const a = availability[r.id];
                if (!a) return null;
                return (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Total {a.quantity} · Reservadas {a.reserved} · Disponíveis{" "}
                    {a.available}
                  </p>
                );
              })()}
            </div>
            {canEdit && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDraft(fromRow(r))}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(r)}
                >
                  <Trash2 className="h-3 w-3 text-rose-500" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Tipos de reserva</CardTitle>
        {canEdit && !draft && (
          <Button
            size="sm"
            onClick={() => setDraft(blankDraft(tab))}
            className="min-h-[40px] shrink-0"
          >
            <Plus className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">
              Novo {KIND_LABELS[tab].slice(0, -1).toLowerCase()}
            </span>
            <span className="sm:hidden">Novo</span>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3 min-w-0">
        {renderEditor()}
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as PartnerReservationTypeKind)}
        >
          <div className="-mx-1 overflow-x-auto">
            <TabsList className="inline-flex w-max min-w-full justify-start flex-nowrap">
              <TabsTrigger value="table" className="shrink-0 whitespace-nowrap">
                <span className="sm:hidden">
                  {KIND_LABELS_MOBILE.table} ({byKind.table.length})
                </span>
                <span className="hidden sm:inline">
                  Mesas ({byKind.table.length})
                </span>
              </TabsTrigger>
              <TabsTrigger value="bistro" className="shrink-0 whitespace-nowrap">
                <span className="sm:hidden">
                  {KIND_LABELS_MOBILE.bistro} ({byKind.bistro.length})
                </span>
                <span className="hidden sm:inline">
                  Bistrôs ({byKind.bistro.length})
                </span>
              </TabsTrigger>
              <TabsTrigger value="box" className="shrink-0 whitespace-nowrap">
                <span className="sm:hidden">
                  {KIND_LABELS_MOBILE.box} ({byKind.box.length})
                </span>
                <span className="hidden sm:inline">
                  Camarotes ({byKind.box.length})
                </span>
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="table" className="mt-3">
            {renderList("table")}
          </TabsContent>
          <TabsContent value="bistro" className="mt-3">
            {renderList("bistro")}
          </TabsContent>
          <TabsContent value="box" className="mt-3">
            {renderList("box")}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default ReservationTypesManager;
