import { useEffect, useMemo, useState } from "react";
import { Copy, Eye, EyeOff, Loader2, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  BDA_STATUS_LABEL,
  BdaAdminRegistration,
  adminGuardianLink,
  adminListAuditLogs,
  adminListRegistrations,
  adminRemovePublicPhoto,
  adminRevealCpf,
  adminRevokeConsent,
  adminSaveNote,
  adminSetRegistrationStatus,
} from "@/modules/bda/bdaService";

const STATUS_FILTERS = [
  "todas",
  "aguardando_responsavel",
  "aguardando_analise",
  "aprovada_privada",
  "aprovada_publica",
  "pendencia",
  "recusada",
  "cancelada",
];

const ACTIONS: Array<{ status: string; label: string }> = [
  { status: "aprovada_privada", label: "Aprovar (privada)" },
  { status: "aprovada_publica", label: "Publicar" },
  { status: "pendencia", label: "Marcar pendência" },
  { status: "recusada", label: "Recusar" },
  { status: "cancelada", label: "Cancelar" },
];

export default function AdminBdaRegistrations() {
  const [regs, setRegs] = useState<BdaAdminRegistration[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todas");
  const [busy, setBusy] = useState<string | null>(null);
  const [cpfs, setCpfs] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"inscricoes" | "auditoria">("inscricoes");

  async function load() {
    setLoading(true);
    try {
      const [r, l] = await Promise.all([adminListRegistrations(), adminListAuditLogs()]);
      setRegs(r);
      setLogs(l);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => regs.filter((r) => filter === "todas" || r.status === filter),
    [regs, filter],
  );

  async function run(key: string, fn: () => Promise<unknown>, okMsg?: string) {
    setBusy(key);
    try {
      await fn();
      if (okMsg) toast.success(okMsg);
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function reveal(guardianId: string) {
    setBusy(guardianId);
    try {
      const { cpf } = await adminRevealCpf(guardianId);
      setCpfs((prev) => ({ ...prev, [guardianId]: cpf }));
      toast.info("Consulta registrada em auditoria.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function guardianLink(guardianId: string) {
    setBusy(guardianId);
    try {
      const { token } = await adminGuardianLink(guardianId);
      const url = `${window.location.origin}/batalhadeaura/confirmacao?token=${token}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Link de autorização copiado (envio por e-mail ainda não integrado).");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-black">Batalha de Aura — Inscrições</h1>
          <p className="text-xs text-muted-foreground">
            Moderação obrigatória. Nenhum participante é publicado automaticamente.
          </p>
        </div>
        <button onClick={load} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/40 px-4 text-xs">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      <div className="flex gap-2">
        {(["inscricoes", "auditoria"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`h-9 rounded-xl px-4 text-xs font-bold ${
              tab === t ? "bg-primary text-primary-foreground" : "border border-border/40 text-muted-foreground"
            }`}
          >
            {t === "inscricoes" ? "Inscrições" : "Auditoria"}
          </button>
        ))}
      </div>

      {tab === "auditoria" ? (
        <div className="rounded-2xl border border-border/40 bg-card/40 p-4">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro de auditoria.</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {logs.map((l) => (
                <li key={l.id} className="rounded-lg border border-border/30 p-3">
                  <span className="font-bold text-foreground">{l.action}</span>{" "}
                  <span className="text-muted-foreground">
                    · {new Date(l.created_at).toLocaleString("pt-BR")} · alvo {l.target_type}/{l.target_id}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`h-8 rounded-full px-3 text-[11px] font-bold ${
                  filter === s ? "bg-primary text-primary-foreground" : "border border-border/40 text-muted-foreground"
                }`}
              >
                {s === "todas" ? "Todas" : BDA_STATUS_LABEL[s] ?? s}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma inscrição neste filtro.</p>
          ) : (
            <div className="space-y-4">
              {filtered.map((r) => (
                <div key={r.id} className="rounded-2xl border border-border/40 bg-card/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {r.category === "dupla" ? `Dupla${r.team_name ? ` — ${r.team_name}` : ""}` : "Solo"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {BDA_STATUS_LABEL[r.status] ?? r.status} ·{" "}
                        {new Date(r.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ACTIONS.map((a) => (
                        <button
                          key={a.status}
                          disabled={busy === r.id || r.status === a.status}
                          onClick={() =>
                            run(r.id, () => adminSetRegistrationStatus(r.id, a.status), "Status atualizado.")
                          }
                          className="h-8 rounded-lg border border-border/40 px-3 text-[11px] disabled:opacity-40"
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 space-y-3">
                    {r.participants.map((p: any) => (
                      <div key={p.id} className="rounded-xl border border-border/30 p-3">
                        <p className="text-xs font-bold text-foreground">
                          #{p.slot} {p.public_name}{" "}
                          {p.is_minor && (
                            <span className="ml-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-500">
                              menor de idade
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {p.full_name} · {p.email} · {p.phone} · {p.city || "—"}
                        </p>

                        {p.photo_public_path && (
                          <button
                            disabled={busy === p.id}
                            onClick={() => run(p.id, () => adminRemovePublicPhoto(p.id), "Foto pública removida.")}
                            className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-destructive/40 px-3 text-[11px] text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remover foto pública
                          </button>
                        )}

                        {p.guardian && (
                          <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
                            <p className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" /> Responsável:{" "}
                              {p.guardian.full_name}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {p.guardian.email} · {p.guardian.phone} · {p.guardian.relationship}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              CPF: {cpfs[p.guardian.id] ?? p.guardian.cpf_masked}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {p.guardian.confirmed_at
                                ? `Autorizado em ${new Date(p.guardian.confirmed_at).toLocaleString("pt-BR")}`
                                : p.guardian.refused_at
                                  ? "Autorização recusada"
                                  : "Aguardando autorização"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <button
                                disabled={busy === p.guardian.id}
                                onClick={() => reveal(p.guardian.id)}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/40 px-3 text-[11px]"
                              >
                                {cpfs[p.guardian.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                Revelar CPF
                              </button>
                              <button
                                disabled={busy === p.guardian.id}
                                onClick={() => guardianLink(p.guardian.id)}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/40 px-3 text-[11px]"
                              >
                                <Copy className="h-3.5 w-3.5" /> Gerar link de autorização
                              </button>
                            </div>
                          </div>
                        )}

                        {!!p.consents?.length && (
                          <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                            {p.consents.map((c: any) => (
                              <li key={c.id} className="flex items-center justify-between gap-2">
                                <span>
                                  {c.consent_key} — {c.revoked_at ? "revogado" : c.granted ? "concedido" : "negado"} (
                                  {c.terms_version})
                                </span>
                                {c.granted && !c.revoked_at && (
                                  <button
                                    disabled={busy === c.id}
                                    onClick={() => run(c.id, () => adminRevokeConsent(c.id), "Consentimento revogado.")}
                                    className="h-7 rounded-md border border-border/40 px-2 text-[10px]"
                                  >
                                    Revogar
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <input
                      className="flex-1 rounded-lg border border-border/40 bg-background px-3 py-2 text-xs"
                      placeholder="Nota interna"
                      value={notes[r.id] ?? r.admin_notes ?? ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    />
                    <button
                      disabled={busy === r.id}
                      onClick={() => run(r.id, () => adminSaveNote(r.id, notes[r.id] ?? ""), "Nota salva.")}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground"
                    >
                      {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Salvar nota
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
