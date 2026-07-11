import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NumberField } from "./NumberField";
import type {
  DepositType,
  PartnerReservationSettings,
  PartnerReservationSettingsPayload,
} from "@modules/partner/reservations";

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
  const [slotInterval, setSlotInterval] = useState(
    initial?.slot_interval_minutes ?? 30,
  );
  const [defaultDuration, setDefaultDuration] = useState(
    initial?.default_reservation_duration_minutes ?? 90,
  );
  const [openTime, setOpenTime] = useState(
    (initial?.daily_open_time ?? "18:00").slice(0, 5),
  );
  const [closeTime, setCloseTime] = useState(
    (initial?.daily_close_time ?? "23:30").slice(0, 5),
  );
  const [depositEnabled, setDepositEnabled] = useState(
    initial?.deposit_enabled ?? false,
  );
  const [depositType, setDepositType] = useState<DepositType>(
    initial?.deposit_type ?? "fixed",
  );
  const [depositValue, setDepositValue] = useState(initial?.deposit_value ?? 0);
  const [pixKey, setPixKey] = useState(initial?.pix_key ?? "");
  const [pixReceiver, setPixReceiver] = useState(
    initial?.pix_receiver_name ?? "",
  );
  const [payInstructions, setPayInstructions] = useState(
    initial?.payment_instructions ?? "",
  );
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
    setSlotInterval(initial.slot_interval_minutes ?? 30);
    setDefaultDuration(initial.default_reservation_duration_minutes ?? 90);
    setOpenTime((initial.daily_open_time ?? "18:00").slice(0, 5));
    setCloseTime((initial.daily_close_time ?? "23:30").slice(0, 5));
    setDepositEnabled(initial.deposit_enabled ?? false);
    setDepositType((initial.deposit_type ?? "fixed") as DepositType);
    setDepositValue(initial.deposit_value ?? 0);
    setPixKey(initial.pix_key ?? "");
    setPixReceiver(initial.pix_receiver_name ?? "");
    setPayInstructions(initial.payment_instructions ?? "");
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
        deposit_enabled: depositEnabled,
        deposit_type: depositType,
        deposit_value: depositValue,
        payment_instructions: payInstructions || null,
        pix_key: pixKey || null,
        pix_receiver_name: pixReceiver || null,
        slot_interval_minutes: slotInterval,
        default_reservation_duration_minutes: defaultDuration,
        daily_open_time: openTime,
        daily_close_time: closeTime,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">Configurações de reservas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-2 rounded-md border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between">
          <Label className="text-sm">Aceitar reservas</Label>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-2 rounded-md border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Label className="text-sm">Confirmar automaticamente</Label>
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
              className="w-full"
            />
          </div>
          <div>
            <Label className="text-xs">Término das reservas</Label>
            <Input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              disabled={disabled}
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-xs">Máx. convidados / reserva</Label>
            <NumberField
              min={1}
              max={50}
              value={maxPeople}
              onChange={(v) => setMaxPeople(Math.max(1, v || 1))}
              fallback={1}
              disabled={disabled}
            />
          </div>
          <div>
            <Label className="text-xs">Máx. reservas / dia</Label>
            <NumberField
              min={1}
              value={maxPerDay}
              onChange={(v) => setMaxPerDay(Math.max(1, v || 1))}
              fallback={1}
              disabled={disabled}
            />
          </div>
          <div>
            <Label className="text-xs">Antecedência mínima (h)</Label>
            <NumberField
              min={0}
              value={advance}
              onChange={(v) => setAdvance(Math.max(0, v))}
              fallback={0}
              disabled={disabled}
            />
          </div>
          <div>
            <Label className="text-xs">Tempo p/ confirmar (min)</Label>
            <NumberField
              min={5}
              max={1440}
              value={timeout_}
              onChange={(v) => setTimeout_(Math.max(5, v || 30))}
              fallback={30}
              disabled={disabled}
            />
          </div>
        </div>

        {/* Horários e duração */}
        <div className="space-y-3 rounded-md border border-border/60 p-3">
          <div>
            <Label className="text-sm">Horários e duração</Label>
            <p className="text-[11px] text-muted-foreground">
              Define a grade de horários disponíveis e quanto tempo cada reserva
              bloqueia a mesa.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="text-xs">Abre às</Label>
              <Input
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                disabled={disabled}
              />
            </div>
            <div>
              <Label className="text-xs">Fecha às</Label>
              <Input
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                disabled={disabled}
              />
            </div>
            <div>
              <Label className="text-xs">Intervalo dos slots</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={slotInterval}
                onChange={(e) => setSlotInterval(Number(e.target.value))}
                disabled={disabled}
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Duração padrão</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(Number(e.target.value))}
                disabled={disabled}
              >
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
                <option value={120}>120 min</option>
                <option value={180}>180 min</option>
                <option value={240}>240 min</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sinal / Pagamento */}
        <div className="space-y-3 rounded-md border border-border/60 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <Label className="text-sm">Exigir sinal para reservar</Label>
              <p className="text-[11px] text-muted-foreground">
                Base pronta para PIX automático (manual nesta versão).
              </p>
            </div>
            <Switch
              checked={depositEnabled}
              onCheckedChange={setDepositEnabled}
              disabled={disabled}
            />
          </div>
          {depositEnabled && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Tipo de sinal</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={depositType}
                    onChange={(e) =>
                      setDepositType(e.target.value as DepositType)
                    }
                    disabled={disabled}
                  >
                    <option value="fixed">Valor fixo (R$)</option>
                    <option value="percent">Percentual (%)</option>
                    <option value="full">Valor total</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">
                    {depositType === "percent" ? "Percentual (%)" : "Valor (R$)"}
                  </Label>
                  <NumberField
                    min={0}
                    value={depositValue}
                    onChange={(v) => setDepositValue(v)}
                    allowDecimal
                    fallback={0}
                    disabled={disabled || depositType === "full"}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Chave PIX</Label>
                  <Input
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="CNPJ, e-mail, telefone ou chave aleatória"
                    disabled={disabled}
                  />
                </div>
                <div>
                  <Label className="text-xs">Nome do recebedor</Label>
                  <Input
                    value={pixReceiver}
                    onChange={(e) => setPixReceiver(e.target.value)}
                    disabled={disabled}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Instruções de pagamento</Label>
                <Textarea
                  value={payInstructions}
                  onChange={(e) => setPayInstructions(e.target.value)}
                  rows={2}
                  placeholder="Ex: Envie o comprovante pelo WhatsApp após o pagamento."
                  disabled={disabled}
                />
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="hidden sm:block" />
          <Button
            onClick={submit}
            disabled={disabled || saving}
            className="min-h-[48px] w-full"
          >
            {saving ? "Salvando…" : "Salvar configurações"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ReservationSettingsForm;
