/**
 * Onda 19 — Helper SEO baseado em Features.
 *
 * Nenhum consumidor ativa nesta onda: preparado para uso futuro em
 * `<SEO>` do LocalDetail e páginas indexáveis por feature.
 */
import type { Feature } from "../types/feature";

export interface FeatureSeoInput {
  venueName: string;
  city?: string | null;
  features: Feature[];
}

export interface FeatureSeoOutput {
  keywords: string[];
  description: string;
  faq: { question: string; answer: string }[];
}

export function buildFeatureSeo(input: FeatureSeoInput): FeatureSeoOutput {
  const { venueName, city, features } = input;
  const enabled = features.filter((f) => f.enabled);

  const keywords = Array.from(
    new Set([
      venueName,
      ...(city ? [city] : []),
      ...enabled.map((f) => f.name.toLowerCase()),
      ...enabled.flatMap((f) => f.searchTerms),
    ]),
  );

  const topNames = enabled
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((f) => f.name.toLowerCase());

  const description = topNames.length
    ? `${venueName}${city ? ` em ${city}` : ""} — ${topNames.join(", ")}.`
    : `${venueName}${city ? ` em ${city}` : ""}.`;

  const faq = enabled
    .filter((f) => f.indexable)
    .slice(0, 6)
    .map((f) => ({
      question: `${venueName} tem ${f.name.toLowerCase()}?`,
      answer: f.seoDescription,
    }));

  return { keywords, description, faq };
}
