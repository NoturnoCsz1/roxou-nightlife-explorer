import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function V3Privacy() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="w-9 h-9 rounded-full v3-glass flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="font-display font-extrabold text-2xl text-foreground">Privacidade & LGPD</h1>
      </div>

      <div className="rounded-3xl p-5 v3-glass-strong relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-display font-bold text-foreground">Seus dados, sob controle.</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Cumprimos a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). Esta política
              explica como coletamos, usamos e protegemos suas informações.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
        <p><strong className="text-foreground">Última atualização:</strong> Abril de 2026</p>

        <Section title="1. Dados que coletamos">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-foreground">Cadastro:</strong> nome, e-mail e telefone (motoristas).</li>
            <li><strong className="text-foreground">Localização:</strong> origem e destino para conectar passageiros e motoristas.</li>
            <li><strong className="text-foreground">Uso da plataforma:</strong> eventos visualizados, salvos e reservas feitas para personalizar sua agenda.</li>
            <li><strong className="text-foreground">Dispositivo:</strong> tipo de dispositivo, idioma e cookies essenciais.</li>
          </ul>
        </Section>

        <Section title="2. Bases legais (LGPD Art. 7º)">
          <p>Utilizamos as seguintes bases legais: <strong className="text-foreground">consentimento</strong>,
          <strong className="text-foreground"> execução de contrato</strong> (caronas e reservas),
          <strong className="text-foreground"> legítimo interesse</strong> (segurança e melhoria) e
          <strong className="text-foreground"> cumprimento de obrigação legal</strong>.</p>
        </Section>

        <Section title="3. Como usamos os dados">
          <ul className="list-disc pl-5 space-y-1">
            <li>Conectar passageiros e motoristas para reservas de transporte.</li>
            <li>Personalizar sua agenda com eventos relevantes.</li>
            <li>Garantir a segurança da plataforma e prevenir fraudes.</li>
            <li>Enviar comunicações sobre eventos salvos (com seu consentimento).</li>
          </ul>
        </Section>

        <Section title="4. Compartilhamento">
          <p>Compartilhamos contato entre motorista e passageiro <strong className="text-foreground">apenas
          após uma conexão aceita</strong>. Não vendemos dados a terceiros. Eventuais provedores de
          infraestrutura (hospedagem, autenticação) atuam como operadores e seguem a LGPD.</p>
        </Section>

        <Section title="5. Armazenamento e segurança">
          <p>Dados ficam em servidores criptografados. Mensagens de chat são mantidas por 30 dias após a corrida. Dados de cadastro permanecem enquanto sua conta estiver ativa.</p>
        </Section>

        <Section title="6. Seus direitos (LGPD Art. 18)">
          <ul className="list-disc pl-5 space-y-1">
            <li>Confirmar a existência de tratamento dos seus dados.</li>
            <li>Acessar, corrigir ou atualizar suas informações.</li>
            <li>Solicitar a anonimização ou eliminação dos dados desnecessários.</li>
            <li>Revogar o consentimento a qualquer momento.</li>
            <li>Solicitar a portabilidade para outro fornecedor.</li>
          </ul>
        </Section>

        <Section title="7. Cookies">
          <p>Usamos cookies essenciais para manter sua sessão e cookies analíticos para entender o uso geral da plataforma. Você pode gerenciá-los nas configurações do seu navegador.</p>
        </Section>

        <Section title="8. Contato do Encarregado (DPO)">
          <p>Para exercer seus direitos ou tirar dúvidas sobre privacidade, fale com a gente pelo
          Instagram <strong className="text-foreground">@roxou</strong> ou pela página de
          <Link to="/contato" className="text-primary font-semibold"> Contato</Link>.</p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="font-display font-bold text-base text-foreground">{title}</h2>
      <div className="text-[13px]">{children}</div>
    </div>
  );
}
