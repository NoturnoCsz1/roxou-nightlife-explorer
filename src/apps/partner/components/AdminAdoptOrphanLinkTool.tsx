/**
 * AdminAdoptOrphanLinkTool — FERRAMENTA TEMPORÁRIA DE HOMOLOGAÇÃO.
 *
 * Vincula o short link órfão `expo2026` ao estabelecimento Cultura,
 * usando EXCLUSIVAMENTE a RPC oficial `public.admin_adopt_orphan_short_link`
 * (migration 0007) via `partnerSupabase` (cliente dedicado do backend oficial,
 * sessão persistida em `roxou.partner.auth`).
 *
 * Regras desta ferramenta:
 * - Valores fixos no código: o navegador NÃO envia slug/venue arbitrários.
 * - Visível somente quando `public.is_admin_or_superadmin()` retorna true
 *   (mecanismo oficial de admin/superadmin do banco oficial).
 * - Exige sessão autenticada; confirmação explícita antes da chamada;
 *   executa uma única vez por clique; exibe data/error crus.
 * - Não usa service_role, não pede senha, não altera RPC/trigger/RLS
 *   e não toca em show_on_bio.
 *
 * REMOVER após a homologação do vínculo.
 */
import { useEffect, useState } from "react";
import { Link2, ShieldCheck } from "lucide-react";
import { partnerSupabase } from "../backend/partnerSupabase";
import { GlassCard } from "./ui/GlassCard";
import { Button } from "@/components/ui/button";

const ADOPT_SLUG = "expo2026";
const ADOPT_VENUE_ID = "5b1cc088-cb43-4429-a632-00df7980077e";

type AdminCheck = "checking" | "no-session" | "not-admin" | "admin";

export function AdminAdoptOrphanLinkTool() {
  const [check, setCheck] = useState<AdminCheck>("checking");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: sessionData } = await partnerSupabase.auth.getSession();
      if (!sessionData?.session) {
        if (!cancelled) setCheck("no-session");
        return;
      }
      // Checagem oficial de admin/superadmin do banco oficial.
      const { data: isAdmin, error } = await partnerSupabase.rpc(
        "is_admin_or_superadmin" as never,
      );
      if (cancelled) return;
      if (error) {
        console.error("[AdoptOrphanLink] is_admin_or_superadmin falhou:", error);
        setCheck("not-admin");
        return;
      }
      setCheck(isAdmin ? "admin" : "not-admin");
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Invisível para qualquer usuário que não seja admin/superadmin.
  if (check !== "admin") return null;

  async function handleAdopt() {
    if (running) return;
    const confirmed = window.confirm(
      "Vincular o link 'expo2026' ao estabelecimento Cultura?\n\n" +
        "Esta ação preenche venue_id e organization_id do short link órfão. " +
        "Cliques, data de criação e código são preservados. Continuar?",
    );
    if (!confirmed) return;

    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await partnerSupabase.rpc(
        "admin_adopt_orphan_short_link" as never,
        { _slug: ADOPT_SLUG, _venue_id: ADOPT_VENUE_ID } as never,
      );
      if (error) {
        setResult(`error: ${JSON.stringify(error, null, 2)}`);
      } else {
        setResult(`data: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (err) {
      setResult(`error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <GlassCard className="p-4 space-y-3 border-amber-500/30">
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-amber-500/15 text-amber-400 p-2">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">
            Ferramenta temporária de homologação
          </p>
          <p className="text-xs text-muted-foreground">
            Visível apenas para admin/superadmin. Vincula o link órfão ao
            estabelecimento, preservando cliques e histórico.
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={running}
        onClick={handleAdopt}
        className="w-full"
      >
        <Link2 className="h-4 w-4 mr-2" />
        {running ? "Vinculando..." : "Vincular expo2026 à Cultura"}
      </Button>
      {result && (
        <pre className="text-xs whitespace-pre-wrap break-all rounded-md bg-background/40 border border-white/5 p-3 max-h-64 overflow-auto">
          {result}
        </pre>
      )}
    </GlassCard>
  );
}
