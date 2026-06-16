import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  findUserByEmail,
  linkPartnerPilot,
  upsertPartnerSubscription,
  type PilotUserLookup,
} from "../partnerPilotService";

interface Props {
  partnerId: string;
  onLinked: () => void;
}

const ROLES = ["owner", "admin", "editor", "attendant"] as const;
const PLANS = ["free", "pro", "premium", "enterprise"] as const;
const STATUSES = ["trial", "active", "past_due", "canceled", "expired"] as const;

export default function PartnerPilotInviteForm({ partnerId, onLinked }: Props) {
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<PilotUserLookup | null>(null);
  const [role, setRole] = useState<(typeof ROLES)[number]>("owner");
  const [plan, setPlan] = useState<(typeof PLANS)[number]>("pro");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("trial");
  const [busy, setBusy] = useState(false);

  const handleLookup = async () => {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const u = await findUserByEmail(email);
      if (!u) {
        toast.error("Usuário não encontrado. Peça para fazer login antes.");
        setUser(null);
      } else {
        setUser(u);
        toast.success("Usuário encontrado");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na busca");
    } finally {
      setBusy(false);
    }
  };

  const handleLink = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await linkPartnerPilot(partnerId, user.user_id, role);
      await upsertPartnerSubscription(partnerId, plan, status);
      toast.success("Acesso liberado para o piloto");
      setEmail("");
      setUser(null);
      onLinked();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao vincular");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
      <header className="text-sm font-semibold">Vincular usuário ao piloto</header>
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="email do parceiro (já cadastrado)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button onClick={handleLookup} disabled={busy || !email.trim()} variant="secondary">
          Buscar
        </Button>
      </div>

      {user && (
        <div className="rounded-md bg-muted/30 p-3 text-xs space-y-1">
          <div>
            <span className="text-muted-foreground">Usuário:</span> {user.email}
          </div>
          <div className="text-[11px] text-muted-foreground">
            id {user.user_id.slice(0, 8)}… · criado{" "}
            {new Date(user.created_at).toLocaleDateString("pt-BR")}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-xs">
        <label className="space-y-1">
          <span className="text-muted-foreground">Papel</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="w-full bg-background border border-border/40 rounded-md px-2 py-1.5"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground">Plano</span>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as typeof plan)}
            className="w-full bg-background border border-border/40 rounded-md px-2 py-1.5"
          >
            {PLANS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="w-full bg-background border border-border/40 rounded-md px-2 py-1.5"
          >
            {STATUSES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Button onClick={handleLink} disabled={!user || busy} className="w-full">
        Liberar acesso ao piloto
      </Button>
    </div>
  );
}
