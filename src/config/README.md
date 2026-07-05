# src/config

Configuração estática do app (não confundir com variáveis de ambiente).

Arquivos atuais:

- `appRoutes.ts` — catálogo de rotas navegáveis (usado pelo
  `/dev/rotas`). Fonte única de verdade para descrever rotas ao
  Navigator interno.
- `adminNavigation.ts` — menu do painel admin.

Padrão para novos arquivos:

- `env.ts` (planejado) — tipagem/validação de `import.meta.env`.
- `partnerNavigation.ts` — atualmente em `src/apps/partner/config/`,
  candidato a mover para `modules/partner/config/` (não para cá).

Regras:

- Sem lógica de negócio.
- Sem chamadas a Supabase.
- Sem dependência de React (exceto tipos, se necessário).
