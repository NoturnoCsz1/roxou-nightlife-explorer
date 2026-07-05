import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listPartnerCrmCustomers, listCrmLinks } from "@/services/crm";
import { computeSummary, statusBadgeVariant, type CrmStatus } from "@/services/crm360";
import { maskEmail, maskPhone } from "@/shared/utils/pii";
import { usePartnerAuth } from "@/apps/partner/hooks/usePartnerAuth";

interface Row {
  customer: any;
  interactions: number;
  last_seen_at: string | null;
  score: number;
  status: CrmStatus;
}

export default function PartnerCrmPage() {
  const { selectedPartnerId } = usePartnerAuth();
  const partnerId = selectedPartnerId;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!partnerId) return;
    setLoading(true);
    (async () => {
      const base = await listPartnerCrmCustomers(partnerId);
      // Score por cliente: usa apenas vínculos visíveis para o partner (RLS).
      const enriched: Row[] = await Promise.all(
        base.map(async (r) => {
          const links = await listCrmLinks(r.customer.id);
          const summary = computeSummary(links);
          return {
            ...r,
            score: summary.score,
            status: summary.status,
          };
        }),
      );
      enriched.sort((a, b) => b.score - a.score);
      setRows(enriched);
      setLoading(false);
    })();
  }, [partnerId]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const c = r.customer;
      return (
        (c.full_name ?? "").toLowerCase().includes(s) ||
        (c.email ?? "").toLowerCase().includes(s) ||
        (c.phone_normalized ?? "").includes(s.replace(/\D/g, ""))
      );
    });
  }, [rows, search]);

  const totals = useMemo(() => {
    let vip = 0,
      freq = 0,
      rec = 0,
      novo = 0;
    for (const r of rows) {
      if (r.status === "VIP") vip++;
      else if (r.status === "Frequente") freq++;
      else if (r.status === "Recorrente") rec++;
      else novo++;
    }
    return { vip, freq, rec, novo };
  }, [rows]);

  if (!partnerId)
    return <div className="p-6 text-sm text-muted-foreground">Selecione um parceiro.</div>;

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-bold">Meus clientes</h1>
        <p className="text-sm text-muted-foreground">
          Clientes que interagiram com seu estabelecimento ou evento.
        </p>
      </header>

      <div className="grid grid-cols-4 gap-2">
        <Stat label="VIP" value={totals.vip} highlight />
        <Stat label="Frequentes" value={totals.freq} />
        <Stat label="Recorrentes" value={totals.rec} />
        <Stat label="Novos" value={totals.novo} />
      </div>

      <Card className="p-3">
        <Input
          placeholder="Buscar nome, telefone ou e-mail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-12 gap-2 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
          <div className="col-span-4">Cliente</div>
          <div className="col-span-2">Telefone</div>
          <div className="col-span-2 text-center">Visitas</div>
          <div className="col-span-2 text-center">Score</div>
          <div className="col-span-2">Última visita</div>
        </div>
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Ninguém ainda. Conforme reservas, VIP, excursões e check-ins acontecerem, seus clientes
            aparecem aqui.
          </div>
        ) : (
          filtered.map((r) => (
            <div
              key={r.customer.id}
              className="grid grid-cols-12 items-center gap-2 border-b px-3 py-2 text-sm"
            >
              <div className="col-span-4 truncate">
                <div className="font-medium">{r.customer.full_name ?? "Sem nome"}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {maskEmail(r.customer.email)}
                </div>
              </div>
              <div className="col-span-2 font-mono text-xs">{maskPhone(r.customer.phone)}</div>
              <div className="col-span-2 text-center">
                <Badge variant="secondary">{r.interactions}</Badge>
              </div>
              <div className="col-span-2 text-center">
                <Badge variant={statusBadgeVariant(r.status)}>
                  {r.score} • {r.status}
                </Badge>
              </div>
              <div className="col-span-2 text-xs text-muted-foreground">
                {r.last_seen_at ? new Date(r.last_seen_at).toLocaleDateString("pt-BR") : "—"}
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

function Stat({
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
