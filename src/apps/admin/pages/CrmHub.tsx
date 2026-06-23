import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listCrmCustomers, type CrmCustomer } from "@/services/crm";
import { maskEmail, maskPhone } from "@/lib/pii";

const SOURCES = ["", "reservation", "vip_list", "excursion", "ride", "checkin"];

export default function CrmHub() {
  const [rows, setRows] = useState<CrmCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");

  useEffect(() => {
    setLoading(true);
    listCrmCustomers({ search, source: source || undefined, limit: 200 }).then((r) => {
      setRows(r);
      setLoading(false);
    });
  }, [search, source]);

  const total = rows.length;
  const recent = useMemo(
    () => rows.filter((r) => r.last_seen_at && Date.now() - new Date(r.last_seen_at).getTime() < 7 * 86400_000).length,
    [rows],
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
        <div className="flex gap-2 text-xs">
          <Badge variant="secondary">{total} clientes</Badge>
          <Badge variant="outline">{recent} ativos 7d</Badge>
        </div>
      </header>

      <Card className="p-3 flex flex-wrap gap-2">
        <Input
          placeholder="Buscar por nome, telefone ou e-mail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px]"
        />
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="rounded-md border bg-background px-3 text-sm"
        >
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s ? s : "Todas as origens"}
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
                <div className="text-xs text-muted-foreground">{c.source ?? "—"}</div>
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
      <Button variant="outline" disabled className="opacity-60">
        Exportar (desabilitado)
      </Button>
    </div>
  );
}
