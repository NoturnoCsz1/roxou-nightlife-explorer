## Objetivo
Unificar e endurecer a detecção de duplicidade em **uma única ferramenta** reutilizada por Radar IA, hunter, EventoForm/BulkForm e Instagram imports. **Sem IA. Sem refator de layout. Sem apagar nada.**

## O que já existe (reaproveitar)
- `src/lib/eventDuplicateValidator.ts` — já tem `findPossibleDuplicateEvent` com score 0–100, normalização, Jaccard, anti-recorrente. **Vamos estender, não recriar.**
- `events.dedupe_key` (coluna já existe) + `buildDedupeKey` no `automatic-event-hunter` (4 estágios de dedup).
- `instagram_scans` já tem `dedupe_key`, `duplicate_of_event_id`, `event_id`, `status`.
- `events.original_detected_title`, `events.image_hash` já existem.

## O que falta (vamos adicionar)

### 1. Migration única
```sql
alter table public.events
  add column if not exists flyer_fingerprint text,
  add column if not exists duplicate_group_id uuid,
  add column if not exists duplicate_checked_at timestamptz;

alter table public.instagram_scans
  add column if not exists flyer_fingerprint text,
  add column if not exists duplicate_score numeric,
  add column if not exists duplicate_reason text;

create index if not exists idx_events_flyer_fingerprint
  on public.events(flyer_fingerprint) where flyer_fingerprint is not null;
create index if not exists idx_scans_flyer_fingerprint
  on public.instagram_scans(flyer_fingerprint) where flyer_fingerprint is not null;
```
Já temos `idx_events_dedupe_key`.

### 2. Novo módulo `src/lib/eventDuplicateDetector.ts`
Fachada única que expõe:
- `normalizeEventTitle(t)` — reusa `normalizeText` + remove spam ("hoje tem", "sextou", "imperdível", preço, telefone).
- `normalizeVenueName(v)` — remove sufixos genéricos ("bar","club","casa","pub","lounge") **só** para comparação.
- `generateEventDedupeKey({partner_id, title, date_time, venue_name})` — `partnerId|normTitle|dateKeySP|normVenue`. Fallback sem partner_id.
- `generateFlyerFingerprint({image_hash?, image_url?, preview_image_url?, media_id?, permalink?})` — hash determinístico (FNV-1a inline) da primeira fonte disponível.
- `getDuplicateConfidence(candidate, existing)` — score conforme a tabela do prompt (40 flyer / 30 título / 25 data / 20 local / 20 partner / 15 horário / 10 caption; -30/-30/-20 divergências). Internamente chama `findPossibleDuplicateEvent` e refina com sinais novos (flyer_fingerprint, caption similarity).
- `findPossibleDuplicateEvent(candidate, existing, opts)` — re-export reforçado (busca por dedupe_key e flyer_fingerprint primeiro, depois cai no scoring).
- `compareEventsForDuplicate(a,b)` — wrapper síncrono útil em formulários.

Thresholds: **≥80 bloqueia**, **60–79 revisão**, **<60 livre**.

### 3. Hunter (`supabase/functions/automatic-event-hunter/index.ts`)
- Espelhar `generateFlyerFingerprint` e `normalize*` inline (edge não importa `src/`).
- Adicionar **estágio 0** de dedup: `events.flyer_fingerprint = fp` ou `instagram_scans.flyer_fingerprint = fp` já vinculado a evento → marca scan `status='skipped_duplicate'`, `duplicate_reason='Mesmo flyer já processado'`, salva `duplicate_score=100`.
- Estágios 3 e 4 existentes continuam; passam a salvar `duplicate_score` e `duplicate_reason` no scan.
- No insert do evento: gravar `flyer_fingerprint` e `duplicate_checked_at = now()`.

### 4. Radar IA admin (`src/pages/admin/RadarIA.tsx`)
- Badge **"Duplicado detectado"** (rosa) quando `duplicate_score >= 80` ou `status='skipped_duplicate'/'duplicate_detected'`, mostrando score, motivo e link "Abrir evento existente" (`/admin/eventos/:id`).
- No `approve()`: rodar `getDuplicateConfidence` contra eventos publicados próximos (±15 dias) antes de publicar. Se ≥80 → toast bloqueando + sugerir vincular. Botão extra "Ignorar e publicar mesmo assim" apenas para admin.

### 5. EventoForm (`src/pages/admin/EventoForm.tsx`)
- Ao submeter novo evento: chamar `findPossibleDuplicateEvent` contra fetch dos últimos 90 dias do mesmo partner/venue. Se score ≥80 → AlertDialog com evento existente + "Abrir existente" / "Salvar mesmo assim".
- Apenas alerta, não bloqueia.

### 6. EventosList (`src/pages/admin/EventosList.tsx`)
- Filtro novo **"Possíveis duplicados"**: lista eventos que compartilham `dedupe_key` ou `flyer_fingerprint` com outro evento.

### 7. EventoBulkForm + Instagram imports
- Passar cada candidato pelo mesmo detector antes de criar evento; pular silenciosamente os ≥80 com log no toast resumo ("X pulados por duplicidade").

## Detalhes técnicos
- **Sem libs novas**. Hash = FNV-1a 32-bit inline.
- **Sem IA**. Tudo regex + score determinístico.
- `date_key_sp` vem de `getDateKeySP` em `@/lib/dateUtils` (front) e função inline equivalente no edge (já temos `startOfTodaySPMs`).
- Nenhum evento existente é alterado; só novos inserts gravam fingerprint. Backfill opcional fora deste prompt.
- Nada apagado automaticamente — só `status` de scans e badges no admin.

## Arquivos tocados
- **Novo:** `src/lib/eventDuplicateDetector.ts`
- **Novo:** migration `supabase/migrations/<ts>_event_duplicate_fingerprint.sql`
- **Editar:** `supabase/functions/automatic-event-hunter/index.ts`
- **Editar:** `src/pages/admin/RadarIA.tsx`
- **Editar:** `src/pages/admin/EventoForm.tsx`
- **Editar:** `src/pages/admin/EventosList.tsx`
- **Editar:** `src/pages/admin/EventoBulkForm.tsx` (checagem leve)

## Fora do escopo
- Backfill de `flyer_fingerprint` em eventos antigos.
- Merge/unificação automática de duplicados existentes.
- Mudança de UI pública.
- Qualquer ajuste em Home / Transporte / Auth.

Confirma que posso seguir com esse plano?
