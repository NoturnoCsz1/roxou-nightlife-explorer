## Plano: Aura Ranking Engine + AutoReels IA

Duas evoluções complementares que tornam a Roxou auto-curada e auto-produtora de conteúdo. Implementação em duas fases independentes.

---

### Fase 1 — Auto-Curadoria da Home (Aura Ranking Engine)

**1.1 Banco de dados (migration)**

Adicionar em `events`:
- `aura_score` numeric (0–100)
- `trending_score` numeric
- `hype_score` numeric
- `aura_badge` text (`em_alta` | `viralizando` | `bombando` | `escolha_aura` | null)
- `aura_score_updated_at` timestamptz
- `aura_score_reason` jsonb (sinais usados)

Nova tabela `aura_home_logs`:
- `event_id`, `aura_score`, `trending_score`, `hype_score`, `badge`, `signals` jsonb, `created_at`
- RLS: admin only

**1.2 Edge Function `aura-home-curation`**

Calcula scores combinando sinais já disponíveis:
- views (`page_views` últimas 24h / 7d)
- saves, clicks (`analytics_events`)
- engajamento parceiro (`partners.instagram_followers_count`, `aura_partner_score`, `instagram_recent_posts`)
- proximidade temporal do `date_time`
- confiança do Radar (`ai_confidence`, `instagram_scans` relacionados)
- crescimento recente (delta views 24h vs 7d)
- `featured`/`aura_pick` manual = boost máximo (preserva controle humano)

Fórmula:
```
aura_score = 0.35*engagement + 0.25*trending + 0.15*partner + 0.15*radar + 0.10*time
trending_score = delta_views_24h / max(views_7d_avg, 1)
hype_score = saves*3 + shares*5 + clicks*2 (normalizado)
```

Atribui badges automaticamente; eventos passados/sem sinal são despromovidos (não deletados).

**1.3 Cron**

`aura-home-curation-cron`: a cada 15 minutos via `pg_cron`/`pg_net`.

**1.4 Frontend**

- Hook `useAuraRanking` que ordena eventos por `aura_score` (com `aura_pick`/`featured` no topo).
- Componente `AuraBadge` com 4 variantes (🔥 🚀 👀 🤖) — estilo neon Roxou.
- Aplicar nos blocos da Home **sem alterar layout/filtros existentes** — apenas reordenação e badges sobrepostos nos cards.

---

### Fase 2 — Aura AutoReels IA

**2.1 Banco de dados**

Nova tabela `auto_reels_queue`:
- `id`, `event_id`, `partner_id`
- `status` (`pending` | `generated` | `approved` | `published` | `ignored`)
- `style` (`universitario` | `premium` | `funk` | `pagode` | `eletronico` | `sertanejo` | `barzinho`)
- `script_json` jsonb (`{title, hook, scenes[], captions[], cta, hashtags[], music_style, visual_style}`)
- `generated_caption` text, `generated_hashtags` text[]
- `suggested_audio` text, `video_prompt` text
- `external_prompts` jsonb (`{capcut, kling, runway, veo, tiktok}`)
- `preview_image_url` text (flyer do evento como referência)
- `created_at`, `posted_at`, `created_by`
- RLS: admin only

**2.2 Edge Function `aura-autoreels-generate`**

Input: `{ event_id, style? }`. Detecta estilo automaticamente pelo `sub_category`/`category` se não passado.

Usa `google/gemini-2.5-flash` via Lovable AI Gateway com prompt estruturado (JSON output) que retorna o `script_json` completo + prompts específicos para CapCut/Kling/Runway/Veo/TikTok.

Modos:
- `{ event_id }` — gera um
- `{ auto: true, limit: 10 }` — gera para top N do `aura_score` que ainda não têm reel

**2.3 Painel admin `/admin/autoreels`**

- Lista da fila com filtros por status
- Cards com: capa do evento, headline gerada, hook, cenas (timeline), legenda, hashtags
- Ações: **Aprovar / Editar / Ignorar / Regenerar / Copiar prompt (CapCut/Kling/Runway/Veo)**
- Preview da legenda pronta para colar no Instagram/TikTok
- Estilo dark/neon Roxou

**2.4 Botão "Gerar Reel IA"**

Adicionar em:
- `RadarIA.tsx` (cards de scan aprovado)
- Lista admin de eventos / form de evento

Chama a edge function e abre o item gerado em `/admin/autoreels`.

**2.5 Rota e nav**

- Adicionar rota `/admin/autoreels` em `App.tsx`
- Item no `AdminLayout` sidebar

---

### Restrições preservadas

- **Não tocar**: OAuth Meta, `instagram-oauth`, `partner-instagram-sync`, `automatic-event-hunter`, login/auth, feed, insights, publicação existente
- **Aura Pick manual** e `featured` mantêm prioridade máxima na ordenação
- **Timezone** America/Sao_Paulo via helpers `@/lib/dateUtils`
- Filtros de data e categorias da Home permanecem intactos
- Layout público da Home não muda — apenas ordem dos cards e badge sobreposto

---

### Arquivos

**Criar:**
- `supabase/migrations/<ts>_aura_ranking_autoreels.sql`
- `supabase/functions/aura-home-curation/index.ts`
- `supabase/functions/aura-autoreels-generate/index.ts`
- `src/hooks/useAuraRanking.ts`
- `src/components/AuraBadge.tsx`
- `src/pages/admin/AutoReels.tsx`
- `src/components/admin/AutoReelCard.tsx`

**Editar:**
- `src/App.tsx` (rota)
- `src/components/admin/AdminLayout.tsx` (nav)
- `src/integrations/supabase/types.ts` (auto)
- Componentes da Home que listam eventos (apenas para aplicar ordenação + badge)
- `src/pages/admin/RadarIA.tsx` (botão Gerar Reel)
- `supabase/config.toml` (verify_jwt para as 2 novas funções)

**Cron (insert):**
- `aura-home-curation` a cada 15 min