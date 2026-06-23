import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  buildSyncPreview,
  runSync,
  type SyncPreview,
  type SyncResult,
} from "@/services/crmSync";

type Phase = "idle" | "previewing" | "preview-ready" | "running" | "done";

export default function CrmSyncPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<SyncResult | null>(null);

  async function handlePreview() {
    setPhase("previewing");
    try {
      const p = await buildSyncPreview();
      setPreview(p);
      setPhase("preview-ready");
    } catch (e) {
      toast.error("Falha ao gerar prévia");
      setPhase("idle");
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setPhase("running");
    setProgress({ done: 0, total: preview.candidates.length });
    try {
      const r = await runSync(preview, (done, total) =>
        setProgress({ done, total }),
      );
      setResult(r);
      setPhase("done");
      toast.success(`Sincronização concluída: ${r.processed} registros`);
    } catch (e) {
      toast.error("Erro durante sincronização");
      setPhase("preview-ready");
    }
  }

  return (
    <div className="space-y-4 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sincronizar CRM</h1>
          <p className="text-sm text-muted-foreground">
            Ingestão controlada de Reservas, Listas VIP e Excursões. Sem
            disparos, sem exportação.
          </p>
        </div>
        <Link to="/admin/crm" className="text-sm underline">
          ← Voltar ao CRM
        </Link>
      </header>

      {phase === "idle" && (
        <Card className="p-6 space-y-4">
          <p className="text-sm">
            Esta ação lê dados já existentes na plataforma e cria/atualiza
            registros no CRM com deduplicação por telefone, e-mail e CPF.
            Nenhuma mensagem será enviada.
          </p>
          <Button onClick={handlePreview}>Sincronizar CRM</Button>
        </Card>
      )}

      {phase === "previewing" && (
        <Card className="p-6 text-sm text-muted-foreground">
          Gerando prévia…
        </Card>
      )}

      {preview && (phase === "preview-ready" || phase === "running" || phase === "done") && (
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Prévia da sincronização</h2>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Stat label="Registros lidos" value={preview.totalRaw} />
            <Stat label="Clientes únicos" value={preview.uniqueCustomers} />
            <Stat label="Vínculos a criar" value={preview.candidates.length} />
            <Stat label="Sem contato (ignorados)" value={preview.withoutContact} />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {Object.entries(preview.perSource).map(([k, v]) => (
              <Badge key={k} variant="outline">
                {k}: {v}
              </Badge>
            ))}
          </div>
          {phase === "preview-ready" && (
            <div className="flex gap-2 pt-2">
              <Button onClick={handleConfirm}>Confirmar sincronização</Button>
              <Button variant="ghost" onClick={() => { setPhase("idle"); setPreview(null); }}>
                Cancelar
              </Button>
            </div>
          )}
        </Card>
      )}

      {phase === "running" && (
        <Card className="p-4 space-y-2">
          <div className="text-sm">
            Processando {progress.done}/{progress.total}…
          </div>
          <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} />
        </Card>
      )}

      {phase === "done" && result && (
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Resumo final</h2>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <Stat label="Processados" value={result.processed} />
            <Stat label="Vínculos criados" value={result.linksCreated} />
            <Stat label="Clientes únicos" value={result.customerIds.length} />
            <Stat label="Erros" value={result.errors.length} />
          </div>
          <div className="flex gap-2">
            <Link to="/admin/crm">
              <Button variant="outline">Ver clientes importados</Button>
            </Link>
          </div>
          {result.errors.length > 0 && (
            <div className="space-y-1">
              <div className="text-sm font-medium">Erros</div>
              <div className="max-h-60 overflow-auto rounded border bg-muted/30 p-2 text-xs font-mono">
                {result.errors.slice(0, 100).map((e, i) => (
                  <div key={i}>
                    [{e.source_type}] {e.source_id} — {e.message}
                  </div>
                ))}
                {result.errors.length > 100 && (
                  <div className="text-muted-foreground">
                    …e mais {result.errors.length - 100} erro(s)
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
