import SEO from "@/components/SEO";
import { BdaLayout } from "@/components/bda/BdaLayout";
import { BDA_PRIVACY_NOTE, BDA_TERMS_VERSION } from "@/modules/bda/bdaLegal";

const BLOCKS = [
  {
    id: "dados",
    title: "Quais dados coletamos",
    text: "Coletamos nome completo, nome público, data de nascimento, cidade, telefone, e-mail e, opcionalmente, Instagram e foto. Para participantes menores de 18 anos, coletamos também nome, CPF, telefone, e-mail e vínculo do responsável legal.",
  },
  {
    id: "finalidade",
    title: "Para que usamos",
    text: "Os dados são usados exclusivamente para organizar, comunicar e administrar a Batalha de Aura PP: validação da inscrição, contato com o participante e com o responsável, e divulgação autorizada do campeonato.",
  },
  {
    id: "publicacao",
    title: "O que aparece publicamente",
    text: "Na lista pública podem aparecer apenas nome público (ou apelido), categoria, nome da dupla, cidade quando autorizada e foto quando autorizada. Nome completo, documento, telefone, e-mail, data de nascimento e dados do responsável nunca são exibidos.",
  },
  {
    id: "menores",
    title: "Participantes menores de 18 anos",
    text: "Nenhum dado de menor é publicado sem autorização expressa do responsável legal e sem aprovação administrativa. A idade exata nunca é exibida. A inscrição fica bloqueada até a confirmação do responsável.",
  },
  {
    id: "imagem",
    title: "Uso de imagem",
    text: "A autorização de uso de imagem é opcional e independente da inscrição. Fotos enviadas ficam em armazenamento privado; somente a versão otimizada e aprovada pode ser publicada.",
  },
  {
    id: "protecao",
    title: "Como protegemos",
    text: "O CPF do responsável é armazenado de forma criptografada e só pode ser consultado por administradores autorizados, com registro de auditoria. O acesso às inscrições é restrito à organização.",
  },
  {
    id: "direitos",
    title: "Seus direitos",
    text: "Participante e responsável podem solicitar a qualquer momento a revogação de consentimentos, a remoção da foto pública ou a exclusão dos dados, pelo canal oficial de contato da organização.",
  },
];

export default function BdaPrivacidade() {
  return (
    <BdaLayout>
      <SEO
        title="Privacidade e proteção de dados | Batalha de Aura PP"
        description="Como a Batalha de Aura PP coleta, protege e publica dados de participantes, com regras específicas para menores de 18 anos."
        canonical="https://roxou.com.br/batalhadeaura/privacidade"
      />
      <section className="px-4 py-14">
        <div className="mx-auto max-w-3xl">
          <h1 className="bda-font-display text-2xl font-black uppercase text-white sm:text-4xl [text-shadow:0_0_24px_rgba(168,85,247,0.5)]">
            Privacidade e proteção de dados
          </h1>
          <p className="bda-font-body mt-3 text-sm text-[#C8D2E0]/75">{BDA_PRIVACY_NOTE}</p>

          <div className="mt-8 space-y-4">
            {BLOCKS.map((b) => (
              <article
                key={b.id}
                id={b.id}
                className="rounded-2xl border border-[#C8D2E0]/12 bg-white/[0.02] p-5 scroll-mt-24"
              >
                <h2 className="bda-font-display text-sm font-bold uppercase tracking-[0.14em] text-white">
                  {b.title}
                </h2>
                <p className="bda-font-body mt-2 text-sm leading-relaxed text-[#C8D2E0]/75">{b.text}</p>
              </article>
            ))}
          </div>

          <p className="bda-font-body mt-8 text-[11px] text-[#C8D2E0]/45">
            Versão {BDA_TERMS_VERSION} — texto provisório, pendente de revisão jurídica.
          </p>
        </div>
      </section>
    </BdaLayout>
  );
}
