# Refatoração Admin de Eventos — Central de Inteligência da Aura

Refatoração grande, vou dividir em **3 fases independentes** que entregam valor isoladamente. Cada fase pode ser aprovada/pausada sem quebrar o que já existe.

> **Não toco em:** Radar IA, eventos publicados, SEO/slugs, analytics, timezone, Aura Ranking, OAuth/Instagram, feed home, lógica atual de publicação.

---

## FASE 1 — Aprovação Rápida + Filtros + Badges (entrega imediata)

**Onde:** `src/pages/admin/EventosList.tsx` (sem renomear rota — `/admin/events` continua funcional).

### Mudanças
- **Cards inline** com ações sem modal: `Aprovar`, `Aprovar + Destaque`, `Aprovar + Aura Pick`, `Ignorar`, `Arquivar` (botões compactos no rodapé do card).
- **Preview inline:** flyer (thumb 80×80), título, data formatada SP, local, categoria, badge de confiança IA, badge de origem (`manual`, `radar_ia`, `instagram`, `parceiro`, `auto_discovery`).
- **Badges visuais** lendo colunas existentes:
  - 🤖 `verification_source = 'auto_discovery'`
  - 🔥 `aura_badge = 'em_alta'` / 🚀 `viralizando` / ⭐ `escolha_aura`
  - ⚠️ `needs_review = true`
  - 📌 `status = 'published'` (com `aura_score > 0`)
  - 🗃 `status = 'archived'`
  - 👀 `ai_confidence = 'low'` ou OCR vazio
- **Seleção múltipla** + barra de ações em lote: aprovar / arquivar / ignorar / marcar Aura Pick.
- **Filtros novos** (chips no topo): Alta/Média/Baixa confiança, Aura Picks, Em alta, Detectados hoje, Sem categoria, Sem local, Sem data, OCR incompleto, Possíveis duplicados (`status = 'draft'` + match no `dedupe_key`), Repostados (cruzando `instagram_scans.repost_count > 0`).
- **Atalhos de teclado:** `A` aprova, `D` destaca, `I` ignora, `←/→` navega cards, `Shift+Click` seleciona range.
- **Visual** dark/neon, mantém layout atual; só adiciona componentes.

### Arquivos
- Edita: `src/pages/admin/EventosList.tsx`
- Cria: `src/components/admin/EventApprovalCard.tsx`, `src/components/admin/EventBulkBar.tsx`, `src/components/admin/EventFilterChips.tsx`

**Sem migration nesta fase.** Tudo já existe no schema.

---

## FASE 2 — Aba Rascunhos Premium + Linha do Tempo

**Onde:** nova aba `/admin/events?tab=drafts` (sub-rota da mesma página, sem nova URL pública).

### Mudanças
- Tabs no topo: `Todos | Novos | Revisar OCR | Possíveis duplicados | Pendentes | Ignorados | Arquivados | Publicados auto`
- Cada draft mostra:
  - Preview maior (16:9)
  - Confiança IA (alta/média/baixa) com cor
  - `scan_count` + `repost_count` lidos de `instagram_scans` (join leve por `dedupe_key`)
  - Mini-timeline horizontal: Detectado → Revisado → Aprovado → Publicado → Repostado (datas de `created_at`, `aura_score_updated_at`, `first_published_at`, `last_reposted_at`)
  - OCR detectado, artistas detectados, score Aura, tags, gênero
  - Lista de perfis IG que repostaram (de `instagram_scans.source_handle`)

### Arquivos
- Edita: `src/pages/admin/EventosList.tsx` (tabs)
- Cria: `src/components/admin/DraftCard.tsx`, `src/components/admin/EventTimeline.tsx`

**Sem migration.** Tudo já está nas tabelas existentes.

---

## FASE 3 — Auditoria de Duplicados + Merge

**A parte mais sensível.** Implementação **incremental e off-the-critical-path**.

