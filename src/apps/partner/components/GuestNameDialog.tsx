/**
 * GuestNameDialog — substitui window.prompt() para criar reserva rápida.
 * Mobile-first, botões 44px, fecha por ESC e clique externo.
 */
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface QuickReservationValues {
  name: string;
  reservation_date: string; // ISO
  people_count: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (values: QuickReservationValues) => Promise<void> | void;
}

function defaultLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function GuestNameDialog({ open, onOpenChange, onConfirm }: Props) {
  const [name, setName] = useState("");
  const [when, setWhen] = useState(defaultLocal());
  const [people, setPeople] = useState(2);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setWhen(defaultLocal());
      setPeople(2);
      setBusy(false);
    }
  }, [open]);

  const submit = async () => {
    if (!name.trim() || !when) return;
    setBusy(true);
    try {
      await onConfirm({
        name: name.trim(),
        reservation_date: new Date(when).toISOString(),
        people_count: Math.max(1, Number(people) || 1),
      });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md">
        <DialogHeader>
          <DialogTitle>Nova reserva</DialogTitle>
          <DialogDescription>
            Cadastro rápido manual. O cliente pode confirmar online depois.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="guest-name">Nome do convidado</Label>
            <Input
              id="guest-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: João Silva"
              className="min-h-[44px]"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="guest-when">Data e hora</Label>
              <Input
                id="guest-when"
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guest-people">Pessoas</Label>
              <Input
                id="guest-people"
                type="number"
                min={1}
                max={50}
                value={people}
                onChange={(e) => setPeople(Number(e.target.value))}
                className="min-h-[44px]"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="min-h-[44px]"
            disabled={busy}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !name.trim() || !when}
            className="min-h-[44px]"
          >
            {busy ? "Criando…" : "Criar reserva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default GuestNameDialog;
