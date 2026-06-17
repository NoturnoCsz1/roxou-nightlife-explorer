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
              <Input
                type="number"
                min={1}
                value={draft.seats}
                onChange={(e) =>
                  setDraft({ ...draft, seats: Number(e.target.value) || 1 })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Quantidade disponível</Label>
              <Input
                type="number"
                min={1}
                value={draft.quantity}
                onChange={(e) =>
                  setDraft({ ...draft, quantity: Number(e.target.value) || 1 })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Valor (R$)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={draft.price}
                onChange={(e) =>
                  setDraft({ ...draft, price: Number(e.target.value) || 0 })
                }
              />
            </div>
            {draft.kind === "table" ? (
              <div>
                <Label className="text-xs">Consumo mínimo (R$, opcional)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.minimum_consumption ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      minimum_consumption: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                />
              </div>
            ) : null}
            {draft.kind === "box" ? (
              <>
                <div>
                  <Label className="text-xs">Limite de pessoas extras</Label>
                  <Input
                    type="number"
                    min={0}
                    value={draft.extra_people_limit ?? 0}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        extra_people_limit: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Valor por pessoa extra (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={draft.extra_people_price ?? ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        extra_people_price: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.active}
                onCheckedChange={(v) => setDraft({ ...draft, active: v })}
              />
              <Label className="text-xs">Ativo</Label>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDraft(null)}
                disabled={saving}
              >
                <X className="mr-1 h-3 w-3" /> Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="mr-1 h-3 w-3" />
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </div>
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Tipos de reserva</CardTitle>
        {canEdit && !draft && (
          <Button size="sm" onClick={() => setDraft(blankDraft(tab))}>
            <Plus className="mr-1 h-3 w-3" />
            Novo {KIND_LABELS[tab].slice(0, -1).toLowerCase()}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {renderEditor()}
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as PartnerReservationTypeKind)}
        >
          <TabsList>
            <TabsTrigger value="table">Mesas ({byKind.table.length})</TabsTrigger>
            <TabsTrigger value="bistro">Bistrôs ({byKind.bistro.length})</TabsTrigger>
            <TabsTrigger value="box">Camarotes ({byKind.box.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="table" className="mt-3">{renderList("table")}</TabsContent>
          <TabsContent value="bistro" className="mt-3">{renderList("bistro")}</TabsContent>
          <TabsContent value="box" className="mt-3">{renderList("box")}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default ReservationTypesManager;
