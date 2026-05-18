
# Hotfix: validação real do pipeline de ingestão

Sem reescrever nada. Adicionar uma camada única de validação que tudo o que publica passa a chamar, e endurecer os detectores existentes.

## 1. Nova lib central: `src/lib/eventIngestionGuard.ts`

Função única `validateBeforePublish(input)` retornando `{ ok, blockReasons[], warnings[], badges[], entertainmentScore, ocrDate, validationLog }`.

Executa, em ordem:

1. **OCR de data**
   - Regex pt-BR no `raw_caption + raw_ocr + title`: `\b(\d{1,2})[\/\s\-de]+([a-zç]+|\d{1,2})\b`, mapeia mês por extenso, monta data em SP.
   - Detecta palavras-chave: `SEXTOU`, `SÁBADO`, `DOMINGO`, `HOJE`, `AMANHÃ` → resolve para a próxima ocorrência em SP.
   - Retorna `ocrDate | null`.

2. **Data divergente**
   - Se `ocrDate && formDate` e `|diffDias| >= 1` → bloqueia (`DATA_DIVERGENTE`), badge "DATA DIVERGENTE".

3. **Evento no passado**
   - Compara `formDate` com `getStartOfTodaySP()` (helper já existente em `dateUtils`).
   - Se passado → bloqueia (`EVENTO_NO_PASSADO`), badge "EVENTO NO PASSADO".

4. **Score de entretenimento**
   - Lista positiva: show, festa, balada, dj, open bar, pagode, sertanejo, eletrônico, música ao vivo, futebol, universitária, lounge, barzinho, rave, funk, rock, samba.
   - Lista negativa (`BLOCKED_KEYWORDS`): workshop, congresso, seminário, simpósio, curso, palestra, científico, ciência, networking, corporativo, empresarial, mesa redonda, feira acadêmica, missa, culto, comício.
   - Score = 50 base + 10/keyword positiva − 25/keyword negativa, clamp 0–100.
   - `< 70` → bloqueia (`BAIXO_SCORE_ENTRETENIMENTO`), badge "BAIXO SCORE".
   - `≥ 1` keyword bloqueada → bloqueio rígido (`FORA_DO_ESCOPO`).

5. **Duplicidade real (reaproveita `eventDuplicateDetector`)**
   - Já existe `score 0–100` + `samePartner` + `dateDistance`. Apenas endurecer regra final aqui: `score ≥ 90 && samePartner && dateDistanceHours < 2` → bloqueia (`DUPLICATA`).
   - 60–89 → não bloqueia, manda para revisão.

6. **OCR ausente quando deveria existir**
   - Se origem é Radar IA / Instagram scan e `raw_ocr` vazio E `raw_caption` vazio → badge "OCR INVÁLIDO", manda para revisão (não bloqueio rígido).

Retorna `validationLog` pronto para `event_validation_logs`.

## 2. Endurecer `eventDuplicateDetector.ts`

Apenas ajustar threshold de bloqueio (não a função de score) e expor `dateDistanceHours` no resultado para a guard usar.

## 3. Plug nos 3 pontos de entrada

Sem mudar UX, sem mover botões:

- **`src/pages/admin/RadarIA.tsx`** → dentro de `createEventFromScan` e `bulkCreateEvents`, chamar `validateBeforePublish` antes do `insert/update`. Se `!ok` e tem bloqueio rígido → mostra toast com motivo, força `status: 'draft'` + `needs_review: true`, grava `event_validation_logs`. Nunca cria silenciosamente publicado.
- **`src/pages/admin/EventoBulkForm.tsx`** → mesma chamada no loop de save. Já tem resumo "criados/bloqueados/revisão" — apenas alimentar contadores com os reasons.
- **`src/pages/admin/EventoForm.tsx`** → no submit, antes do upsert: se houver `blockReasons` rígidos, abrir confirm "Publicar mesmo assim?" (só admin) e força `status='draft'` + `needs_review=true` se confirmar parcial. Manter botão "Publicar mesmo assim" já existente.
- **Edge function `automatic-event-hunter`** (cron) → port da mesma guard em Deno (cópia leve, mesmas listas). Eventos que falham guard → `status='draft'`, `needs_review=true`, nunca `published`.

## 4. Hash de flyer

Já existe `flyer_fingerprint` em `events` e `instagram_scans`. Garantir que:

- Toda criação por scan grava `flyer_fingerprint = scan.flyer_fingerprint`.
- `validateBeforePublish` consulta `events` por `flyer_fingerprint` igual nos últimos 14 dias → mesmo hash + mesmo partner → bloqueio duro (`MESMO_FLYER`).
- Slug único garantido pelo unique index já existente (`events.slug`).

## 5. Nova tabela `event_validation_logs`

```sql
create table public.event_validation_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid null,
  scan_id uuid null,
  flyer_hash text null,
  detected_ocr text null,
  detected_date timestamptz null,
  ai_date timestamptz null,
  form_date timestamptz null,
  similarity_score numeric null,
  entertainment_score numeric null,
  validation_status text not null,   -- 'ok' | 'blocked' | 'review'
  block_reasons text[] not null default '{}',
  warnings text[] not null default '{}',
  source text not null,              -- 'radar' | 'bulk' | 'form' | 'cron'
  created_by uuid null,
  created_at timestamptz not null default now()
);
alter table public.event_validation_logs enable row level security;
create policy "Admins manage event_validation_logs"
  on public.event_validation_logs for all
  to authenticated
  using (has_role(auth.uid(),'admin'))
  with check (has_role(auth.uid(),'admin'));
create index on public.event_validation_logs (created_at desc);
create index on public.event_validation_logs (event_id);
```

## 6. Badges no admin

Sem novo componente. No `RadarIA.tsx` e `EventosList.tsx`, ler `event.needs_review`, último `event_validation_logs.block_reasons` e renderizar chips usando o estilo já existente (`AIConfidenceBadges`/`Badge`):

- `POSSÍVEL DUPLICATA`, `DATA DIVERGENTE`, `EVENTO NO PASSADO`, `BAIXO SCORE`, `OCR INVÁLIDO`, `REVISÃO NECESSÁRIA`.

## 7. Garantias

- Nenhuma rota nova, nenhum botão movido, nenhum redesign.
- Mesmas funções de IA permanecem; apenas perdem o poder de publicar sem passar pela guard.
- `getStartOfTodaySP`, `getDateKeySP`, sufixo `-03:00` mantidos (regra core).
- Sem migração de dados existentes — só nova tabela + nova lib + 4 chamadas.

## Arquivos tocados

- **novo**: `src/lib/eventIngestionGuard.ts`
- **novo**: `supabase/functions/_shared/ingestionGuard.ts` (espelho Deno consumido pelo `automatic-event-hunter`)
- **migração**: criar `event_validation_logs`
- **edit**: `src/lib/eventDuplicateDetector.ts` (expor `dateDistanceHours`)
- **edit**: `src/pages/admin/RadarIA.tsx` (guard + badges)
- **edit**: `src/pages/admin/EventoBulkForm.tsx` (guard + contadores)
- **edit**: `src/pages/admin/EventoForm.tsx` (guard no submit)
- **edit**: `src/pages/admin/EventosList.tsx` (badges)
- **edit**: `supabase/functions/automatic-event-hunter/index.ts` (guard antes do insert)

## Fora de escopo (não faço)

- Nenhuma feature nova de IA.
- Nenhum cron novo.
- Nenhum redesign.
- Não toco em `extract-flyer-metadata` além de garantir que o `raw_ocr` continua sendo persistido para a guard ler.
