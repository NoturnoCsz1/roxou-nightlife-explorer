# FASE 8A — Matriz de dependências V3

Somente leitura. Mapeia importadores reais (declarações `import`) que ainda
dependem de qualquer artefato V3.

## Símbolos V3 vivos

| Grupo                 | Arquivo                                  | Tipo            |
| --------------------- | ---------------------------------------- | --------------- |
| `pages/v3/*`          | 18 arquivos em `src/pages/v3/`           | rota lazy       |
| `components/v3/*`     | 23 arquivos em `src/components/v3/`      | UI compartilhada |
| `lib/v3*`             | `src/lib/v3Validation.ts`                | validação        |
| `hooks/useV3*`        | `src/hooks/useV3Profile.ts`              | hook auth/profile |
| `V3Profile` (símbolo) | `src/pages/v3/V3Profile.tsx` (default)   | rota             |

## Importadores externos por grupo

### `src/pages/v3/*` consumido por

| Consumidor                              | Alvo                          |
| --------------------------------------- | ----------------------------- |
| `src/App.tsx`                           | todos os `pages/v3/V3*`       |
| `src/components/PedirCaronaGate.tsx`    | `@/pages/v3/V3RideRequest`    |

### `src/components/v3/*` consumido por

| Consumidor                                                    | Alvo                                       |
| ------------------------------------------------------------- | ------------------------------------------ |
| `src/pages/v3/V3Agenda.tsx`                                   | `@/components/v3/V3SearchBar`              |
| `src/pages/v3/V3AIChat.tsx`                                   | `AuraAvatar`, `VIPPaywallModal`            |
| `src/pages/v3/V3DriverBoard.tsx`                              | `LegalDisclaimer`, `ReportDialog`          |
| `src/pages/v3/V3EventDetail.tsx`                              | `ReservationDrawer`, `EventPresence`, `EventLivePresence`, `V3Skeletons` |
| `src/pages/v3/V3LocalDetail.tsx`                              | `EventCardV3`, `local/AuraVenueInsights`, `local/AuraVenuePricing`, `local/AuraVenueRankingBadges`, `local/PartnerInstagramFeed` |
| `src/pages/v3/V3ProfileEdit.tsx`                              | `CommunityConsentModal`, `ImageCropModal`  |
| `src/pages/v3/V3RideRequest.tsx`                              | `LegalDisclaimer`                          |
| `src/pages/v3/V3TermsAcceptance.tsx`                          | `LegalDisclaimer`                          |
| `src/pages/v3/V3Transport.tsx`                                | `LegalDisclaimer`, `V3Skeletons`           |
| `src/apps/public/home/HomeCommandCenter.tsx`                  | `V3SearchBar`, `V3VibeChips`, `SmartImage`, `AIHomeWidget`, `home/WeeklySpotlight`, `home/FadeSection`, `home/TodayTimeline` |
| `src/apps/public/home/HomeCuradoria.tsx`                      | `SmartImage`, `ReservationDrawer`          |
| `src/apps/public/home/HomeDesktop.tsx`                        | `home/HomeSectionBoundary`, `home/CopaHighlightCard`, `home/LatestNewsSection`, `home/MostViewedNews` |
| `src/apps/public/home/HomeHero.tsx`                           | `SmartImage`                               |
| `src/apps/public/home/HomeMobile.tsx`                         | `home/HomeSectionBoundary`, `home/TodaySection`, `home/TodayTimeline`, `home/CopaHighlightCard`, `home/WeeklySpotlight`, `home/FadeSection`, `V3SearchBar`, `V3VibeChips`, `CategoryChips`, `AIHomeWidget`, `home/LatestNewsSection` |
| `src/apps/public/home/HomeSections.tsx`                       | `home/FadeSection`                         |
| `src/apps/public/home/HomeSidebar.tsx`                        | `SmartImage`                               |
| `src/components/v3/AIHomeWidget.tsx`                          | `AuraAvatar`                               |
| `src/components/v3/EventCardV3.tsx`                           | `ReservationDrawer`, `SmartImage`          |
| `src/components/v3/HeroCard.tsx`                              | `SmartImage`                               |
| `src/components/v3/V3Layout.tsx`                              | `PullToRefresh`, `AuraAvatar`              |
| `src/components/v3/home/LatestNewsSection.tsx`                | `SmartImage`                               |
| `src/components/v3/home/MostViewedNews.tsx`                   | `SmartImage`                               |

### `src/lib/v3Validation.ts` consumido por

| Consumidor                          | Símbolos                          |
| ----------------------------------- | --------------------------------- |
| `src/pages/v3/V3RideRequest.tsx`    | `maskWhatsappBR`                  |
| `src/pages/v3/V3ProfileEdit.tsx`    | `profileSchema`, `maskWhatsappBR` |

### `useV3Profile` consumido por

| Consumidor                                       |
| ------------------------------------------------ |
| `src/components/v3/AIHomeWidget.tsx`             |
| `src/components/v3/CommunityConsentModal.tsx`    |
| `src/components/v3/V3Layout.tsx`                 |
| `src/pages/v3/V3AIChat.tsx`                      |
| `src/pages/v3/V3Chat.tsx`                        |
| `src/pages/v3/V3DriverBoard.tsx`                 |
| `src/pages/v3/V3MyRides.tsx`                     |
| `src/pages/v3/V3Profile.tsx`                     |
| `src/pages/v3/V3ProfileEdit.tsx`                 |
| `src/pages/v3/V3Transport.tsx`                   |
| `src/apps/public/home/HomeSidebar.tsx`           |

### `V3Profile` (símbolo) consumido por

| Consumidor       | Uso                                       |
| ---------------- | ----------------------------------------- |
| `src/App.tsx`    | `lazy(() => import("./pages/v3/V3Profile"))`, rota `/v3/perfil` |

## Observações

- A Home pública atual (`src/apps/public/home/*`) ainda depende fortemente de
  `components/v3/*` e `hooks/useV3Profile`. Remover/renomear o prefixo V3
  exige atualizar simultaneamente esses 7 arquivos da Home.
- Não há nenhum importador em código-fonte de produção que dependa de
  `src/pages/admin/*` (ver `FASE_08A_shim_dependency_map.md`).