### 3.1 Schema (migration)
- `events.phash text` — perceptual hash da imagem (cache, gerado uma vez)
- `events.fingerprint text` — chave normalizada `slug+venue+date_key+artistas_sorted` (cache)
- `event_duplicate_candidates` — tabela com pares candidatos:
  - `event_a_id`, `event_b_id`, `similarity_score numeric`, `signals jsonb` (motivos), `status text` (`pending`/`merged`/`kept_separate`/`ignored`), `created_at`
  - RLS: admins manage
- Trigger leve no `events` que apenas marca `phash IS NULL` para reprocessamento (não bloqueia).

### 3.2 Edge function `aura-event-audit` (nova)
- Roda **sob demanda** via botão "Verificar duplicados" no admin.
- Aceita `{ scope: 'all' | 'recent_30d' | 'event_id' }`.
- Em batches de 50 eventos, calcula:
  - **pHash** do flyer (DCT 8×8) usando WASM ou implementação JS pura no edge — armazena em `events.phash`. Se já existir, pula.
  - **Fingerprint textual** (normaliza acentos, lowercase, remove stopwords).
  - **Hamming distance** entre pHashes < 10 → candidato visual.
  - **Levenshtein** título+venue + mesma data civil SP → candidato textual.
  - **Gemini Flash** (Lovable AI) só para **top-N candidatos** (não todos): "esses 2 eventos são iguais?". Cache do veredito para não repetir.
- Insere em `event_duplicate_candidates` com `status='pending'`.
- Performance: rate-limit, cache, análise incremental (só processa eventos novos ou alterados).

### 3.3 UI de auditoria
- Botão `Verificar duplicados` (header do admin de eventos).
- Modal/drawer "Possíveis duplicados encontrados":
  - Evento A (original) vs Evento B (suspeito) lado a lado
  - Score, sinais (`pHash igual`, `título 92% similar`, `mesma data+local`, `Aura confirmou`)
  - Origem dos dois flyers
  - Ações: `Mesclar` / `Manter separados` / `Arquivar duplicado` / `Ignorar alerta`

### 3.4 Mesclagem (RPC `merge_event_duplicates`)
Função SQL `SECURITY DEFINER` que:
1. Mantém `event_a_id` (original) — preserva slug/SEO/analytics.
2. Soma `aura_score`, `repost_count`, copia `instagram_scans` do B → A (update FK lógico).
3. Move `analytics_events`, `page_views` (update `event_id`).
4. Move `event_presence` evitando violar UNIQUE (drop conflitos do B).
5. `UPDATE events SET status='archived', dedupe_key = ... WHERE id = event_b_id`.
6. Marca candidato como `merged`.

### Arquivos
- Migration: nova tabela + colunas + RPC merge
- Cria: `supabase/functions/aura-event-audit/index.ts`
- Cria: `src/components/admin/DuplicateAuditModal.tsx`, `src/lib/imagePhash.ts` (helper client opcional)
- Edita: `src/pages/admin/EventosList.tsx` (botão de auditoria)

---

## Como tocar sem quebrar

- Tudo é **aditivo**: novas colunas opcionais, novas tabelas, novos componentes. Nenhuma quebra de contrato.
- Aprovação rápida usa os mesmos campos que já existem — nenhum status novo.
- Merge é **manual** (admin clica), nunca automático.
- Auditoria roda **sob demanda**, não em cron — não impacta custo/realtime.
- Radar IA, Aura Ranking, OAuth, feed e SEO **não são tocados**.

---

## Recomendação de execução

Sugiro implementar **só a Fase 1 agora** (entrega imediata, zero risco, sem migration). Depois você valida e libera Fase 2 e 3 separadamente.

**Confirma que começo pela Fase 1?** Ou prefere que eu implemente as 3 de uma vez? Se for tudo de uma vez, vou precisar ~6–8 edições de arquivos + 1 migration + 1 edge function nova.