/**
 * PartnerAccessRequests — Admin.
 * Abas:
 *   1. CRM Partner Pro (prospects públicos via /solicitar-acesso) — gestão completa
 *   2. Vínculos a partners (usuários logados pedindo acesso a partner existente)
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  approveAccessRequest,
  listAllAccessRequests,
  rejectAccessRequest,
  type PartnerAccessRequestAdminRow,
  type PartnerAccessRequestStatus,
} from "@/apps/partner/services/partnerAccessRequests";
import PartnerProCrmPage from "@/apps/admin/partnerProCrm/PartnerProCrmPage";

type Tab = "crm" | "vinculos";

const STATUS_FILTERS: Array<{ label: string; value: PartnerAccessRequestStatus | "all" }> = [
  { label: "Pendentes", value: "pending" },
  { label: "Aprovadas", value: "approved" },
  { label: "Recusadas", value: "rejected" },
  { label: "Canceladas", value: "cancelled" },
  { label: "Todas", value: "all" },
];

const PartnerAccessRequests = () => {
  const [tab, setTab] = useState<Tab>("crm");
  const [filter, setFilter] = useState<PartnerAccessRequestStatus | "all">("pending");
  const [rows, setRows] = useState<PartnerAccessRequestAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadVinculos = async () => {
    setLoading(true);
    try {
      const data = await listAllAccessRequests(filter === "all" ? undefined : filter);
      setRows(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "vinculos") void loadVinculos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filter]);

  const handleVinculo = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    try {
      if (action === "approve") {
        await approveAccessRequest(id);
        toast.success("Solicitação aprovada");
      } else {
        await rejectAccessRequest(id);
        toast.success("Solicitação recusada");
      }
      await loadVinculos();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border/40">
        <button
          type="button"
          onClick={() => setTab("crm")}
          className={`px-3 py-1.5 text-sm border-b-2 -mb-px ${
            tab === "crm"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          CRM Partner Pro
        </button>
        <button
          type="button"
          onClick={() => setTab("vinculos")}
          className={`px-3 py-1.5 text-sm border-b-2 -mb-px ${
            tab === "vinculos"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Vínculos a partners
        </button>
      </div>

      {tab === "crm" ? (
        <PartnerProCrmPage />
      ) : (
        <>
          <div className="flex flex-wrap gap-1">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setFilter(s.value)}
                className={`rounded-md px-2.5 py-1 text-xs ${
                  filter === s.value
                    ? "bg-primary/20 text-primary"
                    : "bg-secondary/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma solicitação.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <article
                  key={r.id}
                  className="rounded-xl border border-border/40 bg-card/50 p-3 space-y-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {r.partner?.name ?? "(estabelecimento removido)"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[r.partner?.city, r.partner?.instagram].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] uppercase tracking-wider rounded px-2 py-0.5 ${
                        r.status === "pending"
                          ? "bg-amber-500/15 text-amber-300"
                          : r.status === "approved"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : r.status === "rejected"
                              ? "bg-red-500/15 text-red-300"
                              : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Nome</dt>
                      <dd>{r.requested_name ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">E-mail</dt>
                      <dd className="truncate">{r.requested_email ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Telefone</dt>
                      <dd>{r.requested_phone ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Data</dt>
                      <dd>{new Date(r.created_at).toLocaleString("pt-BR")}</dd>
                    </div>
                    {r.message && (
                      <div className="sm:col-span-2">
                        <dt className="text-muted-foreground">Mensagem</dt>
                        <dd className="italic">"{r.message}"</dd>
                      </div>
                    )}
                  </dl>

                  {r.status === "pending" && (
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === r.id}
                        onClick={() => handleVinculo(r.id, "reject")}
                      >
                        Recusar
                      </Button>
                      <Button
                        size="sm"
                        disabled={busyId === r.id}
                        onClick={() => handleVinculo(r.id, "approve")}
                      >
                        Aprovar
                      </Button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PartnerAccessRequests;
