# FIX — Partner Pro: navegação de tabs, cards, ações rápidas e perfil

## Causa raiz

1. **Tabs do topo (NavLink) já estavam corretas**, mas a tela inicial (`/`,
   `PartnerBetaLandingPage`) renderizava cards apontando para
   `/admin/partner-preview/*` — rotas **inexistentes** no subdomínio
   `parceiro.roxou.com.br`. Esses paths caíam no catch‑all
   `<Route path="*" element={<Navigate to="/" replace />} />`, devolvendo o
   usuário à mesma tela inicial e produzindo a sensação de **"recarrega/não
   navega"**.
2. **Ações rápidas (`PartnerQuickActions`)** eram `<button disabled>` sem
   destino — clique não fazia nada.
3. **Widget de feedback** estava `fixed bottom-4 right-4 z-50`, cobrindo o
   botão "Salvar" sticky do `PartnerProfileEditor` em mobile.

O `PartnerProfileEditor` já chamava `updatePartnerProfile` corretamente
(com toast de sucesso/erro e exibição da mensagem real do RPC); o problema
percebido como "não salva" era visual — o botão ficava escondido pelo widget.

## Alterações

- `src/apps/partner/components/PartnerQuickActions.tsx`
  Trocados `<button disabled>` por `<Link to=...>` reais:
  `/eventos/novo`, `/reservas`, `/lista-vip`, `/analytics`, `/configuracoes`.
- `src/apps/partner/pages/PartnerBetaLandingPage.tsx`
  Cards passam a apontar para rotas standalone do Partner Pro:
  `/eventos`, `/reservas`, `/lista-vip`, `/analytics`, `/perfil`,
  `/configuracoes`.
- `src/apps/partner/components/PartnerFeedbackWidget.tsx`
  Posição passou para `bottom-20 right-4 z-40 md:bottom-6`, liberando o
  botão "Salvar" sticky em mobile.

## Fora de escopo (não tocados)

Roxou pública, Admin antigo, Nginx, Google OAuth, RLS, migrations,
edge functions, `partnerProfile` service, RPC `update_partner_safe_profile`.

## Validação manual

- 360 / 390 px: tabs do topo navegam (NavLink já correto).
- Cards da home (`/`) abrem as respectivas rotas.
- Ações rápidas do dashboard navegam (`/eventos/novo`, `/reservas`, etc.).
- Editor de perfil: digitar descrição curta / Instagram / WhatsApp → "Salvar"
  agora visível acima do widget; toast "Alterações salvas" e persistência ao
  recarregar.
- Sem overflow horizontal.
