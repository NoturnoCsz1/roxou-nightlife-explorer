# Auditoria de Performance por Produto

Baseada nas ondas anteriores (LCP-4A → LCP-4F-1-B) e no estado atual de `vite.config.ts`.

## 1. Bundle atual (single-bundle)

Um único `dist/` serve Descobertas + Admin + Partner + Transporte. Impacto:

- **Descobertas Home mobile carrega**: `main`, `vendor-react`, `vendor-recharts` (side-effect residual pós LCP-4F-1-B), `vendor-qrcode` (side-effect), `V3Layout`, `V3Home`, `BottomNav`, `DesktopNav`, `Footer`.
- **Chunks Admin/Partner/Transporte** são lazy — não descem, mas seus **layouts wrappers** (`AdminLayout`, `PartnerPreviewLayout`) estão importados estaticamente em `App.tsx`, arrastando CSS Tailwind e providers para o bundle público.

## 2. Métricas herdadas

Da LCP-4E:
- LCP Home mobile: **~18s** em conexão média.
- Payload total: **12.23 MB**.
- Imagens economizáveis: **10.6 MB**.
- JS não usado no primeiro paint: **517 KiB**.
- Recharts leak: **-42 KiB gzip** após LCP-4F-1-B (parcial). Chunk ainda baixado como side-effect.
- QRCode: **~80 KiB gzip** side-effect ainda presente.

## 3. Impacto por produto no bundle público

| Produto | Peso estimado no bundle público hoje | Deveria ser |
|---|---|---|
| Descobertas | ~55% | 100% |
| Admin (layout + providers) | ~10% | 0% (bundle separado) |
| Partner (layout + PartnerPreview) | ~15% | 0% (bundle separado) |
| Transporte (rotas lazy + services) | ~10% | 0% (bundle separado) |
| Shared UI/utils | ~10% | 10% |

## 4. Imports pesados detectados

- `recharts` (~112 KiB gzip pós reorganização): usado por AnalyticsHero, BioHomeTab, Expo2026Admin, PartnerPromoterCentralPage, `components/ui/chart.tsx` (órfão). **Nenhum consumidor na Home**.
- `qrcode` (~80 KiB gzip): usado em Partner/VIP QR + Excursão QR.
- `leaflet` — verificar (não confirmado neste grep).
- `date-fns` — verificar tree-shaking, especialmente locales.
- `@tanstack/react-query` — usado por todos os produtos.
- Componentes de IA (chat, radar) — via edge functions, não bundle-side.

## 5. React Query providers globais

- Um único `QueryClient` no `App.tsx`. Cache compartilhado entre produtos → potencial vazamento entre roles.
- Após split de bundles, cada produto terá seu próprio `QueryClient` (isolando cache).

## 6. Render tree desnecessário

- `V3Layout` monta `BottomNav`, `DesktopNav`, `Footer`, `usePageTracking`, `useV3Profile` para todas as rotas que herdam de `/`, incluindo Transporte (`/transportes/*`) e Comunidade.
- `AdminMaintenanceGate` roda para **toda** requisição, mesmo pública.

## 7. Timers / Intervalos ativos

- `useEventLivePresence`, `useEventPresence` — polling em rota de evento (OK, escopo local).
- `usePageTracking` — sempre ativo (OK).
- `community_presence` realtime — apenas em `/comunidade` (verificar).

## 8. Fontes

- Google Fonts (Space Grotesk + Inter). Verificar `preconnect` + `font-display: swap` no `index.html`.
- Considerar self-host + `preload` para peso do LCP.

## 9. Imagens

- 10.6 MB economizáveis (auditoria 4E). Causas prováveis:
  - Flyers de evento não convertidos para WebP/AVIF.
  - Sem `srcset` / `sizes` responsivos.
  - Sem `loading="lazy"` fora do LCP.
  - `og-image.png` fixo 1200x630 pesado.

## 10. Correções prioritárias (não aplicar agora)

1. **Split de bundles por produto** (ver `arquitetura-futura-roxou.md`).
2. Remover `AdminLayout` e `PartnerPreviewLayout` do `App.tsx` público.
3. Isolar Recharts com `defer` / dynamic import em cada consumidor (nunca no barrel).
4. Idem QRCode.
5. Pipeline de imagens (Supabase Storage transform ou build-time).
6. Self-host de fontes.
7. Retirar `V3Layout` das rotas de Transporte (layout próprio).

## 11. Isolamento por produto

Após split:
- Alteração em Partner Pro **não** reprocessa bundle público.
- Alteração em Transporte **não** afeta cache de Descobertas.
- Deploy independente possível (Nginx por subdomínio, cada `dist/*`).
