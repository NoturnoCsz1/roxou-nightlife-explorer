# Suggestion Engine (Onda 23)

Infraestrutura reutilizável para o fluxo de sugestões da Roxou.

```
Fonte → Suggestion Engine → Admin → Aprovação → Produção
```

Nenhuma sugestão altera dados automaticamente. Todo commit em produção
depende de aprovação humana (Admin) em ondas futuras.

## Escopo desta onda

- Contratos (`types/`) para todas as sugestões (feature, venue, summary,
  category, contact, photo).
- Status canônicos: `pending | approved | rejected | expired`.
- Enum de fonte: `partner | admin | google | instagram | facebook | website | manual | ai`.
- Campo `confidence` (0–100) em todas as sugestões.
- `SuggestionService` com criação, aprovação, rejeição, expiração,
  agrupamento e merge.
- `SuggestionRepository` in-memory (sem Supabase, sem I/O).
- `adapters/` preparados para futuras fontes (Google Places, Instagram,
  Feature Engine, Venue Intelligence).

## Fora do escopo

- Persistência real (banco/Supabase).
- Integrações externas (Google, Instagram, IA).
- UI (Admin / Partner).
- Consumidores (Home, Discovery, Landing Pages).

## Consumo

Nenhum. A superfície pública é `@modules/discovery/suggestions` e será
consumida em ondas futuras. Não impacta bundle público, LCP, Discovery
Engine ou Feature Engine.
