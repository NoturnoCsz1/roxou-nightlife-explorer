# Feature Engine — `modules/discovery/features`

Onda 18. Catálogo oficial de características dos estabelecimentos.

## Escopo desta onda
- Contratos (`Feature`, `FeatureCategory`, `FeatureSource`, `VenueFeatureAssignment`).
- Catálogo estático (`FEATURE_CATALOG`, `FEATURE_CATEGORIES`).
- Repository em memória (`featureRepository`).
- Service público (`featureService`) — busca por slug, id, categoria, sinônimo e termo; listagem de indexáveis e habilitadas.

## Fora do escopo
- Sem banco, sem RLS, sem Edge Functions.
- Sem UI, sem rotas, sem SEO ativo.
- Sem consumo pelo Discovery Engine ainda.
- Sem IA — apenas contratos preparados (`FeatureSource`, `VenueFeatureAssignment.confidence/approved/suggested`).

## Próximas ondas
- Consumo pelo Discovery Engine (ranking + filtros).
- Rotas `/descubra/:slug` para features `indexable = true`.
- Classificação automática via IA + fontes externas.
- Persistência de `VenueFeatureAssignment`.
