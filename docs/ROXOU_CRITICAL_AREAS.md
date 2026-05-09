# 🛑 Roxou — Áreas Críticas

Áreas que **NÃO** devem ser alteradas sem cuidado redobrado. Sempre testar manualmente após mexer.

---

## 1. Home pública
**Arquivos:** `src/pages/v3/V3Home.tsx`, `src/components/v3/home/*`, `src/components/v3/HeroCard.tsx`, `EventCardV3.tsx`, `ContentRail.tsx`

- **Risco:** quebrar conversão e SEO. Layout cinematográfico tem 4 eventos hero, momentum stats e fade-in.
- **Como testar:** abrir `/` mobile + desktop, validar carrossel, eventos de hoje, AdSense (não exibir empty), notícias.
- **Nunca alterar junto:** lógica de IA, Transporte, ou auth no mesmo prompt.

## 2. Helpers de Timezone
**Arquivos:** `src/lib/dateUtils.ts`

- **Risco:** quebrar lógica de "Hoje" e filtros de data em todo o app.
- **Regra:** sempre usar `getStartOfTodaySP`, `isTodaySP`, `getDateKeySP`. Nunca `getDay()` / `toISOString()` / `date-fns isToday`.
- **Como testar:** validar Home, Agenda, filtros, salvamento Supabase com sufixo `-03:00`.

## 3. Upload em Lote / IA de eventos
**Arquivos:** `src/pages/admin/EventoBulkForm.tsx`, `src/components/admin/AuraCreateEventModal.tsx`, edge functions `aura-organize-event`, `generate-description`, `extract-flyer-metadata`

- **Risco:** quebrar criação massiva de eventos e geração de copy.
- **Como testar:** rodar lote com 3 flyers no admin. Verificar deduplicação Eventou.

## 4. Edge Functions de IA
**Arquivos:** `supabase/functions/prudente-ai`, `aura-organize-event`, `generate-description`, `automatic-event-hunter`, `instagram-scraper`

- **Risco:** quebrar Aura chat e radar automático (cron 13h/18h).
- **Como testar:** smoke test de `/ia` e logs do hunter.

## 5. Roxou Transporte
**Arquivos:** `src/pages/v3/V3Transport.tsx`, `V3RideRequest.tsx`, `V3DriverBoard.tsx`, `V3MyRides.tsx`, `V3Chat.tsx`, `src/components/PedirCaronaGate.tsx`, `src/components/maps/RoxouRideMap.tsx`

- **Risco:** quebrar fluxo passageiro/motorista, GPS Android, chat realtime.
- **Como testar:** simular pedido com evento, sem evento (gate), erro de GPS, chat.

## 6. Cadastro de Motorista
**Arquivos:** `src/pages/CadastroMotorista.tsx`, `src/lib/driverValidation.ts`

- **Risco:** aceitar cadastros incompletos / quebrar onboarding.
- **Regras:** CPF + placa + telefone validados; selfie + veículo + placa obrigatórios; status `pending`.

## 7. Supabase Migrations
**Pasta:** `supabase/migrations/`

- **Nunca:** `ALTER DATABASE`, mexer em `auth/storage/realtime/vault/supabase_functions`.
- **Sempre:** RLS habilitada, `public.has_role()` para checks de admin (evita recursão), validações via trigger (não CHECK).

## 8. Auth
**Arquivos:** `src/pages/v3/V3Auth.tsx`, `src/hooks/useAuth.ts`, `useAdminProfile.ts`

- **Regra:** Google OAuth ativo, sem signups anônimos, sem auto-confirm a menos que pedido.
- **Risco:** quebrar login global e admin (`contato@roxou.com.br`).

## 9. Admin de Eventos
**Arquivos:** `src/pages/admin/EventoForm.tsx`, `EventoBulkForm.tsx`, `EventosList.tsx`, `EventouAdmin.tsx`, `src/lib/adminEventPayload.ts`

- **Risco:** quebrar publicação, deduplicação Eventou (4 sinais) e import enrichment.

## 10. Roxou Studio Renderer
**Arquivo:** `src/lib/coverRenderer.ts` (`renderStoryV3`, `renderCover*`)

- **Risco:** quebrar export 9:16 (1080×1920) e branding (badge AURA INDICA, dia da semana, CTA glass roxo).
- **Como testar:** gerar story em `/admin/instagram?tab=estudio`, conferir flyer nítido, gradiente cinematográfico, CTA suavizado.

---

## ⚠️ Regra de ouro
> **Um prompt = uma área crítica.** Nunca misturar Home + IA + Transporte + Auth no mesmo prompt.
