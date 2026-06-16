# FASE 09C — Camada de Acesso do Partner Pro (frontend)

Data: 2026-06-16
Status: ✅ Concluída

## Escopo

Criar a camada de acesso do Roxou Partner Pro no frontend, sem ativar rotas
públicas, sem mexer em RLS, sem criar `partner_profiles` e sem alterar Admin
ou Roxou pública. A fonte única dos estabelecimentos continua sendo `partners`
e os vínculos vivem em `partner_users` (criada na 9B).

## Arquivos criados

- `src/apps/partner/services/partnerAuth.ts`
- `src/apps/partner/hooks/usePartnerAuth.ts`
- `src/apps/partner/contexts/PartnerContext.tsx`

## Arquivos atualizados (placeholders)

- `src/apps/partner/pages/PartnerDashboardPage.tsx`
- `src/apps/partner/pages/PartnerProfilePage.tsx`

Demais placeholders permanecem inalterados — qualquer página que precise do
contexto pode chamar `usePartnerAuth()`.

## API do serviço

```ts
getCurrentPartnerUser(): Promise<User | null>
listMyPartners(): Promise<PartnerAccess[]>
getPartnerAccess(partnerId): Promise<PartnerAccess | null>
getCurrentPartnerSubscription(partnerId): Promise<PartnerSubscription | null>
isPartnerOwnerOrAdmin(partnerId): Promise<boolean>
requirePartnerAccess(partnerId): Promise<PartnerAccess>  // throws sem acesso
```

`PartnerSummary` reflete somente colunas reais da tabela `partners`:
`id, name, slug, logo_url, city, type`.

## Hook `usePartnerAuth`

Deve ser usado dentro de `<PartnerProvider/>`. Retorno:

```ts
{
  user,                       // User | null
  partners,                   // PartnerAccess[]
  selectedPartner,            // PartnerSummary | null
  selectedPartnerId,          // string | null
  role,                       // 'owner' | 'admin' | 'editor' | 'attendant' | null
  subscription,               // PartnerSubscription | null
  isLoading, error,
  canEditProfile,             // owner|admin
  canManageEvents,            // owner|admin|editor
  canManageReservations,      // owner|admin|attendant
  canViewAnalytics,           // owner|admin
  setSelectedPartnerId,
  refresh,
}
```

### Exemplo de retorno

```ts
{
  user: { id: "uuid…", email: "dono@bar.com", … },
  partners: [
    { linkId, role: "owner", isActive: true,
      partner: { id, name: "Bar X", slug: "bar-x", logo_url, city: "PP", type: "bar" } }
  ],
  selectedPartner: { id, name: "Bar X", … },
  selectedPartnerId: "uuid…",
  role: "owner",
  subscription: { plan: "free", status: "trial", … },
  isLoading: false,
  canEditProfile: true, canManageEvents: true,
  canManageReservations: true, canViewAnalytics: true,
}
```

## Persistência da seleção

`localStorage["roxou.partner.selectedPartnerId"]`. Estratégia:

1. Na carga, lê do storage.
2. Se o id armazenado ainda existir na lista de partners do usuário → mantém.
3. Caso contrário → cai para o primeiro partner da lista.
4. `setSelectedPartnerId(id | null)` atualiza estado + storage.

## Permissões

| Capacidade            | owner | admin | editor | attendant |
|-----------------------|:-----:|:-----:|:------:|:---------:|
| canEditProfile        |  ✅   |  ✅   |   ❌   |    ❌     |
| canManageEvents       |  ✅   |  ✅   |   ✅   |    ❌     |
| canManageReservations |  ✅   |  ✅   |   ❌   |    ✅     |
| canViewAnalytics      |  ✅   |  ✅   |   ❌   |    ❌     |

Vistas de dashboard básico ficam abertas a qualquer role ativo
(controle feito a nível de página/seção em fases futuras).

## Limites atuais

- Nenhuma rota registrada — provider só será montado no app parceiro futuro.
- Sem subdomínio `parceiro.roxou.com.br` ainda.
- Sem multi-entry no Vite.
- Sem fluxo de convite/onboarding — vínculos em `partner_users` ainda são
  inseridos manualmente via admin.
- Sem mutações de perfil ainda — `PartnerProfilePage` apenas mostra estado.
- Sem analytics, sem reservas, sem lista VIP — placeholders permanecem.

## Validação

- `npx tsc --noEmit` verde
- `npx eslint` sem warnings nos arquivos novos
- Bundle público inalterado: nada novo é importado pelo `App.tsx`
- Nenhuma rota nova exposta
