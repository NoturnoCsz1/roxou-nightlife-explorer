# Fase 9M — Subdomínio parceiro.roxou.com.br

Data: 2026-06-16
Status: build verde, multi-entry configurado, beta fechado mantido.

## O que foi entregue

### Arquivos criados

- `partner/index.html` — entry HTML do bundle Partner Pro.
- `src/apps/partner/main.tsx` — bootstrap React (sem `registerSW`,
  PWA fica reservado ao bundle principal).
- `src/apps/partner/App.tsx` — `BrowserRouter` standalone com
  `QueryClientProvider`, `TooltipProvider`, toasters e rotas lazy.
- `src/apps/partner/layouts/PartnerStandaloneLayout.tsx` — espelho
  do `PartnerPreviewLayout` com rotas na raiz (`/`, `/dashboard`,
  `/perfil`, `/eventos`, `/reservas`, `/lista-vip`, `/analytics`,
  `/configuracoes`).
- `src/apps/partner/routes/PartnerEventRoutes.tsx` — wrappers
  (`PartnerEventNewRoute`, `PartnerEventDetailRoute`,
  `PartnerEventEditRoute`) que adaptam as páginas baseadas em props
  para `useParams` + `useNavigate`.

### Arquivos editados

- `vite.config.ts` — adicionado `build.rollupOptions.input` com duas
  entradas:

  ```ts
  build: {
    rollupOptions: {
      input: {
        main:    path.resolve(__dirname, "index.html"),
        partner: path.resolve(__dirname, "partner/index.html"),
      },
    },
  }
  ```

  Demais blocos (server, preview, plugins, PWA, alias, dedupe) ficam
  inalterados.

### Rotas Partner Pro (subdomínio)

| Rota                       | Componente                                 |
|----------------------------|--------------------------------------------|
| `/`                        | `PartnerBetaLandingPage`                   |
| `/login`                   | `PartnerLoginPage` (placeholder atual)     |
| `/dashboard`               | `PartnerDashboardPage`                     |
| `/perfil`                  | `PartnerProfilePage`                       |
| `/eventos`                 | `PartnerEventsPage`                        |
| `/eventos/novo`            | `PartnerEventNewRoute`                     |
| `/eventos/:eventId`        | `PartnerEventDetailRoute`                  |
| `/eventos/:eventId/editar` | `PartnerEventEditRoute`                    |
| `/reservas`                | `PartnerReservationsPage`                  |
| `/reservas/:reservationId` | `PartnerReservationDetailPage`             |
| `/lista-vip`               | `PartnerVipListPage`                       |
| `/lista-vip/:listId`       | `PartnerVipListDetailRoute`                |
| `/analytics`               | `PartnerAnalyticsPage`                     |
| `/configuracoes`           | `PartnerSettingsPage`                      |
| `*`                        | `Navigate to="/"`                          |

### Reutilização

Tudo do beta interno é reaproveitado sem fork:

- `PartnerProvider` / `partnerContextValue`
- `usePartnerAuth`, `usePartnerBetaAccess`
- `PartnerFeedbackWidget`
- páginas, formulários, serviços (`partnerEvents`,
  `partnerReservations`, `partnerVipLists`, `partnerProfile`,
  `partnerBeta`)

### Segurança (beta fechado mantido)

- Gate de acesso é o mesmo do Preview: `usePartnerBetaAccess` valida
  `has_role(admin)` ou registro ativo em `partner_beta_access`.
- Usuário não autenticado é redirecionado para `/login`.
- Usuário autenticado sem acesso vê o card "Beta Fechado".
- Sem cadastro público / auto-onboarding.
- Nenhuma alteração em RLS, edge functions, banco ou no PWA da Roxou
  pública.

## Build

```
$ npx tsc --noEmit   # verde
$ npx vite build     # verde
✓ built in 12.83s
```

Saída relevante:

```
dist/
├── index.html                 # roxou.com.br (público + admin)
├── partner/
│   └── index.html             # parceiro.roxou.com.br (Partner Pro)
├── assets/                    # chunks com hash, compartilhados
├── sw.js, workbox-*.js        # PWA do bundle principal
└── manifest.webmanifest
```

O `partner/index.html` referencia `/assets/<hash>.js` — os chunks
ficam num único diretório `dist/assets/` servido pelos dois hosts.

## Instrução Nginx

Resumo: dois `server` blocks. Ambos apontam para a **mesma** pasta
`dist/`. O subdomínio reescreve a raiz para `dist/partner/index.html`,
mas mantém `/assets/` na raiz comum.

```nginx
# ============ roxou.com.br (público + admin) ============
server {
  listen 443 ssl http2;
  server_name roxou.com.br www.roxou.com.br;

  root /var/www/roxou/dist;
  index index.html;

  # SPA fallback
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Long-term cache para assets com hash
  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    try_files $uri =404;
  }
}

# ============ parceiro.roxou.com.br (Partner Pro) ============
server {
  listen 443 ssl http2;
  server_name parceiro.roxou.com.br;

  root /var/www/roxou/dist;     # mesma raiz (assets compartilhados)
  index partner/index.html;

  # SPA fallback → dist/partner/index.html
  location / {
    try_files $uri $uri/ /partner/index.html;
  }

  # Assets com hash continuam em /assets/
  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    try_files $uri =404;
  }

  # Recomendado: bloquear o service worker do bundle principal
  # no subdomínio (Partner Pro não é PWA).
  location = /sw.js            { return 404; }
  location = /manifest.webmanifest { return 404; }

  # noindex já vem no <meta> do partner/index.html; reforçar via header:
  add_header X-Robots-Tag "noindex, nofollow" always;
}
```

### DNS

Adicionar registro `A` (ou `CNAME` apontando para `roxou.com.br`)
para `parceiro` → IP do VPS. SSL via Let’s Encrypt (`certbot --nginx
-d parceiro.roxou.com.br`).

### Verificação rápida pós-deploy

```
curl -I https://parceiro.roxou.com.br/                  # 200 (index.html do partner)
curl -I https://parceiro.roxou.com.br/dashboard         # 200 (SPA fallback)
curl -I https://parceiro.roxou.com.br/assets/main-*.js  # 200
curl -I https://parceiro.roxou.com.br/sw.js             # 404 (bloqueado)
curl -I https://roxou.com.br/                           # 200 (bundle principal intacto)
```

## O que NÃO mudou

- `index.html` raiz, `src/main.tsx`, `src/App.tsx` — Roxou pública e
  Admin atual continuam intactos.
- `/admin/partner-preview/*` — preview interno da Fase 9J continua
  ativo no host principal.
- Nenhuma migration, edge function ou política RLS foi tocada.
- PWA da Roxou pública continua registrando normalmente; o bundle
  Partner Pro **não** registra service worker.

## Próximos passos (fora do escopo)

- Fase 9N: deploy do Nginx + DNS em produção.
- Fase 9O: login Google/email real em `/login` (hoje placeholder).
- Fase 9P: cadastro público e auto-onboarding de novos parceiros.
