/**
 * Tema sazonal — Copa do Mundo 2026
 *
 * Camada visual leve sobre a marca Roxou (roxo/neon/dark permanece base).
 * Proporção alvo: 70% Roxou · 20% Verde Brasil · 10% Amarelo Ouro.
 *
 * Tokens em hex para uso direto em `style={...}` — não polui a paleta global
 * e fica trivial desligar removendo os imports.
 */
export const worldCupTheme = {
  /** Verde-bandeira */
  green: "#009B3A",
  /** Amarelo-ouro (CBF clean) */
  yellow: "#FFDF00",
  /** Verde mais escuro, para borda/fundo */
  greenDeep: "#006B27",

  /** Gradiente sazonal — começa e termina no roxo Roxou */
  gradient:
    "linear-gradient(135deg, hsl(var(--v3-neon, 280 90% 60%)) 0%, #009B3A 55%, #FFDF00 100%)",

  /** Glow amarelo suave para CTAs sazonais */
  glow: "0 0 24px rgba(255, 223, 0, 0.35)",

  /** Classe pronta para badges discretas (sem cor sólida pesada) */
  badgeClass:
    "inline-flex items-center gap-1 rounded-full border border-[#009B3A]/45 bg-[#009B3A]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#7CE2A1]",

  /** Texto curto reutilizável */
  copy: {
    title: "🇧🇷 Copa do Mundo 2026",
    subtitle: "Jogos, transmissões e onde assistir em Prudente",
    cta: "Ver jogos",
    eventBadge: "⚽ Clima de Copa",
    pageBadge: "🇧🇷 Copa na Roxou",
    where: "Onde assistir",
  },
} as const;

export type WorldCupTheme = typeof worldCupTheme;
