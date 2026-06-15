# `src/apps/admin/eventos/form/` — Contrato Interno

Refatoração originada da Fase 3C1 (`EventoForm.tsx` 1051 → 11 LOC) e
consolidada na Fase 3C2.

## Topologia

```text
EventoForm.tsx (page shell · 11 LOC)
   └─► EventoFormShell.tsx  (composição + layout)
          ├── EventoFormHeader.tsx           (botões topo + AlertDialog excluir)
          ├── EventoFormBasicSection.tsx     (Informações Principais)
          ├── EventoFormPartnerSection.tsx   (Informações do Local)
          ├── EventoFormScheduleSection.tsx  (Conteúdo do Evento + publicação)
          │     ├── EventoFormAiSection.tsx  (Descrição + Gerar Hype)
          │     └── EventoFormSeoSection.tsx (SEO + Instagram caption)
          ├── EventoFormMediaSection.tsx     (Flyer + vídeo + duplicate banner)
          │     └── EventoFormWarningsSection.tsx
          └── TransmissionSection (componente externo, não foi tocado)

useEventoForm()            ◄── único ponto de entrada de estado
   ├── createEventoFormActions(deps)   ◄── factory de ações
   │     ├── softDeleteEvent
   │     ├── reprocessSportsTransmission
   │     ├── reprocessFlyerWithAi
   │     ├── generateDescription
   │     ├── checkDuplicateEvent
   │     ├── handleInstagramImport
   │     └── handleSubmit  ← delega para buildHandleSubmit()
   └── buildHandleSubmit(deps, checkDuplicateEvent)  (eventoFormSubmit.ts)
```

## Contrato dos módulos

| Arquivo | Responsabilidade única | Pode importar |
| --- | --- | --- |
| `EventoForm.tsx` (page) | Re-exportar `EventoFormShell`. | Apenas `EventoFormShell`. |
| `EventoFormShell.tsx` | Compor a UI + chamar `useEventoForm()`. | Sections, `useEventoForm`, componentes externos. |
| `EventoForm*Section.tsx` | Renderizar um bloco visual; receber `ctx: UseEventoFormReturn`. | `constants`, `types`, hook return. **Sem Supabase.** |
| `EventoFormHeader.tsx` | Header de ações + AlertDialog de exclusão. | shadcn/lucide + ctx. |
| `EventoFormSectionHeader.tsx` | Header colapsável reusado por sections. | lucide + `types`. |
| `useEventoForm.ts` | Estado + ciclo de vida (`loadPartners`, `loadEvent`, `handleChange`, `handlePartnerSelect`, `applyTransmission`). Cria e delega `actions` via factory. | Supabase para `loadPartners`/`loadEvent` apenas. |
| `eventoFormActions.ts` | Factory `createEventoFormActions(deps)` com todas as ações IA/IG/delete/duplicate. **Onde vivem as chamadas Supabase e Edge Functions.** | Supabase, Edge Functions, `utils`, `eventoFormSubmit`. |
| `eventoFormSubmit.ts` | `buildHandleSubmit(deps, checkDuplicateEvent)`. Isolado por LOC. | Supabase, guard, `utils`. |
| `types.ts` | `EventoFormState`, `Partner`, `DuplicateCandidate`, `SectionsState`. **Sem constantes, sem funções.** | `@/integrations/supabase/types`, `TransmissionSection`. |
| `constants.ts` | `INPUT_CLASS` (Tailwind base). | Nada. |
| `utils.ts` | `slugify`, `buildRoxouCaption`. Funções 100% puras. | `categoryConfig` apenas. |

## Regras de paridade (intocáveis até nova ordem)

- Nenhuma assinatura ou body de chamada a `supabase.from(...)`, `supabase.functions.invoke(...)`, `buildEventPayload`, `validateBeforePublish`, `persistValidationLog`, `analyzeAndLinkEventTransmission` pode mudar.
- Nenhum `toast.*` pode mudar texto.
- Nenhuma classe Tailwind no JSX pode mudar.
- Ordem de execução em `handleSubmit` é **lei**:
  1. validação obrigatória (`title/slug/date_time`)
  2. duplicate-candidate guard
  3. `checkDuplicateEvent({})` defensivo
  4. `buildEventPayload`
  5. `validateBeforePublish` → branch guard (`confirm` se published)
  6. `persistValidationLog`
  7. insert/update → side-effects (`eventou_imports`, `content_generations`, `ai_event_feedback_memory`)
  8. `analyzeAndLinkEventTransmission`
  9. `navigate("/admin/eventos")`

## Pontos de extensão futura

- **Fase 3D candidata:** migrar `actions` + `submit` para `src/services/events.ts`.
  Hoje permanecem inline (regra da Fase 3C).
- **Memoização:** `createEventoFormActions(deps)` é recriado a cada render
  por desígnio — preserva o comportamento original. Memoização só pode entrar
  após benchmark.

## Histórico

- **3C1 (2026-06-15):** extração inicial (1051 → 11 LOC).
- **3C2 (2026-06-15):** renomeações (`EventoFormActions.tsx` → `EventoFormHeader.tsx`,
  `helpers.ts` → `utils.ts`), `INPUT_CLASS` movido para `constants.ts`,
  contrato documentado.
