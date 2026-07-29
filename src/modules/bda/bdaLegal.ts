/**
 * Textos provisórios de consentimento e privacidade da Batalha de Aura PP.
 * ATENÇÃO: conteúdo preliminar, ainda pendente de revisão jurídica.
 */

export const BDA_TERMS_VERSION = "v1-provisorio-2026";

export interface BdaConsentDef {
  key:
    | "participacao_evento"
    | "tratamento_dados"
    | "uso_imagem"
    | "exibicao_publica"
    | "comunicacoes";
  title: string;
  text: string;
  requiredForMinors?: boolean;
  alwaysRequired?: boolean;
}

export const BDA_CONSENTS: BdaConsentDef[] = [
  {
    key: "participacao_evento",
    title: "Autorização de participação no evento",
    text: "Autorizo a participação do(a) participante na Batalha de Aura PP, ciente das atividades propostas pela organização.",
    requiredForMinors: true,
  },
  {
    key: "tratamento_dados",
    title: "Tratamento de dados para organizar o campeonato",
    text: "Autorizo o tratamento dos dados informados exclusivamente para organizar, comunicar e administrar o campeonato.",
    alwaysRequired: true,
  },
  {
    key: "uso_imagem",
    title: "Uso de imagem durante o evento",
    text: "Autorizo o registro de fotos e vídeos durante o evento e seu uso em materiais de divulgação da Batalha de Aura PP.",
  },
  {
    key: "exibicao_publica",
    title: "Exibição pública da foto e do primeiro nome",
    text: "Autorizo que a foto enviada e o primeiro nome (ou apelido) apareçam na lista pública de participantes confirmados.",
  },
  {
    key: "comunicacoes",
    title: "Comunicações promocionais futuras",
    text: "Aceito receber comunicações sobre próximas edições e novidades da Batalha de Aura PP.",
  },
];

export const BDA_PRIVACY_NOTE =
  "Coletamos apenas os dados necessários para organizar o campeonato. Dados de participantes menores de 18 anos e de seus responsáveis não são exibidos publicamente em nenhuma hipótese.";

export const BDA_LEGAL_LINKS = [
  { label: "Política de Privacidade (provisória)", href: "/batalhadeaura/privacidade" },
  { label: "Termos de Participação (provisórios)", href: "/batalhadeaura/regulamento" },
  { label: "Autorização de Uso de Imagem (provisória)", href: "/batalhadeaura/privacidade#imagem" },
  { label: "Solicitar exclusão ou revogação", href: "mailto:contato@roxou.com.br?subject=BDA%20-%20Revogacao%20de%20consentimento" },
];
