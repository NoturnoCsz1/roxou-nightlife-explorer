

# ROXOU Admin Panel — Implementation Plan

## Overview

Build a complete admin panel for ROXOU with partners/venues management, event creation linked to partners (with auto-fill), and an analytics dashboard. The public website remains untouched. An external Supabase project will be connected for the database.

## Prerequisites

Connect an external Supabase project to this Lovable project before implementation begins.

---

## Phase 1 — Database Setup (Supabase Migrations)

### Tables to create:

**`partners`** — venues/establishments
- `id` (uuid, PK), `name`, `slug`, `type`, `address`, `neighborhood`, `city`, `instagram`, `whatsapp`, `short_description`, `full_description`, `logo_url`, `verified_partner` (bool), `active` (bool), `created_at`

**`events`** — nightlife events
- `id` (uuid, PK), `title`, `slug`, `description`, `date_time` (timestamptz), `category`, `partner_id` (FK nullable → partners), `venue_name`, `address`, `instagram`, `status` (draft/published), `verification_source`, `featured` (bool), `image_url`, `created_at`

**`page_views`** — analytics tracking
- `id`, `page_path`, `event_id` (nullable), `partner_id` (nullable), `device_type`, `city`, `region`, `country`, `session_id`, `created_at`

**`visitor_sessions`** — session tracking
- `id`, `session_id`, `started_at`, `last_seen_at`, `device_type`, `city`, `region`, `country`

RLS policies: allow public read on partners/events (where active/published), allow authenticated insert/update/delete for admin, allow anonymous insert on analytics tables.

---

## Phase 2 — Supabase Client & Types

- Generate TypeScript types from the schema
- Create `src/integrations/supabase/client.ts` with the Supabase client
- Create hooks: `usePartners`, `useEvents`, `useAnalytics` using `@tanstack/react-query`

---

## Phase 3 — Admin Layout & Routing

### New routes in `App.tsx`:
- `/admin` → redirect to `/admin/dashboard`
- `/admin/dashboard` → Analytics dashboard
- `/admin/parceiros` → Partners list
- `/admin/parceiros/novo` → New partner form
- `/admin/parceiros/:id/editar` → Edit partner form
- `/admin/eventos` → Events list
- `/admin/eventos/novo` → New event form
- `/admin/eventos/:id/editar` → Edit event form

### Admin layout component:
- `AdminLayout.tsx` — compact sidebar/header with nav links, mobile-friendly
- Dark professional theme consistent with ROXOU identity but cleaner
- Compact header with ROXOU logo + "Admin" label
- Mobile bottom nav or collapsible sidebar

---

## Phase 4 — Partners Management

### `/admin/parceiros` — Partner list page
- Compact table/card list with name, type, neighborhood, active badge
- Search/filter bar
- "Novo Parceiro" button

### `/admin/parceiros/novo` and `/admin/parceiros/:id/editar` — Partner form
- Single compact form with all fields organized logically
- Toggle switches for `verified_partner` and `active`
- Logo URL input (text field for now)
- Save/cancel buttons

---

## Phase 5 — Event Creation with Partner Auto-Fill

### `/admin/eventos` — Events list page
- Compact table with title, venue, date, category badge, status, featured toggle
- Filter by status/category
- "Novo Evento" button

### `/admin/eventos/novo` and `/admin/eventos/:id/editar` — Event form

Four collapsible sections:

**Section 1 — Informações Principais**: title, slug (auto-generated from title), date/time picker, category select, partner select dropdown

**Section 2 — Informações do Local**: venue_name, address, instagram — auto-filled when partner selected, hidden behind "Editar local manualmente" toggle by default when partner is linked

**Section 3 — Conteúdo**: description textarea, status select (rascunho/publicado), verification_source, featured toggle

**Section 4 — Mídia**: image_url input (flyer URL)

Key behavior: selecting a partner from the dropdown fills venue_name, address, and instagram automatically. Fields remain editable. If no partner selected, fields show empty for manual input.

---

## Phase 6 — Analytics Dashboard

### `/admin/dashboard`

**Quick action buttons**: Novo Evento, Novo Parceiro, Ver Eventos

**Metric cards row** (compact grid):
- Total de Eventos, Parceiros Cadastrados, Eventos Ativos, Eventos em Destaque
- Total Visualizações, Visitantes Únicos

**Charts** (using recharts, already installed):
- Views over time (line chart, last 7/30 days)
- Views by device type (pie chart)
- Top events by views (bar chart)
- Top categories (bar chart)

**Lists**:
- Últimos Eventos Criados (recent 5)
- Últimos Parceiros (recent 5)
- Páginas Mais Visitadas

---

## Phase 7 — Analytics Tracking on Public Site

Add a lightweight tracking hook `usePageTracking` that:
- On each page navigation, inserts a row into `page_views` with path, device type, and a generated session ID (stored in sessionStorage)
- Upserts `visitor_sessions` with last_seen_at
- Detects device type from `navigator.userAgent`
- No location tracking initially (would require a geolocation API); fields left null

Apply this hook in the public pages (Index, EventDetail, Semana, Categorias, Salvos).

---

## Phase 8 — Public Site Data Integration

- Replace static `events` array with Supabase queries on public pages
- Keep the same UI components and layout
- Show partner info on event detail page when a partner is linked

---

## Files to Create (~15-20 new files)

```text
src/integrations/supabase/client.ts
src/integrations/supabase/types.ts
src/hooks/usePageTracking.ts
src/hooks/usePartners.ts
src/hooks/useEvents.ts  
src/hooks/useAnalytics.ts
src/components/admin/AdminLayout.tsx
src/components/admin/AdminNav.tsx
src/components/admin/MetricCard.tsx
src/components/admin/PartnerForm.tsx
src/components/admin/EventForm.tsx
src/pages/admin/Dashboard.tsx
src/pages/admin/ParceirosList.tsx
src/pages/admin/ParceiroForm.tsx
src/pages/admin/EventosList.tsx
src/pages/admin/EventoForm.tsx
```

## Files to Modify

- `src/App.tsx` — add admin routes
- `src/pages/Index.tsx` — use Supabase data + tracking
- `src/pages/EventDetail.tsx` — use Supabase data + show partner info
- Other public pages — add tracking hook

## Implementation Order

1. Connect Supabase → run migrations
2. Create Supabase client + types
3. Build admin layout + routing
4. Partners CRUD pages
5. Events CRUD with partner auto-fill
6. Analytics dashboard
7. Public site tracking + data migration

