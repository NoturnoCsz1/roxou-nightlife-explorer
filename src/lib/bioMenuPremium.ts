/**
 * bioMenuPremium — heurísticas e derivações reutilizáveis para o cardápio.
 *
 * Espelha a lógica usada em `BioMenuTab` (Onda 4) sem duplicar o componente:
 *  - Destaques (is_featured)
 *  - Mais vendidos (bio_analytics_events / menu_item_click / metadata.item_id)
 *  - Promoções (heurística por nome/descrição)
 *  - Cross-sell simples (Comida ↔ Bebida)
 *
 * Sem novas tabelas, colunas ou RPCs.
 */
import { supabase } from "@/integrations/supabase/client";
import type { MenuCategory, MenuItem } from "@/services/bio";

const PROMO_KEYWORDS = ["promo", "promoção", "promocao", "oferta", "desconto", "combo"];

export function isPromoItem(it: MenuItem): boolean {
  const text = `${it.name} ${it.description ?? ""}`.toLowerCase();
  return PROMO_KEYWORDS.some((k) => text.includes(k));
}

export type CrossSide = "bebida" | "comida" | null;

export function crossSellSideFor(cat: MenuCategory | undefined | null): CrossSide {
  if (!cat) return null;
  const n = cat.name.toLowerCase();
  if (/(comida|prato|lanche|porç|porc|burger|pizza)/.test(n)) return "bebida";
  if (/(bebida|drink|chopp|cerveja|suco|refri)/.test(n)) return "comida";
  return null;
}

/** Sugere itens da "outra ponta" (comida ↔ bebida) para complemento do pedido. */
export function suggestCrossSell(
  item: MenuItem,
  categories: MenuCategory[],
  items: MenuItem[],
  limit = 3,
): MenuItem[] {
  const cat = categories.find((c) => c.id === item.category_id);
  const side = crossSellSideFor(cat);
  if (!side) return [];
  const targetCatIds = new Set(
    categories
      .filter((c) => crossSellSideFor(c) && crossSellSideFor(c) !== side)
      .map((c) => c.id),
  );
  if (targetCatIds.size === 0) return [];
  return items
    .filter((i) => i.is_available && i.id !== item.id && i.category_id && targetCatIds.has(i.category_id))
    .slice(0, limit);
}

/** Carrega ranking de cliques (últimos 30 dias) para "Mais vendidos". */
export async function loadMenuSalesMap(bioId: string): Promise<Map<string, number>> {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data } = await supabase
    .from("bio_analytics_events" as never)
    .select("metadata, event_type, created_at")
    .eq("bio_id", bioId)
    .eq("event_type", "menu_item_click")
    .gte("created_at", since);
  const map = new Map<string, number>();
  for (const r of (data as Array<{ metadata: Record<string, unknown> | null }>) ?? []) {
    const id = (r.metadata?.item_id as string | undefined) ?? null;
    if (!id) continue;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

export function pickFeatured(items: MenuItem[], limit = 6): MenuItem[] {
  return items.filter((i) => i.is_featured && i.is_available).slice(0, limit);
}

export function pickBestSellers(items: MenuItem[], sales: Map<string, number>, limit = 6): MenuItem[] {
  if (sales.size === 0) return [];
  return items
    .filter((i) => i.is_available && sales.has(i.id))
    .sort((a, b) => (sales.get(b.id) ?? 0) - (sales.get(a.id) ?? 0))
    .slice(0, limit);
}

export function pickPromos(items: MenuItem[], limit = 6): MenuItem[] {
  return items.filter((i) => i.is_available && isPromoItem(i)).slice(0, limit);
}
