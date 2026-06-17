import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type {
  PartnerReservationSettings,
  PartnerReservationSettingsPayload,
} from "../services/partnerReservations";

const toLocalInput = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromLocalInput = (v: string): string | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export function ReservationSettingsForm({
  initial,
  onSave,
  disabled,
}: {
  initial: PartnerReservationSettings | null;
  onSave: (p: PartnerReservationSettingsPayload) => Promise<void>;
  disabled?: boolean;
}) {
  const [enabled, setEnabled] = useState(initial?.reservations_enabled ?? false);
  const [maxPeople, setMaxPeople] = useState(
    initial?.max_people_per_reservation ?? 10,
  );
  const [maxPerDay, setMaxPerDay] = useState(
    initial?.max_reservations_per_day ?? 50,
  );
  const [advance, setAdvance] = useState(initial?.advance_booking_hours ?? 2);
  const [autoConfirm, setAutoConfirm] = useState(initial?.auto_confirm ?? false);
  const [startAt, setStartAt] = useState(toLocalInput(initial?.reservations_start_at ?? null));
  const [endAt, setEndAt] = useState(toLocalInput(initial?.reservations_end_at ?? null));
  const [timeout_, setTimeout_] = useState(initial?.confirmation_timeout_minutes ?? 30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setEnabled(initial.reservations_enabled);
    setMaxPeople(initial.max_people_per_reservation);
    setMaxPerDay(initial.max_reservations_per_day);
    setAdvance(initial.advance_booking_hours);
    setAutoConfirm(initial.auto_confirm);
    setStartAt(toLocalInput(initial.reservations_start_at));
    setEndAt(toLocalInput(initial.reservations_end_at));
    setTimeout_(initial.confirmation_timeout_minutes ?? 30);
  }, [initial]);

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({
        reservations_enabled: enabled,
        max_people_per_reservation: maxPeople,
        max_reservations_per_day: maxPerDay,
        advance_booking_hours: advance,
        auto_confirm: autoConfirm,
        reservations_start_at: fromLocalInput(startAt),
        reservations_end_at: fromLocalInput(endAt),
        confirmation_timeout_minutes: timeout_,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Configurações de reservas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Aceitar reservas</Label>
          <Switch checked={enabled} onCheckedChange={setEnabled} disabled={disabled} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Confirmar automaticamente</Label>
            <p className="text-[11px] text-muted-foreground">
              Se desligado, o cliente recebe prazo para confirmar/pagar.
            </p>
          </div>
          <Switch
            checked={autoConfirm}
            onCheckedChange={setAutoConfirm}
            disabled={disabled}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Início das reservas</Label>
            <Input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div>
            <Label className="text-xs">Término das reservas</Label>
            <Input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <Label className="text-xs">Máx. convidados / reserva</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={maxPeople}
              onChange={(e) => setMaxPeople(Number(e.target.value) || 1)}
              disabled={disabled}
            />
          </div>
          <div>
            <Label className="text-xs">Máx. reservas / dia</Label>
            <Input
              type="number"
              min={1}
              value={maxPerDay}
              onChange={(e) => setMaxPerDay(Number(e.target.value) || 1)}
              disabled={disabled}
            />
          </div>
          <div>
            <Label className="text-xs">Antecedência mínima (h)</Label>
            <Input
              type="number"
              min={0}
              value={advance}
              onChange={(e) => setAdvance(Number(e.target.value) || 0)}
              disabled={disabled}
            />
          </div>
          <div>
            <Label className="text-xs">Tempo p/ confirmar (min)</Label>
            <Input
              type="number"
              min={5}
              max={1440}
              value={timeout_}
              onChange={(e) => setTimeout_(Number(e.target.value) || 30)}
              disabled={disabled}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={disabled || saving}>
            {saving ? "Salvando…" : "Salvar configurações"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ReservationSettingsForm;
