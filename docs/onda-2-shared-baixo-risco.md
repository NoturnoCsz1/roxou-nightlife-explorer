# Onda 2 — Consolidação de Shared de Baixo Risco

Data: 2026-07-11
Status: **Concluída**

## Critérios de elegibilidade

Um arquivo só entra em `src/shared/` se atende TODOS:
1. Sem regra de negócio de produto (Discovery/Partner/Transport/Admin).
2. Sem dependência de rota, página, Supabase, Auth, schema, RPC ou Edge Function.
3. Sem dependência de variável de ambiente específica de produto.
4. Reutilizável por 2+ produtos sem adaptação.
5. Risco de movimentação baixo e consumidores rastreáveis.

Em dúvida: NÃO mover. Registrar como pendência.

## Inventário auditado

| Arquivo original | Genérico? | Consumidores | Decisão |
|---|---|---|---|
| `src/hooks/useIsDesktop.ts` | Sim (matchMedia puro) | 1 (`V3Home`) | **Movido** |
| `src/lib/instagramHandle.ts` | Sim (normalização de string) | 5 (admin+partner) | **Movido** |
| `src/lib/locationDisplay.ts` | Sim (regex/format puro) | 2 (`V3DriverBoard`, `V3MyRides`) | **Movido** |
| `src/lib/aiGatewayError.ts` | Sim (classifier de erro sem acesso a Supabase) | 4 (admin bulk/list/form + `bulkDescriptionWorker`) | **Movido** |
| `src/lib/dateUtils.ts` | Sim, mas TZ-crítico | 45 | **Adiado** — onda própria (risco de regressão em toda agenda) |
| `src/lib/utils.ts` (`cn`) | Sim | 93 | **Adiado** — codemod massivo, onda própria |
| `src/lib/imageOptimizer.ts` | Parcial (conhece paths `/storage/v1/...` do Supabase) | 6 | **Adiado** — reavaliar após abstrair CDN |
| `src/lib/titleCleaner.ts` | Não (específico do Radar IA) | 1 | **Recusado** — pertence a módulo de Radar |
| `use-toast`, `SEO`, `components/ui/*` | Sim | 40+ cada | **Adiado por padrão** (regra da onda) |
| `useAuth`, `useSaved*`, `usePageTracking`, `analytics`, `ga`, `supabaseFetchAll`, `EventCard`, `V3Layout` | Não | — | **Recusado** — acoplados a produto/Supabase/auth |

## Arquivos movidos (4)

| Origem | Destino |
|---|---|
| `src/hooks/useIsDesktop.ts` | `src/shared/hooks/useIsDesktop.ts` |
| `src/lib/instagramHandle.ts` | `src/shared/utils/instagramHandle.ts` |
| `src/lib/locationDisplay.ts` | `src/shared/utils/locationDisplay.ts` |
| `src/lib/aiGatewayError.ts` | `src/shared/utils/aiGatewayError.ts` |

## Imports atualizados (13 pontos em 12 arquivos)

Todos migrados para o alias `@shared/...`:

- `src/apps/admin/eventos/form/eventoFormActions.ts`
- `src/apps/admin/eventos/list/useEventosListActions.ts`
- `src/apps/admin/pages/EventoBulkForm.tsx` (2)
- `src/apps/admin/pages/ParceiroForm.tsx`
- `src/apps/admin/pages/StoryAgendaDoDia.tsx`
- `src/apps/partner/components/PartnerProfileEditor.tsx`
- `src/apps/partner/components/PartnerProfilePreview.tsx`
- `src/apps/partner/services/partnerProfile.ts`
- `src/lib/bulkDescriptionWorker.ts` (import relativo `./aiGatewayError` → `@shared/utils/aiGatewayError`)
- `src/pages/v3/V3DriverBoard.tsx`
- `src/pages/v3/V3Home.tsx`
- `src/pages/v3/V3MyRides.tsx`

## Duplicações

Nenhuma duplicação identificada nos arquivos movidos. Cópias antigas removidas via `mv`.

## Auditoria dos arquivos já em `src/shared/` (Onda 0.5)

Confirmado que os imports para `sanitize`, `pii`, `utm`, `formatRelativeTime`, `qrcode`, `imageHash`, `calendarUtils`, `geoUtils`, `useScrollFadeIn`, `use-mobile`, `SafeHtml`, `SectionHeader`, `AuraBadge` estão corretos. Nenhuma cópia antiga encontrada em `src/lib/`, `src/hooks/` ou `src/components/`.

## Validações

| Check | Resultado |
|---|---|
| `bunx tsgo --noEmit` | ✅ limpo |
| `bun run build` | ✅ 12 875 KiB precache, 379 entries |
| `bun run audit:cycles` | ✅ 1 ciclo (herdado, mesmo baseline: `eventoFormSubmit`↔`eventoFormActions`) |
| `bun run lint` nos arquivos alterados | ✅ zero novos erros de `no-restricted-imports` |

## Riscos remanescentes

- `dateUtils.ts`, `utils.ts` (cn) e `use-toast` continuam em locais legados; movimentação exige onda dedicada por volume.
- `imageOptimizer.ts` acoplado à URL do Supabase Storage — precisa desacoplamento antes de virar shared.
- Ciclo Admin `eventoFormSubmit ↔ eventoFormActions` permanece registrado no baseline (não introduzido por esta onda).

## Rollback

Todos os moves são reversíveis com `mv` + revert dos 13 imports listados acima. Nenhuma lógica interna dos arquivos foi tocada.
