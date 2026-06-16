# Fase 9J — Beta interno do Partner Pro

## Objetivo
Ativar o Partner Pro **internamente** para teste, sem criar subdomínio
(`parceiro.roxou.com.br`) e sem expor no menu público. Acesso restrito a
administradores Roxou.

## Rotas internas
Todas montadas como rotas **filhas de `/admin`**, herdando o gate de
`AdminLayout` (`isAdmin` via `user_roles`):

```
/admin/partner-preview                 → PartnerDashboardPage
/admin/partner-preview/perfil          → PartnerProfilePage
/admin/partner-preview/eventos         → PartnerEventsPage
/admin/partner-preview/reservas        → PartnerReservationsPage
/admin/partner-preview/lista-vip       → PartnerVipListPage
/admin/partner-preview/lista-vip/:listId → PartnerVipListDetailPage
/admin/partner-preview/analytics       → PartnerAnalyticsPage
/admin/partner-preview/configuracoes   → PartnerSettingsPage
```

## Como o acesso é controlado
1. `AdminLayout` já redireciona qualquer usuário não-admin para `/`.
2. As rotas do preview são **nested** dentro de `<Route path="/admin">`, então
   herdam esse gate automaticamente. Não há rota pública nova.
3. As mutações continuam protegidas por RLS + RPCs `SECURITY DEFINER`
   (Fases 9B/9F/9G/9H/9I), que validam `partner_users` ou `is_admin()`.

## Camada de layout
Criado `src/apps/partner/layouts/PartnerPreviewLayout.tsx`:
- Envolve as páginas em `<PartnerProvider/>` (carrega user, partners, role,
  subscription).
- Mostra banner **"Beta interno"** e sub-navegação entre as seções.
- Não cria header/footer novo do app público — vive dentro do shell do Admin.

## Wrapper de rota
`src/apps/partner/routes/PartnerVipListDetailRoute.tsx` consome `useParams`
para alimentar `PartnerVipListDetailPage(listId)` que espera prop tipada.

## Menu admin
Adicionado em `src/config/adminNavigation.ts`:
```ts
{ to: "/admin/partner-preview", icon: Briefcase, label: "Partner Pro Preview" }
```
Visível no sidebar/bottom-nav do Admin para todos os admins. Banner amarelo
deixa claro que é beta interno.

## Lazy loading
Todas as páginas e o layout são `lazy(() => import(...))` em `App.tsx` para
não impactar o bundle público. Cada rota usa o helper `L()` com
`<Suspense fallback={<LazyFallback/>}>`.

## Não alterado
- Subdomínio `parceiro.roxou.com.br` — não criado.
- `vite.config.ts` multi-entry — não criado.
- `nginx` — não tocado.
- Roxou pública, V3, Auth, edge functions — intocados.

## Validação
- `npx tsc --noEmit` ✅ verde.
- `App.tsx` agora referencia as páginas do `src/apps/partner/pages/*` (antes
  eram órfãs); fora isso, nenhuma rota pública nova.
- Admin Roxou consegue acessar `/admin/partner-preview/*`.
- Usuário comum → `AdminLayout` redireciona para `/`.
- Não autenticado → `AdminLayout` redireciona para `/admin/login`.
- Sem ChunkLoadError esperado (todos os imports lazy estão tipados como
  default exports válidos).

## Próximas fases sugeridas
- 9K: criar `parceiro.roxou.com.br` (multi-entry Vite + nginx) e migrar as
  rotas internas para o subdomínio.
- 9L: onboarding público de novos parceiros + autosserviço de pagamento.
