/**
 * Consumidor interno de desenvolvimento — NÃO é importado por rotas.
 *
 * Serve como referência viva do contrato público do Discovery Engine
 * e garante que o barrel `@modules/discovery` compila e resolve.
 * Nenhuma superfície pública o consome — foi criado nesta onda como
 * "consumidor real interno" descrito no item 10 do escopo, dado que
 * não há uma página `/cidade/:slug` estável para integrar sem risco.
 */
import {
  discover,
  listEnabledDiscoveryCategories,
  normalizeDiscoveryQuery,
  type DiscoveryQuery,
  type DiscoveryResult,
} from "@/modules/discovery";

export async function exampleDiscoverOndeComer(
  city = "presidente-prudente",
): Promise<DiscoveryResult> {
  const query: DiscoveryQuery = normalizeDiscoveryQuery({
    city,
    category: "onde-comer",
    limit: 12,
  });
  return discover(query);
}

export function exampleListCategories() {
  return listEnabledDiscoveryCategories().map((c) => c.slug);
}
