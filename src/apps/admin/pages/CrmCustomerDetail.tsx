import { useEffect, useState } from "react";
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
import { maskCpf, maskEmail, maskPhone } from "@/lib/pii";
import { toast } from "sonner";

export default function CrmCustomerDetail() {
  const { id = "" } = useParams();
  const [customer, setCustomer] = useState<CrmCustomer | null>(null);
  const [links, setLinks] = useState<CrmLink[]>([]);
  const [consents, setConsents] = useState<CrmConsent[]>([]);
  const [audit, setAudit] = useState<CrmAuditLog[]>([]);
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("crm_customers").select("*").eq("id", id).maybeSingle();
      setCustomer((data as CrmCustomer) ?? null);
      setLinks(await listCrmLinks(id));
      setConsents(await listCrmConsents(id));
      setAudit(await listCrmAuditLogs(id));
    })();
  }, [id]);

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

  if (!customer)
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Carregando…{" "}
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

      <Card className="p-4">
        <h1 className="text-xl font-bold">{customer.full_name ?? "Sem nome"}</h1>
        <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
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
        <div className="mt-3 text-xs text-muted-foreground">
          Origem: {customer.source ?? "—"} • Cidade: {customer.city ?? "—"} • Última atividade:{" "}
          {customer.last_seen_at ? new Date(customer.last_seen_at).toLocaleString("pt-BR") : "—"}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-2 text-sm font-semibold">Vínculos ({links.length})</h2>
        <div className="space-y-1 text-xs">
          {links.map((l) => (
            <div key={l.id} className="flex justify-between border-b py-1">
              <span>
                <Badge variant="outline">{l.source_type}</Badge>{" "}
                <span className="text-muted-foreground">{l.source_id?.slice(0, 8)}</span>
              </span>
              <span className="text-muted-foreground">
                {new Date(l.created_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
          ))}
          {links.length === 0 && <div className="text-muted-foreground">Sem vínculos.</div>}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-2 text-sm font-semibold">Consentimentos</h2>
        <div className="space-y-1 text-xs">
          {consents.map((c) => (
            <div key={c.id} className="flex justify-between border-b py-1">
              <span>
                <Badge variant={c.consent_type === "marketing" ? "default" : "secondary"}>
                  {c.consent_type}
                </Badge>{" "}
                via {c.channel}
              </span>
              <span className={c.revoked_at ? "text-destructive" : "text-muted-foreground"}>
                {c.revoked_at ? "revogado" : "ativo"}
              </span>
            </div>
          ))}
          {consents.length === 0 && <div className="text-muted-foreground">Sem consentimentos.</div>}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-2 text-sm font-semibold">Auditoria</h2>
        <div className="space-y-1 text-xs">
          {audit.map((a) => (
            <div key={a.id} className="flex justify-between border-b py-1">
              <span>
                {a.action} {a.field ? `• ${a.field}` : ""}
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
