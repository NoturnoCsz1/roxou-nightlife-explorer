# modules/transport

**Domínio:** produto Roxou Mobilidade — Caronas, Excursões, Privativo e
área do Motorista.

## Estrutura (Onda 12)

```
transport/
  excursoes/
    repositories/  # publicExcursoesRepository (RPC público)
    services/      # excursionGpsService (GPS + realtime)
  rides/
    repositories/  # ridesRepository (ride_requests / ride_offers)
  index.ts         # barrel público — única entrada permitida
```

Reservados para próximas ondas: `drivers/`, `requests/`, `chat/`,
`tracking/`, `maps/`, `hooks/`, `types/`, `shared/`.

## Regras

- Consumidores externos importam SEMPRE de `@modules/transport`.
- Não importar caminhos internos (`@modules/transport/excursoes/...`)
  fora do próprio módulo.
- Nada de Supabase inline nas páginas de Transporte — toda I/O passa
  por repository/service deste módulo.
- Não depende de Discovery, Partner Pro, Admin ou Eventos em Lote.

## Não pertence

- Dashboard financeiro do motorista → `modules/motorista` (futuro).
- Taxonomia / categoryConfig legado → permanece em `src/lib`.
