/**
 * PartnerPendingApprovalPage — Fase 10A.
 *
 * Mostra status das solicitações do usuário (pending, rejected, approved).
 * Se aprovada, redireciona para /dashboard.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  cancelMyAccessRequest,
  listMyAccessRequests,
  type PartnerAccessRequest,
} from "../services/partnerAccessRequests";
import { toast } from "sonner";

const PartnerPendingApprovalPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<PartnerAccessRequest[]>([]);

  const refresh = async () => {
    setLoading(true);
    try {
      const rows = await listMyAccessRequests();
      setRequests(rows);
      if (rows.some((r) => r.status === "approved")) {
        navigate("/dashboard", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!data?.user) {
        navigate("/login", { replace: true });
        return;
      }
      await refresh();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </main>
    );
  }

  const pending = requests.filter((r) => r.status === "pending");
  const rejected = requests.filter((r) => r.status === "rejected");

  return (
    <main className="mx-auto max-w-xl px-4 py-10 space-y-6">
      <header className="space-y-1 text-center">
        <span className="inline-block rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
          Em análise
        </span>
        <h1 className="text-2xl font-bold">Solicitação em análise pela Roxou</h1>
        <p className="text-sm text-muted-foreground">
          Você receberá retorno em até 1 dia útil. Após a aprovação, o acesso
          ao Partner Pro fica liberado automaticamente neste mesmo login.
        </p>
      </header>

      <section className="space-y-2">
        {pending.length === 0 && rejected.length === 0 && (
          <div className="rounded-xl border border-border/40 bg-card/40 p-4 text-sm text-muted-foreground">
            Você ainda não tem solicitações.
            <div className="mt-3">
              <Button onClick={() => navigate("/onboarding")}>Solicitar acesso</Button>
            </div>
          </div>
        )}

        {pending.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Solicitação pendente</p>
              <span className="text-[10px] uppercase tracking-wider text-amber-300">
                Pending
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Enviada em {new Date(r.created_at).toLocaleString("pt-BR")}
            </p>
            {r.message && (
              <p className="text-xs text-muted-foreground italic">"{r.message}"</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await cancelMyAccessRequest(r.id);
                    toast.success("Solicitação cancelada");
                    await refresh();
                  } catch (err) {
                    toast.error(
                      err instanceof Error ? err.message : "Erro ao cancelar",
                    );
                  }
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ))}

        {rejected.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-1"
          >
            <p className="text-sm font-medium">Solicitação recusada</p>
            <p className="text-xs text-muted-foreground">
              Entre em contato com a Roxou para entender o motivo ou tentar
              novamente com outras informações.
            </p>
          </div>
        ))}
      </section>

      <div className="flex justify-center">
        <Button variant="ghost" onClick={refresh}>
          Atualizar status
        </Button>
      </div>
    </main>
  );
};

export default PartnerPendingApprovalPage;
