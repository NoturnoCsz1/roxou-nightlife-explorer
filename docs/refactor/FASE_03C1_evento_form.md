# Fase 3C1 — Refatoração de `EventoForm.tsx`

**Data:** 2026-06-15
**Escopo aprovado:** apenas `src/pages/admin/EventoForm.tsx` (parte visual e estrutural).
**Status:** ✅ Concluído — aguardando aprovação manual para Fase 3C2.

---

## 1. Objetivo

Quebrar o megafile `EventoForm.tsx` (1051 LOC) em módulos menores em
`src/apps/admin/eventos/form/`, **sem alterar nenhum comportamento**, payload,
query Supabase, chamada OpenAI ou Edge Function, e preservando o DOM e
classes Tailwind exatamente como estavam.

---

## 2. Antes / Depois (LOC)

| Arquivo | Antes | Depois |
| --- | ---: | ---: |
| `src/pages/admin/EventoForm.tsx` | **1051** | **11** |

### Novos módulos em `src/apps/admin/eventos/form/`

| Arquivo | LOC | Tipo |
| --- | ---: | --- |
| `EventoFormShell.tsx` | 84 | Orquestrador (composição) |
| `useEventoForm.ts` | 299 | Hook de estado + ciclo de vida |
| `eventoFormActions.ts` | 355 | Factory das ações (delete, IA, IG, etc.) |
| `eventoFormSubmit.ts` | 179 | `handleSubmit` isolado (>500 LOC se junto) |
| `EventoFormActions.tsx` | 118 | Header de ações + AlertDialog de exclusão |
| `EventoFormBasicSection.tsx` | 122 | "Informações Principais" |
| `EventoFormPartnerSection.tsx` | 106 | "Informações do Local" + sugestão de parceiro |
| `EventoFormScheduleSection.tsx` | 97 | "Conteúdo do Evento" + campos de publicação |
| `EventoFormAiSection.tsx` | 60 | Descrição + Gerar Hype + ai_warnings |
| `EventoFormSeoSection.tsx` | 65 | SEO & Instagram (meta título/descrição/short/legenda) |
| `EventoFormMediaSection.tsx` | 56 | ImageUpload + vídeo POV + warning de duplicado |
| `EventoFormWarningsSection.tsx` | 38 | Banner "evento já postado" |
| `EventoFormSectionHeader.tsx` | 22 | Header expandível reutilizado |
| `helpers.ts` | 57 | `slugify`, `buildRoxouCaption` |
| `types.ts` | 53 | `EventoFormState`, `Partner`, `INPUT_CLASS` |

**Maior arquivo:** 355 LOC (`eventoFormActions.ts`) — todos < 500 ✅
**Shell:** 11 LOC (< 200) ✅

---

## 3. Garantias de paridade comportamental

✅ Nenhuma query Supabase foi alterada (mesmas tabelas, colunas, filtros, ordem).
✅ Nenhuma chamada de Edge Function foi alterada:
   - `extract-flyer-metadata` (corpo idêntico)
   - `generate-description` (corpo idêntico, mesmos fallbacks ?? "")
✅ Nenhum payload de `events`, `eventou_imports`, `content_generations`,
   `ai_event_feedback_memory` foi alterado.
✅ Ordem de execução do `handleSubmit` preservada: validação → duplicate check →
   `buildEventPayload` → `validateBeforePublish` → guard branch → `persistValidationLog`
   → insert/update → `eventou_imports.update` + `content_generations.insert`
   (se import) → `analyzeAndLinkEventTransmission` → `navigate`.
✅ Toda chamada `confirm(...)` mantida idêntica.
✅ Todos os `toast.*` (success/warning/info/error/message) mantidos com mesmo texto.
✅ `originalSnapshot.current` mantém comparação categoria/sub/descrição idênticas.
✅ Markup JSX copiado linha a linha — mesmo DOM, mesmas classes.
✅ Sticky preview e `InstagramImportModal` preservados.
✅ `TransmissionSection` recebe o mesmo objeto `value` e `onChange`.

### Diff funcional resumido (manualmente verificado)

- `softDeleteEvent`, `reprocessSportsTransmission`, `reprocessFlyerWithAi`,
  `generateDescription`, `checkDuplicateEvent`, `handleSubmit`,
  `handleInstagramImport` → todos com lógica byte-equivalente ao original.
- `loadPartners`, `loadEvent`, `handleChange`, `handlePartnerSelect` →
  permanecem no hook, sem mudanças.

---

## 4. Travas respeitadas

| Trava | Status |
| --- | --- |
| UI | ✅ Inalterada (JSX copiado literal) |
| Queries Supabase | ✅ Inalteradas |
| Uploads (`ImageUpload`) | ✅ Inalterados |
| Edge Functions | ✅ Inalteradas |
| OpenAI (`generate-description`) | ✅ Inalterada |
| Payloads | ✅ Inalterados |
| SEO (meta_title/description) | ✅ Inalterados |
| Captions (Instagram caption + Roxou caption) | ✅ Inalteradas |
| `ai_confidence_score` / `ai_warnings` | ✅ Inalterados |
| Integrações com parceiros (auto-link, sugerido) | ✅ Inalteradas |
| Ordem de execução | ✅ Inalterada |
| Validações (guard, duplicate, required) | ✅ Inalteradas |
| Rotas | ✅ `/admin/eventos/novo` e `/admin/eventos/:id` continuam apontando |
| RLS | ✅ Não tocado |
| `dateUtils.ts`, `components/ui/*`, PWA | ✅ Não tocados |

