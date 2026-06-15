# services

Camada de acesso a dados (Supabase) **aditiva**. Nenhum consumidor existente
foi migrado na Fase 2 — páginas continuam fazendo suas queries inline.
A migração de callsites será feita nas Fases 3+ junto com a quebra dos megafiles.

## Convenções
- Cada arquivo ≤ 300 LOC; quebrar em subpastas se passar.
- Usar `fetchAllRows` (de `@/lib/supabaseFetchAll`) para queries com >1000 linhas.
- Usar helpers de `@/lib/dateUtils` para qualquer filtro por civil-day SP.
- Nunca importar componentes React aqui.
- Funções puramente assíncronas, retornando dados tipados (até `src/types/db.ts` existir, usar tipos inline).

## Módulos

| Módulo | Domínio |
|---|---|
| `events.ts`     | CRUD e feeds de `events` |
| `partners.ts`   | Leitura de `partners` e `public_partners` |
| `instagram.ts`  | `instagram_*` (accounts, posts, scans, imports) |
| `transport.ts`  | `ride_requests`, `ride_offers`, `transport_messages` |
| `analytics.ts`  | `analytics_events`, `page_views`, `visitor_sessions` |
| `aura.ts`       | `aura_alerts`, `auto_reels_queue`, ranking |
| `adminAuth.ts`  | Helper centralizado de headers admin (re-export de `lib/adminFetch`) |
