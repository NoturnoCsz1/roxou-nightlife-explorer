# src/integrations

Adapters de sistemas externos. Cada sub-pasta encapsula **um único
serviço**. Regras:

- Módulos (`modules/*`) só falam com serviços externos **através** de
  integrations.
- Nenhum arquivo aqui deve importar de `modules/*`.
- Segredos ficam em variáveis de ambiente / Supabase Secrets — nunca
  hardcoded.

Sub-pastas:

- `supabase/` — client auto-gerado (`client.ts`, `types.ts`). Não
  editar manualmente.
- `lovable/` — Lovable Auth (`createLovableAuth`).
- `google-maps/` — a receber os componentes atuais em
  `src/components/maps/*` e o wrapper para Places/Routes.
- `payments/` — placeholder para integração de pagamentos
  (excursões, privativo, assinaturas). Ainda não implementado.

**Status:** `supabase/` e `lovable/` já existem e permanecem intocados.
`google-maps/` e `payments/` foram criadas vazias nesta etapa.
