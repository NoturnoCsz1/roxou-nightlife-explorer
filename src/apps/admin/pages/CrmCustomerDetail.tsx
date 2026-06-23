import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  listCrmAuditLogs,
  listCrmConsents,
  listCrmLinks,
  revealCustomerField,
  type CrmAuditLog,
  type CrmConsent,
  type CrmCustomer,
  type CrmLink,
} from "@/services/crm";
import {
  computeSummary,
  fetchEntityMap,
  rankEvents,
  rankPartners,
  sourceLabel,
  statusBadgeVariant,
  type EntityMap,
} from "@/services/crm360";
import { maskCpf, maskEmail, maskPhone } from "@/lib/pii";
import { toast } from "sonner";

const TIMELINE_PAGE = 15;

export default function CrmCustomerDetail() {
  const { id = "" } = useParams();
  const [customer, setCustomer] = useState<CrmCustomer | null>(null);
  const [links, setLinks] = useState<CrmLink[]>([]);
  const [entityMap, setEntityMap] = useState<EntityMap>({
    events: new Map(),
    partners: new Map(),
  });
  const [consents, setConsents] = useState<CrmConsent[]>([]);
  const [audit, setAudit] = useState<CrmAuditLog[]>([]);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [timelineLimit, setTimelineLimit] = useState(TIMELINE_PAGE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("crm_customers")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      setCustomer((data as CrmCustomer) ?? null);
      const [l, c, a] = await Promise.all([
        listCrmLinks(id),
        listCrmConsents(id),
        listCrmAuditLogs(id),
      ]);
      setLinks(l);
      setConsents(c);
      setAudit(a);
      setEntityMap(await fetchEntityMap(l));
      setLoading(false);
    })();
  }, [id]);

  const summary = useMemo(() => computeSummary(links), [links]);
  const topEvents = useMemo(() => rankEvents(links, entityMap).slice(0, 8), [links, entityMap]);
  const topPartners = useMemo(
    () => rankPartners(links, entityMap).slice(0, 8),
    [links, entityMap],
  );

  async function reveal(field: "phone" | "email" | "cpf_hash") {
    const v = await revealCustomerField(id, field);
    if (v) {
      setRevealed((r) => ({ ...r, [field]: v }));
      toast.success("Dado revelado e registrado em auditoria.");
      setAudit(await listCrmAuditLogs(id));
    } else {
      toast.error("Sem permissão para revelar.");
    }
  }

  if (loading && !customer)
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Carregando…{" "}
        <Link to="/admin/crm" className="underline">
          voltar
        </Link>
      </div>
    );
  if (!customer)
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Cliente não encontrado.{" "}
        <Link to="/admin/crm" className="underline">
          voltar
        </Link>
      </div>
    );

  return (
    <div className="space-y-4 p-4">
      <Link to="/admin/crm" className="text-xs text-muted-foreground hover:underline">
        ← CRM
      </Link>

      {/* Header */}
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{customer.full_name ?? "Sem nome"}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Cidade: {customer.city ?? "—"}</span>
              <span>•</span>
              <span>Origem: {sourceLabel(customer.source ?? "—")}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase text-muted-foreground">Score</div>
            <div className="text-2xl font-bold">{summary.score}</div>
            <Badge variant={statusBadgeVariant(summary.status)}>{summary.status}</Badge>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
          <FieldReveal
            label="Telefone"
            masked={maskPhone(customer.phone)}
            full={revealed.phone}
            onReveal={() => reveal("phone")}
          />
          <FieldReveal
            label="E-mail"
            masked={maskEmail(customer.email)}
            full={revealed.email}
            onReveal={() => reveal("email")}
          />
          <FieldReveal
            label="CPF"
            masked={maskCpf(customer.cpf_hash)}
            full={revealed.cpf_hash}
            onReveal={() => reveal("cpf_hash")}
          />
        </div>
      </Card>

      {/* Resumo geral */}
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold">Resumo</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <SummaryStat label="Reservas" value={summary.counts.reservation ?? 0} />
          <SummaryStat label="Listas VIP" value={summary.counts.vip_list ?? 0} />
          <SummaryStat label="Excursões" value={summary.counts.excursion ?? 0} />
          <SummaryStat label="Check-ins" value={summary.counts.checkin ?? 0} />
          <SummaryStat label="Caronas" value={summary.counts.ride ?? 0} />
          <SummaryStat label="Interações" value={summary.totalInteractions} highlight />
        </div>
      </Card>

      {/* Origem / Última atividade */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Primeira origem</div>
          {summary.firstOrigin ? (
            <>
              <div className="mt-1 text-lg font-semibold">
                {sourceLabel(summary.firstOrigin.source_type)}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(summary.firstOrigin.created_at).toLocaleDateString("pt-BR")}
              </div>
            </>
          ) : (
            <div className="mt-1 text-sm text-muted-foreground">—</div>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Última atividade</div>
          {summary.lastActivity ? (
            <>
              <div className="mt-1 text-lg font-semibold">
                {sourceLabel(summary.lastActivity.source_type)}
              </div>
              <div className="text-xs text-muted-foreground">
                {relativeTime(summary.lastActivity.created_at)}
              </div>
            </>
          ) : (
            <div className="mt-1 text-sm text-muted-foreground">—</div>
          )}
        </Card>
      </div>

      {/* Top eventos e parceiros */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold">Eventos frequentados</h2>
          <RankList items={topEvents} unit="visita" />
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold">Parceiros visitados</h2>
          <RankList items={topPartners} unit="visita" />
        </Card>
      </div>

      {/* Timeline */}
      <Card className="p-4">
        <h2 className="mb-2 text-sm font-semibold">Timeline ({links.length})</h2>
        <div className="space-y-1 text-xs">
          {links.slice(0, timelineLimit).map((l) => {
            const evt = l.event_id ? entityMap.events.get(l.event_id) : null;
            const ptn = l.partner_id ? entityMap.partners.get(l.partner_id) : null;
            return (
              <div key={l.id} className="flex items-center justify-between border-b py-1.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{sourceLabel(l.source_type)}</Badge>
                    <span className="truncate font-medium">{evt?.title ?? ptn?.name ?? "—"}</span>
                  </div>
                  {ptn && evt ? (
                    <div className="mt-0.5 truncate text-muted-foreground">{ptn.name}</div>
                  ) : null}
                </div>
                <span className="ml-2 shrink-0 text-muted-foreground">
                  {new Date(l.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            );
          })}
          {links.length === 0 && <div className="text-muted-foreground">Sem histórico ainda.</div>}
        </div>
        {timelineLimit < links.length && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setTimelineLimit((n) => n + TIMELINE_PAGE)}
          >
            Carregar mais ({links.length - timelineLimit} restantes)
          </Button>
        )}
      </Card>

      {/* Consentimentos */}
      <Card className="p-4">
        <h2 className="mb-2 text-sm font-semibold">Consentimentos</h2>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {(["whatsapp", "email", "push", "analytics"] as const).map((ch) => {
            const c = consents.find((x) => x.channel === ch);
            const state = !c
              ? { label: "Nunca", variant: "outline" as const }
              : c.revoked_at
                ? { label: "Revogado", variant: "outline" as const }
                : { label: "Ativo", variant: "default" as const };
            return (
              <div key={ch} className="rounded-md border p-2">
                <div className="text-[10px] uppercase text-muted-foreground">{ch}</div>
                <Badge variant={state.variant} className="mt-1">
                  {state.label}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Auditoria */}
      <Card className="p-4">
        <h2 className="mb-2 text-sm font-semibold">Auditoria</h2>
        <div className="space-y-1 text-xs">
          {audit.map((a) => (
            <div key={a.id} className="flex justify-between border-b py-1">
              <span>
                {a.action}
                {a.field ? ` • ${a.field}` : ""}
              </span>
              <span className="text-muted-foreground">
                {new Date(a.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
          ))}
          {audit.length === 0 && <div className="text-muted-foreground">Sem registros.</div>}
        </div>
      </Card>
    </div>
  );
}

function FieldReveal({
  label,
  masked,
  full,
  onReveal,
}: {
  label: string;
  masked: string;
  full?: string;
  onReveal: () => void;
}) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono">{full ?? masked}</div>
      {!full && (
        <Button size="sm" variant="link" className="px-0" onClick={onReveal}>
          ver completo
        </Button>
      )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-2 ${highlight ? "bg-primary/5 border-primary/30" : ""}`}
    >
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function RankList({ items, unit }: { items: { id: string; label: string; count: number }[]; unit: string }) {
  if (items.length === 0)
    return <div className="text-xs text-muted-foreground">Sem registros.</div>;
  return (
    <div className="space-y-1 text-xs">
      {items.map((it) => (
        <div key={it.id} className="flex items-center justify-between border-b py-1">
          <span className="truncate pr-2">{it.label}</span>
          <Badge variant="secondary">
            {it.count} {unit}
            {it.count > 1 ? "s" : ""}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} ${months === 1 ? "mês" : "meses"}`;
  return new Date(iso).toLocaleDateString("pt-BR");
}
