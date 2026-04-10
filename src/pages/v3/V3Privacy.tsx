import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function V3Privacy() {
  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/v3/transporte" className="w-8 h-8 rounded-full bg-card border border-border/40 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="font-display font-bold text-xl text-foreground">Política de Privacidade</h1>
      </div>

      <div className="prose prose-sm prose-invert max-w-none text-muted-foreground space-y-4 text-sm leading-relaxed">
        <p><strong className="text-foreground">Última atualização:</strong> Abril de 2026</p>

        <h2 className="text-foreground font-display text-base">1. Dados Coletados</h2>
        <p>Coletamos: nome, e-mail, telefone (para motoristas), dados de localização (para conectar motorista e passageiro) e informações de uso da plataforma.</p>

        <h2 className="text-foreground font-display text-base">2. Uso dos Dados</h2>
        <p>Seus dados são utilizados para: conectar passageiros e motoristas, melhorar a experiência e garantir a segurança da plataforma.</p>

        <h2 className="text-foreground font-display text-base">3. Compartilhamento</h2>
        <p>Compartilhamos informações de contato entre motorista e passageiro <strong className="text-foreground">apenas quando há uma conexão aceita</strong>. Não vendemos dados a terceiros.</p>

        <h2 className="text-foreground font-display text-base">4. Armazenamento</h2>
        <p>Os dados são armazenados de forma segura em servidores criptografados. Dados de chat são mantidos por 30 dias após a corrida.</p>

        <h2 className="text-foreground font-display text-base">5. Seus Direitos</h2>
        <p>Você pode solicitar a exclusão dos seus dados a qualquer momento entrando em contato conosco.</p>

        <h2 className="text-foreground font-display text-base">6. Contato</h2>
        <p>Para dúvidas sobre privacidade, entre em contato pelo Instagram @roxou.</p>
      </div>
    </div>
  );
}
