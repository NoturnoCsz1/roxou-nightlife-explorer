import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";

const REASONS = [
  "Motorista não corresponde ao cadastro",
  "Veículo diferente do informado",
  "Cobrança abusiva",
  "Assédio ou ameaça",
  "Comportamento inadequado",
  "Atraso excessivo",
  "Passageiro causou problema",
  "Tentativa de golpe",
  "Outro motivo",
];

interface Props {
  rideRequestId?: string | null;
  targetUserId?: string | null;
  reportType?: "passenger" | "driver";
  trigger?: React.ReactNode;
}

export default function ReportDialog({ rideRequestId, targetUserId, reportType = "driver", trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!reason) {
      toast.error("Selecione um motivo.");
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Entre para denunciar.");
        return;
      }
      const { error } = await supabase.from("driver_reports").insert({
        reporter_id: user.id,
        reported_user_id: targetUserId ?? null,
        ride_request_id: rideRequestId ?? null,
        report_type: reportType,
        reason,
        description: description.trim() || null,
        status: "pending",
      } as any);
      if (error) throw error;
      toast.success("Denúncia registrada. Nossa equipe vai analisar.");
      setOpen(false);
      setReason("");
      setDescription("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar denúncia");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex">
        {trigger ?? (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors">
            <Flag className="w-3 h-3" /> Denunciar
          </span>
        )}
      </button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Denunciar</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Motivo</Label>
            <div className="grid gap-1.5 max-h-[260px] overflow-y-auto">
              {REASONS.map((r) => (
                <label key={r} className={`flex items-start gap-2 text-sm rounded-lg border px-3 py-2 cursor-pointer ${reason === r ? "border-primary/60 bg-primary/10" : "border-border/40 bg-card/30"}`}>
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="mt-1 accent-primary"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Descrição (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="Conte o que aconteceu"
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar denúncia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
