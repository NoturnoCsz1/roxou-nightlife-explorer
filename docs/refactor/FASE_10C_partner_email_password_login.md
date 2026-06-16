# FASE 10C — Partner Pro: Login por e-mail e senha

## Contexto
O Google OAuth no subdomínio `parceiro.roxou.com.br` retorna:
```
{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: missing OAuth secret"}
```
O provider Google do projeto Supabase está sem OAuth Secret nativo. Para
não travar o piloto Partner Pro, habilitamos login por e-mail e senha
como caminho principal e deixamos o botão Google secundário, marcado
como "em breve" via flag `GOOGLE_ENABLED = false`.

## Escopo
Alterações localizadas em `src/apps/partner/pages/PartnerLoginPage.tsx`:

- Formulário com campos `email` e `password`.
- Submit → `supabase.auth.signInWithPassword({ email, password })`.
- Após sucesso, `resolveDestination(userId)` roteia para:
  - `/dashboard` se houver `partner_beta_access.access_enabled = true`
    ou `partner_users.is_active = true`;
  - `/pending` se houver `partner_access_requests` com `status = pending`;
  - `/onboarding` caso contrário.
- Erro de credenciais → toast `"E-mail ou senha inválidos."`.
- Link "Esqueci minha senha" → `supabase.auth.resetPasswordForEmail(email, { redirectTo: \`${window.location.origin}/login\` })`.
- Link "Solicitar acesso" → leva ao `/onboarding` (ou destino resolvido,
  se já logado).
- Botão Google preservado, desabilitado com label "(em breve)" enquanto
  `GOOGLE_ENABLED = false`. Para reativar, basta alternar a flag depois
  que o OAuth secret estiver configurado no projeto Supabase.

## Fora de escopo
- Roxou pública, Admin, RLS, Nginx, banco e edge functions não foram
  alterados.
- Nenhuma migration foi criada.

## Validação
- `usuário existente` consegue logar com e-mail/senha.
- `usuário sem acesso` é redirecionado para `/onboarding`.
- `usuário pending` é redirecionado para `/pending`.
- `usuário aprovado` é redirecionado para `/dashboard`.
- TSC/ESLint: sem novos erros.

## Próximos passos
1. Configurar OAuth Secret do Google no provider Supabase
   (`bapdgykghciiyvlqdrqx`).
2. Alternar `GOOGLE_ENABLED` para `true` em `PartnerLoginPage.tsx`.
3. Manter e-mail/senha como fallback definitivo.
