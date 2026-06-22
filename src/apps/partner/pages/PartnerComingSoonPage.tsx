/**
 * PartnerComingSoonPage — placeholder genérico para itens de Configurações
 * cuja tela dedicada ainda não existe. Não altera Supabase, banco ou Auth.
 * Lê o título e a descrição via querystring (?titulo=&desc=).
 */
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Home, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PartnerScreen } from "../components/PartnerScreen";

const PartnerComingSoonPage = () => {
  const [sp] = useSearchParams();
  const titulo = sp.get("titulo") ?? "Em breve";
  const desc =
    sp.get("desc") ??
    "Estamos preparando esta tela com carinho. Em breve você poderá gerenciar tudo direto por aqui.";

  return (
    <PartnerScreen title={titulo} subtitle="Funcionalidade em construção">
      <Card className="border-white/10 bg-white/[0.03] p-6 space-y-4 text-center">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-violet-500/15 border border-violet-400/30 flex items-center justify-center">
          <Sparkles className="h-7 w-7 text-violet-300" />
        </div>
        <div className="space-y-2">
          <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/30">
            Em breve
          </span>
          <h2 className="text-lg font-semibold text-foreground">{titulo}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2 pt-2">
        <Button variant="outline" asChild>
          <Link to="/configuracoes" className="flex items-center justify-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <Button asChild>
          <Link to="/" className="flex items-center justify-center gap-2">
            <Home className="h-4 w-4" />
            Ir para Início
          </Link>
        </Button>
      </div>
    </PartnerScreen>
  );
};

export default PartnerComingSoonPage;
