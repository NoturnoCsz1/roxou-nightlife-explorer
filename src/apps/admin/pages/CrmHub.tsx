import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listCrmCustomers, type CrmCustomer } from "@/services/crm";
import { maskEmail, maskPhone } from "@/shared/utils/pii";
import { supabase } from "@/integrations/supabase/client";
import {
  computeSummary,
  fetchEntityMap,
  rankEvents,
  rankPartners,
  sourceLabel,
  type EntityMap,
} from "@/services/crm360";

const SOURCES = ["", "reservation", "vip_list", "excursion", "ride", "checkin"];
const LINK_FETCH_LIMIT = 2000;

interface AggLink {
  id: string;
  customer_id: string;
  partner_id: string | null;
  event_id: string | null;
  source_type: string;
  source_id: string | null;
  created_at: string;
}

export default function CrmHub() {
  const [rows, setRows] = useState<CrmCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");

  const [allLinks, setAllLinks] = useState<AggLink[]>([]);
  const [entityMap, setEntityMap] = useState<EntityMap>({
    events: new Map(),
    partners: new Map(),
  });

  useEffect(() => {
    setLoading(true);
    listCrmCustomers({ search, source: source || undefined, limit: 200 }).then((r) => {
      setRows(r);
      setLoading(false);
    });
  }, [search, source]);

  // Metrics-only fetch: recent global links for dashboard aggregations.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("crm_customer_links")
        .select("id,customer_id,partner_id,event_id,source_type,source_id,created_at")
        .order("created_at", { ascending: false })
        .limit(LINK_FETCH_LIMIT);
      const links = (data ?? []) as AggLink[];
      setAllLinks(links);
      setEntityMap(await fetchEntityMap(links as any));
    })();
  }, []);

  const total = rows.length;
  const recent = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.last_seen_at &&
          Date.now() - new Date(r.last_seen_at).getTime() < 7 * 86400_000,
      ).length,
    [rows],
  );

  const metrics = useMemo(() => {
    const byCustomer = new Map<string, AggLink[]>();
    const bySource = new Map<string, number>();
    for (const l of allLinks) {
      const arr = byCustomer.get(l.customer_id) ?? [];
      arr.push(l);
      byCustomer.set(l.customer_id, arr);
      bySource.set(l.source_type, (bySource.get(l.source_type) ?? 0) + 1);
    }
    let vip = 0;
    let frequent = 0;
    let recurring = 0;
    let novo = 0;
    for (const ls of byCustomer.values()) {
      const s = computeSummary(ls as any);
      if (s.status === "VIP") vip++;
      else if (s.status === "Frequente") frequent++;
      else if (s.status === "Recorrente") recurring++;
      else novo++;
    }
    return {
      uniqueCustomers: byCustomer.size,
      vip,
      frequent,
      recurring,
      novo,
      bySource: Array.from(bySource.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [allLinks]);

  const topEvents = useMemo(
    () => rankEvents(allLinks as any, entityMap).slice(0, 5),
    [allLinks, entityMap],
  );
  const topPartners = useMemo(
    () => rankPartners(allLinks as any, entityMap).slice(0, 5),
    [allLinks, entityMap],
  );

  return (
    <div className="space-y-4 p-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">CRM Roxou</h1>
          <p className="text-sm text-muted-foreground">
            Clientes unificados • Reservas, VIP, Excursões, Caronas, Check-ins.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="secondary">{total} listados</Badge>
          <Badge variant="outline">{recent} ativos 7d</Badge>
          <Link to="/admin/crm/sync">
            <Button size="sm">Sincronizar CRM</Button>
          </Link>
        </div>
      </header>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <MetricCard label="Clientes únicos" value={metrics.uniqueCustomers} />
        <MetricCard label="Novos" value={metrics.novo} />
        <MetricCard label="Recorrentes" value={metrics.recurring} />
        <MetricCard label="Frequentes" value={metrics.frequent} />
        <MetricCard label="VIP" value={metrics.vip} highlight />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card className="p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Origens</h3>
          <div className="space-y-1 text-xs">
            {metrics.bySource.map(([src, n]) => (
              <div key={src} className="flex justify-between border-b py-1">
                <span>{sourceLabel(src)}</span>
                <Badge variant="secondary">{n}</Badge>
              </div>
            ))}
            {metrics.bySource.length === 0 && (
              <div className="text-muted-foreground">Sem dados.</div>
            )}
          </div>
        </Card>
        <Card className="p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Top eventos
          </h3>
          <div className="space-y-1 text-xs">
            {topEvents.map((e) => (
              <div key={e.id} className="flex justify-between border-b py-1">
                <span className="truncate pr-2">{e.label}</span>
                <Badge variant="secondary">{e.count}</Badge>
              </div>
            ))}
            {topEvents.length === 0 && <div className="text-muted-foreground">Sem dados.</div>}
          </div>
        </Card>
        <Card className="p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Top parceiros
          </h3>
          <div className="space-y-1 text-xs">
            {topPartners.map((p) => (
              <div key={p.id} className="flex justify-between border-b py-1">
                <span className="truncate pr-2">{p.label}</span>
                <Badge variant="secondary">{p.count}</Badge>
              </div>
            ))}
            {topPartners.length === 0 && <div className="text-muted-foreground">Sem dados.</div>}
          </div>
        </Card>
      </div>

      <Card className="flex flex-wrap gap-2 p-3">
        <Input
          placeholder="Buscar por nome, telefone ou e-mail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1"
        />
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="rounded-md border bg-background px-3 text-sm"
        >
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s ? sourceLabel(s) : "Todas as origens"}
            </option>
          ))}
        </select>
      </Card>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-12 gap-2 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
          <div className="col-span-4">Cliente</div>
          <div className="col-span-3">Telefone</div>
          <div className="col-span-3">E-mail</div>
          <div className="col-span-2">Última atividade</div>
        </div>
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Nenhum cliente.</div>
        ) : (
          rows.map((c) => (
            <Link
              to={`/admin/crm/${c.id}`}
              key={c.id}
              className="grid grid-cols-12 items-center gap-2 border-b px-3 py-2 text-sm hover:bg-muted/40"
            >
              <div className="col-span-4 truncate">
                <div className="font-medium">{c.full_name ?? "Sem nome"}</div>
                <div className="text-xs text-muted-foreground">
                  {sourceLabel(c.source ?? "—")}
                </div>
              </div>
              <div className="col-span-3 font-mono text-xs">{maskPhone(c.phone)}</div>
              <div className="col-span-3 truncate text-xs">{maskEmail(c.email)}</div>
              <div className="col-span-2 text-xs text-muted-foreground">
                {c.last_seen_at ? new Date(c.last_seen_at).toLocaleDateString("pt-BR") : "—"}
              </div>
            </Link>
          ))
        )}
      </Card>

      <p className="text-xs text-muted-foreground">
        Telefone e e-mail aparecem mascarados. Use o detalhe do cliente para revelar com auditoria.
        Exportação desabilitada nesta fase.
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Card className={`p-3 ${highlight ? "border-primary/40 bg-primary/5" : ""}`}>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </Card>
  );
}
