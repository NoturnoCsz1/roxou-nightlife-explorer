# Arquitetura Futura — Roxou

Proposta comparada com o repositório atual. Não implementar cegamente.

## 1. Estrutura de pastas alvo

```txt
src/
  app/                            # Bootstrap comum (só o que é 100% shared)
    providers/
    router/                       # Utilitário de definição de rotas por produto
    guards/                       # ProtectedRoute, RoleGate genéricos

  modules/
    discovery/                    # Roxou Descobertas — bundle roxou.com.br
      pages/                      # V3Home, V3Discover, V3Agenda, V3EventDetail...
      layouts/                    # V3Layout, BottomNav, DesktopNav, Footer
      components/                 # EventCard, VenueList, PopularVenues, CategoryPills
      hooks/                      # useV3Profile, useSavedEvents, useSavedPartners
      services/                   # events, partners (readonly), sports, news
      seo/                        # SEOLanding, sitemap generator
      sports/                     # jogos, tabela, resultados, copa
      expo/                       # expo2026 público
      city/                       # /cidade/:slug (futuro)
      types/
      utils/
      entry/                      # main.tsx do bundle Descobertas

    partner/                      # Partner Pro — bundle parceiro.roxou.com.br
      pages/
      components/
      hooks/
      contexts/
      services/                   # crud dos recursos do parceiro
      public-contracts/           # tipos exportados p/ Descobertas consumir
      layouts/
      admin/                      # partnerPilot, partnerProCrm (admin do Partner)
      entry/

    transporte/                   # Transporte Roxou — bundle transporte.roxou.com.br
      passenger/
      driver/
      excursions/
      privativo/
      vans/
      fleet/
      maps/
      pricing/
      payments/
      finance/
      admin/
      public-contracts/           # publicExcursoes, CTA em evento
      layouts/
      entry/

    admin/                        # Admin Roxou — bundle admin.roxou.com.br (ou path)
      pages/
      eventos/                    # form + list + bulk
      estabelecimentos/
      crm/
      aura/
      radar/
      instagram/
      security/
      layouts/
      entry/

  shared/                         # SÓ o que é genuinamente cross-produto
    components/ui/                # shadcn
    components/                   # SafeHtml, SectionHeader, AuraBadge
    hooks/                        # use-toast, use-mobile
    utils/                        # calendar, formatRelativeTime, geo, pii, qrcode, sanitize, utm
    types/

  integrations/                   # Adapters de sistemas externos
    supabase/                     # client + types (auto-gen)
    lovable/                      # Lovable Auth
    google-maps/
    payments/
    ai/                           # Lovable AI Gateway wrapper
    analytics/                    # ga.ts, page tracking
    notifications/

  config/
    appRoutes.ts (por produto)
    adminNavigation.ts
    partnerNavigation.ts
    transporteNavigation.ts
```

## 2. Bundles independentes

Um `vite.config.ts` com múltiplos entries + `rollupOptions.input`:

```ts
build: {
  rollupOptions: {
    input: {
      public:  'src/modules/discovery/entry/main.tsx',
      partner: 'src/modules/partner/entry/main.tsx',
      transporte: 'src/modules/transporte/entry/main.tsx',
      admin:   'src/modules/admin/entry/main.tsx',
    }
  }
}
```

Alternativa: **múltiplos projetos Vite** com pacote `shared` compartilhado via workspaces. Mais seguro para deploy independente.

## 3. Contratos entre módulos

### Regras

- Um módulo **exporta** apenas via `public-contracts/index.ts`.
- Nenhum outro módulo importa de caminhos internos (`modules/X/pages/...`) — apenas `modules/X/public-contracts`.
- ESLint rule: `no-restricted-imports` bloqueando caminhos internos entre módulos.

### Exemplos

```ts
// modules/partner/public-contracts/index.ts
export type PublicPartner = { id, slug, name, address, ... };
export type PublicReservationSlot = { ... };
export type PublicVipListSummary = { ... };
export type PublicBio = { ... };

// modules/discovery consome:
import type { PublicPartner } from '@roxou/partner/public-contracts';
```

## 4. Autenticação

- Provider único do Supabase (localStorage/cookies compartilhados no domínio pai `.roxou.com.br`).
- Cada bundle instancia seu próprio `useAuth` a partir de `integrations/lovable`.
- Roles verificadas por `public.has_role(auth.uid(), 'role')` no RLS. UI usa hook `useRoleGuard(role)`.

## 5. Roteamento

- Cada bundle tem seu `BrowserRouter` próprio.
- Descobertas: catch-all `/*`.
- Partner: catch-all `/*` no subdomínio.
- Transporte: catch-all `/*` no subdomínio.
- Admin: pode viver em subdomínio ou em `roxou.com.br/admin/*` até migração completa.

## 6. Deploy

- Nginx serve `dist/public` para `roxou.com.br`, `dist/partner` para `parceiro.`, `dist/transporte` para `transporte.`.
- PM2/estático conforme `ecosystem.config.js`.
- Sitemap dinâmico por domínio (Edge Function com parâmetro `domain`).

## 7. Comparação com o repositório atual

| Aspecto | Hoje | Alvo |
|---|---|---|
| Bundles | 1 (+ partner secundário não usado em prod) | 3–4 independentes |
| Router | 1 `BrowserRouter` para 120 rotas | 1 por produto |
| Providers | `App.tsx` global | por produto |
| Componentes shared | dezenas com regra de negócio | shared enxuto |
| `supabase.from` em componentes | 13+ | 0 (só via services) |
| Testes | 1 exemplo | matriz por produto |
| SEO | disperso | `modules/discovery/seo/` |

## 8. Migrações necessárias

- Nada de banco: modularização é frontend-first.
- Ajustar `robots.txt` e `sitemap` por domínio.
- Ajustar Nginx (`NGINX_ROXOU.conf.example`) para roteamento por subdomínio.
- PWA: cada bundle com seu manifest e SW próprio (`public/manifest.json` por bundle).

## 9. Isolamento garantido

- Uma mudança em `modules/partner/**` reprocessa apenas o bundle Partner.
- ESLint rule bloqueia imports cruzados.
- CI opcional: um workflow por bundle (build + test).
