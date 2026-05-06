import SEO from "@/components/SEO";
import { Mail, Shield, Trash2, ArrowRight } from "lucide-react";

export default function RemoverDados() {
  const mailto =
    "mailto:contato@roxou.com.br?subject=Solicita%C3%A7%C3%A3o%20de%20remo%C3%A7%C3%A3o%20de%20dados";

  return (
    <>
      <SEO
        title="Remoção de Dados do Usuário | Roxou"
        description="Solicite a remoção dos seus dados vinculados à plataforma Roxou."
      />
      <main className="min-h-screen bg-background text-foreground py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="relative rounded-3xl border border-primary/30 bg-card/80 backdrop-blur-md p-6 md:p-10 shadow-[0_0_60px_-20px_hsl(var(--primary)/0.5)]">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/30 blur-[60px] pointer-events-none" />

            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/40 grid place-items-center mb-4">
                <Shield className="w-7 h-7 text-primary" />
              </div>

              <h1 className="font-display font-black text-2xl md:text-3xl text-foreground leading-tight">
                Remoção de Dados do Usuário
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                A Roxou respeita sua privacidade. Se você utilizou login ou integração
                com Facebook/Instagram em nossa plataforma, pode solicitar a exclusão
                dos seus dados a qualquer momento.
              </p>

              <div className="mt-6 space-y-4 text-sm leading-relaxed text-foreground/90">
                <div>
                  <p className="font-semibold">
                    Para solicitar a remoção dos dados, envie um e-mail para:
                  </p>
                  <a
                    href="mailto:contato@roxou.com.br"
                    className="inline-flex items-center gap-2 text-primary font-bold hover:underline mt-1"
                  >
                    <Mail className="w-4 h-4" /> contato@roxou.com.br
                  </a>
                </div>

                <div>
                  <p className="font-semibold">Com o assunto:</p>
                  <p className="text-muted-foreground">Solicitação de remoção de dados</p>
                </div>

                <div>
                  <p className="font-semibold">No corpo do e-mail, informe:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1 text-muted-foreground">
                    <li>nome completo</li>
                    <li>e-mail usado na plataforma</li>
                    <li>rede social vinculada, se houver</li>
                    <li>solicitação clara de exclusão dos dados</li>
                  </ul>
                </div>

                <p className="text-muted-foreground">
                  Após o recebimento, a equipe Roxou analisará e removerá os dados
                  vinculados em até <strong className="text-foreground">7 dias úteis</strong>.
                </p>

                <div className="rounded-xl border border-border/50 bg-secondary/30 p-4">
                  <p className="font-semibold mb-1">
                    Também é possível remover o acesso pela sua conta Meta:
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Facebook/Instagram → Configurações → Apps e sites → Roxou →
                    Remover acesso
                  </p>
                </div>

                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Observação:</strong> alguns dados
                  podem ser mantidos quando houver obrigação legal, prevenção a fraudes,
                  segurança da plataforma ou cumprimento de normas aplicáveis.
                </p>
              </div>

              <a
                href={mailto}
                className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-extrabold uppercase tracking-wider text-sm shadow-[0_0_30px_hsl(var(--primary)/0.5)] hover:translate-y-[-1px] transition-transform"
              >
                <Trash2 className="w-4 h-4" />
                Enviar solicitação
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
