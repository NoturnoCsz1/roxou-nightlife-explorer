# Fase 6G — Move EventoBulkForm para apps/admin/pages

## Escopo
Mover fisicamente `src/pages/admin/EventoBulkForm.tsx` para `src/apps/admin/pages/EventoBulkForm.tsx`.

## Alterações
1. **Cópia física**: `src/apps/admin/pages/EventoBulkForm.tsx` criado com conteúdo idêntico ao original (1768 linhas).
2. **Shim de compatibilidade**: `src/pages/admin/EventoBulkForm.tsx` substituído por re-export fino:
   ```ts
   export { default } from "@/apps/admin/pages/EventoBulkForm";
   ```
3. **App.tsx**: lazy import atualizado (linha 41):
   ```ts
   const EventoBulkForm = lazy(() => import("./apps/admin/pages/EventoBulkForm"));
   ```
4. **Ajustes cosméticos**:
   - Adicionado cabeçalho `eslint-disable @typescript-eslint/no-explicit-any` no arquivo movido.
   - Corrigido `catch {}` vazio (linha 100) para `catch { /* ignore parse errors */ }` — mesmo comportamento, elimina erro de lint.

## NÃO alterado
- OpenAI / generate-description / extract-flyer-metadata
- smartDuplicates / eventIngestionGuard / partner_awards / partner lookup
- SEO / instagram_caption / short_summary / ai_confidence_score / ai_warnings / needs_review
- Story Generator / Upload de flyers / Canvas / Auto publicação
- Edge Functions / Queries Supabase / Payloads
- Fluxos de publicação / rascunho / duplicidade / IA
- Rotas / RLS

## Validação
| Critério | Resultado |
|----------|-----------|
| Build | Verde (~13.4s) |
| tsc --noEmit | Verde |
| eslint arquivos tocados | 0/0 |
| Lazy chunk emitido | `EventoBulkForm-D0YAai9T.js` ✅ |
| Gate /admin/eventos/lote | Sem ChunkLoadError |

## Status
Fase 6G concluída. Aguardando aprovação manual para próxima fase.