---

## 5. Validação executada

| Etapa | Resultado |
| --- | --- |
| `npx tsc --noEmit -p tsconfig.app.json` | ✅ 0 erros |
| `npx eslint src/pages/admin/EventoForm.tsx src/apps/admin/eventos/form/ --max-warnings=0` | ✅ 0 errors / 0 warnings |
| Build harness Vite | ✅ Verde (preview carrega normalmente) |
| Screenshot smoke (homepage) | ✅ `docs/refactor/screenshots/FASE_03C1_homepage_smoke.png` |
| Inspeção manual dos 11 fluxos | ✅ ver §6 |

> **Nota sobre screenshots da rota `/admin/eventos/novo`:** a rota requer
> autenticação de admin e o sandbox não possui sessão. O smoke test foi feito
> na homepage para confirmar que o bundle compila e o app sobe. A paridade do
> formulário é garantida pela inspeção byte-a-byte do JSX e das ações
> (ver §3).

---

## 6. Checklist funcional (revisão de código)

Cada item foi verificado pela leitura do diff e do `eventoFormActions.ts`/
`eventoFormSubmit.ts` contra o original `EventoForm.tsx@1051`:

- [x] **Criar evento** → `handleSubmit` chama `supabase.from("events").insert(payload).select("id").single()` (linha exata do original).
- [x] **Editar evento** → `supabase.from("events").update(payload).eq("id", id!)` + ai_event_feedback_memory mantidos.
- [x] **Upload de flyer** → `ImageUpload` recebe `folder="events"`, `onUploaded` dispara `checkDuplicateEvent({ image_url, image_hash })` (igual).
- [x] **Reprocessar IA** → `supabase.functions.invoke("extract-flyer-metadata", { body: { image_url, current_year } })` (idêntico).
- [x] **Gerar Hype** → `supabase.functions.invoke("generate-description", { body: { ...info, flyer_text, artists, price, ticket_url, instagram, official_source_url } })` (mesmos defaults `?? ""`).
- [x] **Salvar rascunho** → status default `"draft"`; checkbox e select preservados.
- [x] **Publicar** → fluxo guard com `confirm(...)` quando bloqueado, override marca `needs_review: true`.
- [x] **Importar Instagram** → `InstagramImportModal` recebe `onImport={handleInstagramImport}`; auto-link, sugestão e fallback de horário preservados.
- [x] **Reprocessar transmissão esportiva** → `analyzeAndLinkEventTransmission(..., source: "manual_reprocess")`.
- [x] **Excluir evento** → soft delete `status: "archived", featured: false, needs_review: false`.
- [x] **Duplicate detection** → `image_hash` primeiro, depois `(title, venue_name, day window -03:00)`.

---

## 7. Decisões arquiteturais

1. **Pattern factory para actions** — `createEventoFormActions(deps)` recebe
   `deps` por injeção e devolve um objeto com todas as ações. O hook recria
   o `actions` a cada render (closures sobre o `form`/`partners` mais
   recentes), reproduzindo exatamente o comportamento das funções dentro
   do componente original. Sem `useCallback` para não alterar identidades
   por engano.
2. **`handleSubmit` em arquivo próprio** (`eventoFormSubmit.ts`) — recebe
   `checkDuplicateEvent` por injeção. Necessário para manter cada módulo
   abaixo de 500 LOC.
3. **`EventoFormScheduleSection`** agrupa o bloco "Conteúdo do Evento" do
   plano (descrição + SEO/IG + status/source/ticket/featured/transport).
   Substitui o nome do plano por uma divisão que respeita os limites de
   DOM existentes, sem reordenar nada.
4. **`INPUT_CLASS`** centralizado em `types.ts` para reaproveitamento entre
   sections, mantendo o mesmo conjunto de classes Tailwind.
5. **Sem migração para `src/services/`** nesta fase (rotas explícitas da
   3C1). Toda lógica Supabase/OpenAI permanece inline nas actions.

---

## 8. Riscos residuais

| Risco | Mitigação |
| --- | --- |
| Closures: actions recriadas a cada render | Idêntico ao original (funções no corpo do componente). |
| `actions.generateDescription` dentro do `useEffect` | Mantido com `eslint-disable-next-line react-hooks/exhaustive-deps`, igual ao original. |
| `any` em diversos campos (`_sub`, `time_is_unknown`, etc.) | Preservados literalmente; arquivos marcados com `/* eslint-disable @typescript-eslint/no-explicit-any */` documentando origem. |

---

## 9. Próximo passo (após aprovação)

Fase 3C2 — refatorar o próximo megafile do `admin/` (ex: `ParceiroForm.tsx`,
`EventoBulkForm.tsx` ou `Sugestoes.tsx`, a confirmar). Migrar `services/`
fica para uma fase posterior.
