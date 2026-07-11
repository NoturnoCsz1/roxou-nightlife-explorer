# Exceções Temporárias de Dependência

Registradas na **Onda 1**. Cada linha é uma dívida técnica com dono e
onda-alvo para remoção.

Formato: origem → destino | motivo | risco | onda de remoção.

## Exceções globais (herança do legado)

O legado inteiro é uma exceção implícita até as ondas de migração.
Aqui listamos apenas as violações mais visíveis, para que reviewers
não sejam surpreendidos.

| Origem | Destino | Motivo | Risco | Onda |
|---|---|---|---|---|
| `src/App.tsx` | `src/pages/admin/*`, `src/apps/admin/pages/*` | rotas `/admin/*` no bundle público | médio (peso) | Onda 3 |
| `src/App.tsx` | `src/apps/partner/pages/*` (via `/admin/partner-preview`) | Admin renderiza páginas reais do Partner | alto (isolamento) | Onda 5 |
| `src/pages/v3/V3Layout` | rotas de Transporte, Jogos, Comunidade | mesmo layout público | médio | Onda 8/9 |
| `src/components/EventCard.tsx`, `PopularVenues.tsx`, `VenueList.tsx`, `FeaturedCarousel.tsx`, `CategoryPills.tsx`, `DateFilterPills.tsx`, `EventCountdown.tsx`, `TransmissionBlock.tsx` | consumo cross-produto | componentes de Descobertas usados por Admin/Partner | médio | Onda 9 |
| `src/components/{admin,jogos,search,v3}/*` | `@/integrations/supabase/client` inline | 13 componentes chamam `supabase.from(...)` direto | médio | Ondas 4–9 |
| `src/apps/partner/**` | `@/components/ui/*`, `@/hooks/*`, `@/lib/*` | Partner ainda usa shared não-migrado | baixo | Ondas 2, 4–6 |
| `src/apps/admin/partnerPilot/*`, `src/apps/admin/partnerProCrm/*` | `@/apps/partner/services/*` | Admin do Partner ainda mora em `apps/admin` | médio | Onda 5 |
| `src/pages/transportes/*`, `src/pages/v3/V3{Transport,RideRequest,DriverBoard,MyRides,Chat}.tsx` | herança de `V3Layout` público | Transporte compartilha layout | médio | Onda 8 |
| `src/pages/PublicVipList.tsx`, `PublicReservation*.tsx`, `pages/bio/*`, `pages/customer/*` | `src/apps/partner/components/*` | contratos públicos usam UI do Partner | baixo | Onda 5 |
| `src/integrations/lovable/index.ts` | usado por vários produtos com contrato implícito | falta wrapper específico por produto | baixo | Onda 3 |

## Como remover uma exceção

1. Extrair o consumo para `services/` do produto proprietário.
2. Substituir o import cruzado por `@contracts/<produto>` ou por
   componente próprio do módulo consumidor.
3. Rodar `bun run lint` e `bun run audit:cycles`.
4. Remover a linha desta tabela no mesmo PR.

## Como adicionar uma exceção

Só se for absolutamente inevitável nesta fase da migração. Registrar:

- caminho origem;
- caminho destino;
- motivo técnico;
- risco (baixo/médio/alto);
- onda de remoção prevista;
- responsável.

Exceção não documentada é bug: será rejeitada em code review.

## Onda 3 (2026-07-11) — sem novas exceções

A separação das árvores de rotas em `src/app/routes/*` não introduziu novos
imports cruzados entre produtos. `AdminLayout` continua em
`@/components/admin/AdminLayout` (shared histórico, ainda não migrado para
`@modules/admin`) e é consumido apenas por `adminRoutes.tsx` — a dívida de
mover o layout para dentro do módulo Admin permanece registrada no plano
de modularização e será tratada em onda dedicada.
