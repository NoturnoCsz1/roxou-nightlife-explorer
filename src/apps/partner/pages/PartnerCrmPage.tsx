import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listPartnerCrmCustomers } from "@/services/crm";
import { maskEmail, maskPhone } from "@/lib/pii";
import { usePartnerContext } from "@/apps/partner/hooks/usePartnerContext";

export default function PartnerCrmPage() {
  const { partner } = usePartnerContext();
  const partnerId = partner?.id;
  const [rows, setRows] = useState<
    { customer: any; interactions: number; last_seen_at: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!partnerId) return;
    setLoading(true);
    listPartnerCrmCustomers(partnerId).then((r) => {
      setRows(r);
      setLoading(false);
    });
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

      <Card className="p-3">
        <Input
          placeholder="Buscar nome, telefone ou e-mail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-12 gap-2 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
          <div className="col-span-5">Cliente</div>
          <div className="col-span-3">Telefone</div>
          <div className="col-span-2 text-center">Interações</div>
          <div className="col-span-2">Última visita</div>
        </div>
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Ninguém ainda. Conforme reservas, VIP, excursões e check-ins acontecerem, seus clientes aparecem aqui.
          </div>
        ) : (
          filtered.map((r) => (
            <div
              key={r.customer.id}
              className="grid grid-cols-12 items-center gap-2 border-b px-3 py-2 text-sm"
            >
              <div className="col-span-5 truncate">
                <div className="font-medium">{r.customer.full_name ?? "Sem nome"}</div>
                <div className="truncate text-xs text-muted-foreground">{maskEmail(r.customer.email)}</div>
              </div>
              <div className="col-span-3 font-mono text-xs">{maskPhone(r.customer.phone)}</div>
              <div className="col-span-2 text-center">
                <Badge variant="secondary">{r.interactions}</Badge>
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
