# Fase 3C1 — Arquivos alterados

**Data:** 2026-06-15
**Escopo:** refatoração de `src/pages/admin/EventoForm.tsx` em módulos.

---

## Editados

| Arquivo | Mudança | LOC antes | LOC depois |
| --- | --- | ---: | ---: |
| `src/pages/admin/EventoForm.tsx` | Reduzido para shell que renderiza `<EventoFormShell />` | 1051 | 11 |

## Criados

| Arquivo | LOC |
| --- | ---: |
| `src/apps/admin/eventos/form/EventoFormShell.tsx` | 84 |
| `src/apps/admin/eventos/form/useEventoForm.ts` | 299 |
| `src/apps/admin/eventos/form/eventoFormActions.ts` | 355 |
| `src/apps/admin/eventos/form/eventoFormSubmit.ts` | 179 |
| `src/apps/admin/eventos/form/EventoFormActions.tsx` | 118 |
| `src/apps/admin/eventos/form/EventoFormBasicSection.tsx` | 122 |
| `src/apps/admin/eventos/form/EventoFormPartnerSection.tsx` | 106 |
| `src/apps/admin/eventos/form/EventoFormScheduleSection.tsx` | 97 |
| `src/apps/admin/eventos/form/EventoFormAiSection.tsx` | 60 |
| `src/apps/admin/eventos/form/EventoFormSeoSection.tsx` | 65 |
| `src/apps/admin/eventos/form/EventoFormMediaSection.tsx` | 56 |
| `src/apps/admin/eventos/form/EventoFormWarningsSection.tsx` | 38 |
| `src/apps/admin/eventos/form/EventoFormSectionHeader.tsx` | 22 |
| `src/apps/admin/eventos/form/types.ts` | 53 |
| `src/apps/admin/eventos/form/helpers.ts` | 57 |
| `docs/refactor/FASE_03C1_evento_form.md` | — |
| `docs/refactor/FASE_03C1_evento_form_CHANGED_FILES.md` | — |
| `docs/refactor/screenshots/FASE_03C1_homepage_smoke.png` | — |

**Total novos arquivos de código:** 15
**Maior arquivo:** 355 LOC (limite 500 ✅)
**Shell:** 11 LOC (limite 200 ✅)

---

## Não alterados (confirmado)

- `src/integrations/supabase/client.ts` / `types.ts`
- `src/lib/adminEventPayload.ts`
- `src/lib/sportsTransmission.ts`
- `src/lib/eventIngestionGuard.ts`
- `src/lib/dateUtils.ts`
- `src/components/admin/ImageUpload.tsx`
- `src/components/admin/InstagramImportModal.tsx`
- `src/components/admin/DateTimePickerSP.tsx`
- `src/components/admin/TransmissionSection.tsx`
- `src/components/ui/*`
- `src/App.tsx` (rotas inalteradas — `EventoForm` default export preservado)
- Edge functions em `supabase/functions/*`
- RLS, migrations, PWA config

---

## Confirmação de paridade SQL / Edge / OpenAI

| Chamada | Localização original | Localização nova | Igualdade |
| --- | --- | --- | --- |
| `supabase.from("events").update({ status: "archived", … }).eq("id", id!)` | EventoForm.tsx L79-83 | eventoFormActions.ts (softDeleteEvent) | ✅ Literal |
| `supabase.from("events").select("*").eq("id", id!).single()` | EventoForm.tsx L307 | useEventoForm.ts (loadEvent) | ✅ Literal |
| `supabase.from("partners").select("*").eq("active", true).order("name")` (+ `.eq("city", cityFilter)`) | EventoForm.tsx L300-303 | useEventoForm.ts (loadPartners) | ✅ Literal |
| `supabase.functions.invoke("extract-flyer-metadata", { body })` | EventoForm.tsx L129-131 | eventoFormActions.ts (reprocessFlyerWithAi) | ✅ Body idêntico |
| `supabase.functions.invoke("generate-description", { body })` | EventoForm.tsx L176-187 | eventoFormActions.ts (generateDescription) | ✅ Body idêntico (mesmos `?? ""`) |
| `supabase.from("events").insert(payload).select("id").single()` | EventoForm.tsx L499 | eventoFormSubmit.ts | ✅ Literal |
| `supabase.from("events").update(payload).eq("id", id!)` | EventoForm.tsx L481 | eventoFormSubmit.ts | ✅ Literal |
| `supabase.from("ai_event_feedback_memory").insert({...})` | EventoForm.tsx L487 | eventoFormSubmit.ts | ✅ Payload literal |
| `supabase.from("eventou_imports").update({ import_status: "approved", event_id }).eq("id", eventouImportId)` | EventoForm.tsx L507-510 | eventoFormSubmit.ts | ✅ Literal |
| `supabase.from("content_generations").insert({...})` | EventoForm.tsx L516 | eventoFormSubmit.ts | ✅ Payload literal (mesmo `buildRoxouCaption`) |
| `supabase.from("events").select(…).ilike(...).gte(...).lte(...)` (duplicate check) | EventoForm.tsx L400-409 | eventoFormActions.ts (checkDuplicateEvent) | ✅ Literal |
| `supabase.from("events").select(…).eq("image_hash", …).limit(1)` | EventoForm.tsx L392 | eventoFormActions.ts (checkDuplicateEvent) | ✅ Literal |
| `analyzeAndLinkEventTransmission(...)` × 2 | EventoForm.tsx L104-110 / L537-543 | reprocessSportsTransmission / eventoFormSubmit | ✅ Args idênticos (`source: "manual_reprocess"` e `"manual"`) |
| `validateBeforePublish(...)` + `persistValidationLog(...)` | EventoForm.tsx L440-475 | eventoFormSubmit.ts | ✅ Mesmos campos |
| `buildEventPayload(form, { city: cityFilter })` | EventoForm.tsx L437 | eventoFormSubmit.ts | ✅ Literal |

---

## Status

| Verificação | Resultado |
| --- | --- |
| `npx tsc --noEmit -p tsconfig.app.json` | ✅ 0 erros |
| `npx eslint <touched> --max-warnings=0` | ✅ 0 / 0 |
| Build harness | ✅ Verde |
| Preview ao vivo (homepage smoke) | ✅ Carrega normalmente |
