import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { revokeConsentByToken } from "@/services/crm";

export default function OptOutPage() {
  const { token = "" } = useParams();
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "fail">("idle");

  async function handle() {
    setStatus("loading");
    const ok = await revokeConsentByToken(token);
    setStatus(ok ? "ok" : "fail");
  }

  useEffect(() => {
    if (token && status === "idle") handle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="mx-auto max-w-md p-6">
      <Card className="space-y-3 p-6 text-center">
        <h1 className="text-xl font-bold">Privacidade Roxou</h1>
        {status === "loading" && <p className="text-sm">Processando…</p>}
        {status === "ok" && (
          <p className="text-sm text-emerald-600">
            Pronto. Você não receberá mais comunicações de marketing por este canal.
          </p>
        )}
        {status === "fail" && (
          <>
            <p className="text-sm text-destructive">Não conseguimos validar este link.</p>
            <Button onClick={handle}>Tentar novamente</Button>
          </>
        )}
        <p className="text-xs text-muted-foreground">
          Mensagens transacionais (reservas, QR, embarque) podem continuar sendo enviadas.
        </p>
      </Card>
    </div>
  );
}
