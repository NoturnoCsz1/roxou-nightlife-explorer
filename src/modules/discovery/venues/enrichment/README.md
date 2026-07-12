# Venue Intelligence (Onda 15)

Infraestrutura para enriquecimento inteligente das páginas de estabelecimentos.

**Escopo desta onda:** apenas contratos, adapters vazios, repository no-op e
services stub. Nenhuma integração real, nenhum scraping, nenhuma alteração
de banco, UI, rotas ou Discovery Engine.

## Estrutura

```
enrichment/
  types/          contratos (VenueProfile, VenueEnrichmentSuggestion, LeadAttribution, ExternalSource)
  adapters/       Google Places, Instagram (stubs)
  repositories/   venueEnrichmentRepository (no-op)
  services/       VenueEnrichmentService, whatsappLinkService
  index.ts        barrel público
```

## Como consumir (futuro)

```ts
import {
  VenueEnrichmentService,
  buildWhatsappLink,
  googlePlacesAdapter,
  instagramAdapter,
} from "@/modules/discovery/venues/enrichment";
```

## O que NÃO fazer

- Não importar caminhos internos (`.../services/xxx`) — usar o barrel.
- Não adicionar chamadas Supabase / APIs externas sem uma nova onda dedicada.
- Não expor esse módulo fora de `@modules/discovery/**` sem promover a
  `@contracts/discovery`.
