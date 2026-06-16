import type { PilotStatus, PilotTeamMember } from "../partnerPilotService";

interface Props {
  status: PilotStatus | null;
  team: PilotTeamMember[];
}

function fmt(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  } catch {
    return d;
  }
}

export default function PartnerPilotAccessStatus({ status, team }: Props) {
  const sub = status?.subscription;
  return (
    <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
      <header className="text-sm font-semibold">Status do piloto</header>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Pill label="Time ativo" value={String(status?.active_team ?? 0)} />
        <Pill label="Beta ativo" value={String(status?.active_beta ?? 0)} />
        <Pill
          label="Plano"
          value={sub ? `${sub.plan} · ${sub.status}` : "sem plano"}
        />
        <Pill label="Último acesso" value={fmt(status?.last_sign_in_at ?? null)} />
      </div>

      <div className="border-t border-border/30 pt-3">
        <div className="text-xs font-semibold mb-2">Membros vinculados</div>
        {team.length === 0 ? (
          <div className="text-xs text-muted-foreground">Nenhum usuário vinculado ainda.</div>
        ) : (
          <ul className="space-y-1.5">
            {team.map((m) => (
              <li
                key={m.partner_user_id}
                className="flex items-center justify-between text-xs gap-2"
              >
                <div className="min-w-0">
                  <div className="truncate">{m.email ?? m.user_id.slice(0, 8)}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {m.role} · último login {fmt(m.last_sign_in_at)}
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    m.is_active && m.beta_enabled
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {m.is_active && m.beta_enabled ? "ativo" : "revogado"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/30 px-2 py-1.5">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-sm font-medium truncate">{value}</div>
    </div>
  );
}
