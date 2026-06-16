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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setEnabled(initial.reservations_enabled);
    setMaxPeople(initial.max_people_per_reservation);
    setMaxPerDay(initial.max_reservations_per_day);
    setAdvance(initial.advance_booking_hours);
    setAutoConfirm(initial.auto_confirm);
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
          <Label>Confirmar automaticamente</Label>
          <Switch
            checked={autoConfirm}
            onCheckedChange={setAutoConfirm}
            disabled={disabled}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
