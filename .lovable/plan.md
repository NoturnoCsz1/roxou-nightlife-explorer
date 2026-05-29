
# Upgrade de precisão do Radar IA

Objetivo: reduzir lixo (promoção, cardápio, posts antigos, avisos) e aumentar captura de flyers reais de evento, sem mudar layout, abas, timezone, dedupe existente ou política de "não publicar automaticamente".

## 1. Novo classificador `src/lib/radarPostClassifier.ts`

Função pura `classifyRadarPost({ caption, ocr, timestamp, partner })` retornando:

```
{
  type: 'event_flyer' | 'music_event' | 'party_event' | 'bar_event'
      | 'food_promo' | 'menu' | 'announcement' | 'old_post'
      | 'generic_post' | 'invalid',
  score: 0-100,
  decision: 'create' | 'review' | 'ignore',
  extracted: { title, date, time, venue, artists, genre, shortDescription },
  reasons: string[],        // motivos legíveis
  confidence: 'high'|'medium'|'low'
}
```

Regras:
- Sinais fortes de evento (+pontos): data/dia semana, horário (`22h`, `00h`), local/casa/bar/club, artista/DJ/banda, palavras `hoje, sábado, sexta, domingo, ao vivo, show, pagode, sertanejo, funk, dj, open, entrada, reserva, agenda, line-up, ingresso`.
- Sinais negativos (−pontos): `cardápio, prato, delivery, peça já, combo, desconto, frete, sorteio, em breve, aviso, comunicado, funcionamento, horário especial`.
- Sem data E sem horário → score < 60 → `ignore` com badge `SEM DATA`.
- Post > 5 dias E sem data futura clara no flyer → `old_post` → `ignore`.
- ≥1 sinal `food_promo`/`menu` E zero sinais de evento → `food_promo`/`menu` → `ignore`.
- ≥2 sinais `announcement` → `announcement` → `ignore`.
- 80–100 → `create`/`review`, 60–79 → `review`, <60 → `ignore`.
- Extração nunca inventa: se regex não casa, retorna `null`. Aceita `hoje, amanhã, sex/sáb/dom, 23/05, 23 de maio` ancorado em SP (reaproveita `instagramPostFilters.resolveEventDate/Time`).

## 2. Edge function `automatic-event-hunter`

- Adicionar espelho Deno do classificador (`supabase/functions/_shared/radarPostClassifier.ts`) e chamar antes de criar `instagram_scans`.
- Aplicar filtro de recência (últimos 5 dias) — já existe `getInstagramPostWindow`, garantir que está sendo respeitado e que posts antigos com data futura no flyer passam.
- Para cada post: persistir `keywords`, `ai_confidence`, `extracted_json` (campos estruturados acima), `reason` (motivo principal), `status`:
  - `decision=create` → `status='scanned'` (vai para aba Novos).
  - `decision=review` → `status='needs_review'`.
  - `decision=ignore` → `status='ignored'` + `hidden_from_radar=false` (continua visível em "Ignorados" 7 dias).
- Antes de gerar rascunho, rodar `findPossibleDuplicateEvent` com janela 14 dias + comparação por `flyer_fingerprint`. Duplicado → `status='skipped_duplicate'`, set `duplicate_of_event_id` e `duplicate_score`.
- Gravar em `event_validation_logs` (source=`radar-cron`) o motivo da decisão e campos extraídos. Tabela já existe.

## 3. UI — `src/pages/admin/RadarIA.tsx`

Sem mudar layout/abas. Apenas enriquecer os cards e a barra de ações:

### Badges no card (chips já no padrão visual existente)
`EVENTO FORTE` (verde, score≥80), `PRECISA REVISAR` (amarelo, 60–79), `PROMOÇÃO`, `CARDÁPIO`, `SEM DATA`, `POST ANTIGO`, `DUPLICADO`, `AVISO`. Mapear do `extracted_json.type` + score.

### Bloco "leitura rápida" no card
- Parceiro (já existe)
- Data detectada (`extracted.date` formatada SP)
- Tipo + score
- Motivo principal (`reasons[0]`)
- Botões: `Ver OCR` (abre Sheet existente), `Criar evento`, `Ignorar`, `Arquivar`, `Marcar como duplicado` (já existem; só garantir todos visíveis).

### Barra de ações topo
- `Disparar varredura`: mostrar progresso em toast (`sonner` com update) — parceiros analisados / posts / prováveis / revisão / ignorados / duplicados (vem do retorno da edge function).
- `Avaliar duplicados`: feedback visual de progresso e contagem de duplicatas marcadas.
- `Aplicar retenção`: já chama `archive_old_radar_scans()`; manter, só melhorar toast com contagem.

## 4. Log de decisão

Toda criação/ignore/duplicação grava em `event_validation_logs`:
- `validation_status`: `ok`|`review`|`blocked`
- `block_reasons`: tipo + razões
- `entertainment_score`: score do classificador
- `detected_ocr`, `detected_date`, `flyer_hash`
- `source`: `radar-cron`|`radar-manual`

## 5. Dedupe reforçado

`eventDuplicateDetector.findPossibleDuplicateEvent` já compara title/date/partner/fingerprint. Estender janela para 14 dias (parametrizada). Adicionar comparação leve por `artists` extraídos quando disponível.

## 6. Não muda

- Layout, abas, ordenação, cores globais.
- `getStartOfTodaySP`, `-03:00`, helpers de dateUtils.
- Política: nada vira `published` automaticamente.
- Sem migration nova — `event_validation_logs`, `instagram_scans.keywords/extracted_json/reason/ai_confidence` já existem.

## Arquivos tocados

- **novo**: `src/lib/radarPostClassifier.ts`
- **novo**: `supabase/functions/_shared/radarPostClassifier.ts` (espelho Deno)
- **edit**: `supabase/functions/automatic-event-hunter/index.ts` (usa classificador + grava extracted_json/reason/status corretos + dedupe 14d + log)
- **edit**: `src/pages/admin/RadarIA.tsx` (badges novos no card, leitura rápida, toasts de progresso nas 3 ações do topo)
- **edit**: `src/lib/eventDuplicateDetector.ts` (janela 14d default + comparação por artists)
- **edit leve**: `src/lib/instagramPostFilters.ts` (exportar helpers de extração já existentes para o novo classificador)

## Fora de escopo

- Nenhuma migration nova.
- Nenhuma mudança em `extract-flyer-metadata` além de garantir que o `raw_ocr` continua persistido.
- Nenhuma alteração nas páginas públicas, no Home, no Jogos, no Expo.
- Nenhuma publicação automática.
