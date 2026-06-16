import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { revokePartnerPilot, type PilotTeamMember } from "../partnerPilotService";

interface Props {
  partnerId: string;
  team: PilotTeamMember[];
  onChange: () => void;
}

export default function PartnerPilotDangerZone({ partnerId, team, onChange }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const active = team.filter((m) => m.is_active || m.beta_enabled);

  const handleRevoke = async (userId: string) => {
    if (!window.confirm("Revogar acesso deste usuário ao piloto?")) return;
    setBusy(userId);
    try {
      await revokePartnerPilot(partnerId, userId);
      toast.success("Acesso revogado");
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao revogar");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
      <header className="text-sm font-semibold text-destructive">
        Zona de risco — revogar acesso
      </header>
      {active.length === 0 ? (
        <div className="text-xs text-muted-foreground">Nenhum acesso ativo para revogar.</div>
      ) : (
        <ul className="space-y-2">
          {active.map((m) => (
            <li key={m.partner_user_id} className="flex items-center justify-between gap-2">
              <div className="text-xs min-w-0 truncate">
                {m.email ?? m.user_id.slice(0, 8)}{" "}
                <span className="text-muted-foreground">· {m.role}</span>
              </div>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy === m.user_id}
                onClick={() => handleRevoke(m.user_id)}
              >
                Revogar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
