/**
 * Barrel público do módulo Transporte (Onda 12).
 *
 * Superfície única para consumidores externos (páginas públicas,
 * área do parceiro, admin). NÃO importe caminhos internos
 * (`@modules/transport/excursoes/...`) fora deste módulo.
 *
 * Sub-domínios:
 *  - `excursoes`: viagens públicas (RPC), assentos, tickets, GPS live.
 *  - `rides`:     caronas / ofertas / requisições.
 *
 * Referências futuras (não implementadas nesta onda):
 *  - `drivers/`, `requests/`, `chat/`, `tracking/`, `maps/`.
 */
export * from "./excursoes";
export * from "./rides";
