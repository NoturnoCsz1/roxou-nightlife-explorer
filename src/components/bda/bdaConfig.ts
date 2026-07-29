/**
 * Batalha de Aura PP — configuração central do hotsite.
 * Hotsite isolado: nenhum módulo existente da Roxou depende deste arquivo.
 */

/** Data placeholder da Grande Final — editar aqui (ISO, timezone -03:00). */
export const BDA_EVENT_DATE = "2026-10-10T20:00:00-03:00";

export const BDA_BASE = "/batalhadeaura";

/** Rotas do hotsite (arquitetura pronta para crescimento). */
export const BDA_ROUTES = {
  home: BDA_BASE,
  inscricao: `${BDA_BASE}/inscricao`,
  regulamento: `${BDA_BASE}/regulamento`,
  ranking: `${BDA_BASE}/ranking`,
  patrocinadores: `${BDA_BASE}/patrocinadores`,
  faq: `${BDA_BASE}/faq`,
  admin: `${BDA_BASE}/admin`,
} as const;

export const BDA_NAV = [
  { to: BDA_ROUTES.home, label: "Início" },
  { to: BDA_ROUTES.inscricao, label: "Inscrição" },
  { to: BDA_ROUTES.regulamento, label: "Regulamento" },
  { to: BDA_ROUTES.ranking, label: "Ranking" },
  { to: BDA_ROUTES.patrocinadores, label: "Patrocinadores" },
  { to: BDA_ROUTES.faq, label: "FAQ" },
];

export const BDA_SOCIAL = {
  instagram: "https://instagram.com/roxou.oficial",
  tiktok: "https://tiktok.com/@roxou.oficial",
  site: "https://roxou.com.br",
  contato: "mailto:contato@roxou.com.br",
};

/** Paleta oficial BDA. */
export const BDA_COLORS = {
  black: "#05030B",
  purple: "#A855F7",
  blue: "#2E7DFF",
  silver: "#C8D2E0",
};

export const BDA_CATEGORIES = [
  {
    id: "solo",
    name: "SOLO",
    tag: "1 vs 1",
    description:
      "Disputa individual. O competidor enfrenta os desafios sozinho e acumula aura em nome próprio.",
  },
  {
    id: "dupla",
    name: "DUPLA",
    tag: "2 vs 2",
    description:
      "Disputa em dupla. A aura conquistada é somada entre os dois integrantes ao longo do campeonato.",
  },
] as const;

export const BDA_STEPS = [
  { step: "01", title: "Inscrição", text: "O competidor escolhe a categoria e envia a inscrição." },
  { step: "02", title: "Confirmação", text: "A organização valida os dados e confirma a participação." },
  { step: "03", title: "Desafios", text: "Os participantes enfrentam os desafios propostos pela organização." },
  { step: "04", title: "Pontuação", text: "Cada desafio gera pontos de aura, acumulados no ranking." },
  { step: "05", title: "Grande Final", text: "Os melhores colocados se enfrentam na decisão do campeonato." },
] as const;

export const BDA_PRIZES = [
  { title: "Campeão", subtitle: "1º lugar", text: "Título oficial de Campeão da Batalha de Aura PP e premiação principal." },
  { title: "Vice", subtitle: "2º lugar", text: "Reconhecimento oficial de vice-campeão e premiação secundária." },
  { title: "Destaque", subtitle: "Menção especial", text: "Prêmio para o competidor de maior destaque durante a temporada." },
] as const;
