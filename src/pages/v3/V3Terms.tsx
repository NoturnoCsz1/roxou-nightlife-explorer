import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function V3Terms() {
  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/transporte" className="w-8 h-8 rounded-full bg-card border border-border/40 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="font-display font-bold text-xl text-foreground">Termos de Uso</h1>
      </div>

      <div className="prose prose-sm prose-invert max-w-none text-muted-foreground space-y-4 text-sm leading-relaxed">
        <p><strong className="text-foreground">Última atualização:</strong> Abril de 2026</p>

        <h2 className="text-foreground font-display text-base">1. Aceitação dos Termos</h2>
        <p>Ao utilizar o serviço Roxou Transporte, você concorda com estes termos. Caso não concorde, não utilize o serviço.</p>

        <h2 className="text-foreground font-display text-base">2. Natureza do Serviço</h2>
        <p>O Roxou Transporte é uma plataforma que conecta passageiros e motoristas. O Roxou <strong className="text-foreground">não é uma empresa de transporte</strong> e não presta serviços de transporte diretamente.</p>

        <h2 className="text-foreground font-display text-base">3. Responsabilidades</h2>
        <p>O Roxou não se responsabiliza por: qualidade do veículo, segurança da viagem, pontualidade, condutas dos motoristas ou passageiros, acidentes ou prejuízos decorrentes do transporte.</p>

        <h2 className="text-foreground font-display text-base">4. Cadastro</h2>
        <p>Motoristas devem fornecer informações verídicas e podem ser removidos a qualquer momento. Passageiros devem respeitar os motoristas e o veículo.</p>

        <h2 className="text-foreground font-display text-base">5. Pagamentos</h2>
        <p>Os acertos financeiros são feitos diretamente entre passageiro e motorista. O Roxou não intermedia pagamentos.</p>

        <h2 className="text-foreground font-display text-base">6. Modificações</h2>
        <p>Estes termos podem ser alterados a qualquer momento. Recomendamos a leitura periódica.</p>
      </div>
    </div>
  );
}
