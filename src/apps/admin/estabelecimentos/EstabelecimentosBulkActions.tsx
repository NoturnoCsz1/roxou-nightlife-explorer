import { Link } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";

interface Props {
  onAnalyzeBase: () => void;
  globalBusy: boolean;
}

/**
 * Cabeçalho com ações "em massa" da auditoria — hoje apenas:
 *  • Análise IA da base (LEITURA: chama edge `ai-audit-establishments` com mode "global",
 *    não altera dados)
 *  • Botão Novo (link para /admin/parceiros/novo)
 *
 * Nenhuma ação de mass-update existe nesta tela; preservado exatamente.
 */
export function EstabelecimentosBulkActions({ onAnalyzeBase, globalBusy }: Props) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div>
        <h1 className="text-lg font-bold text-foreground">Auditoria de Estabelecimentos</h1>
        <p className="text-[11px] text-muted-foreground">Validação, status e qualidade de dados</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onAnalyzeBase}
          disabled={globalBusy}
          className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/25 disabled:opacity-50"
        >
          {globalBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Análise IA da base
        </button>
        {/* Bulk geocoding desativado — usar fluxo manual por card. */}
        <Link to="/admin/parceiros/novo" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          Novo
        </Link>
      </div>
    </div>
  );
}
