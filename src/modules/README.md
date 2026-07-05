# src/modules

Um módulo por domínio de negócio. Regras:

- Um módulo **pode** importar de `shared/*`, `integrations/*` e
  `config/*`.
- Um módulo **não pode** importar de outro módulo. Se precisar,
  extraia o pedaço compartilhado para `shared/`.
- Cada módulo é responsável por suas próprias rotas, páginas,
  componentes, serviços e tipos.

Módulos:

- `portal/` — Prudente RM / Roxou V3 (público).
- `partner/` — Partner Pro + páginas públicas do parceiro.
- `motorista/` — painel do motorista (novo, a construir).
- `transporte/` — excursões, caronas, privativo, admin de transporte.

Admin (Roxou interno) ganhará seu próprio módulo em `modules/admin/`
na Etapa 7 do plano.
