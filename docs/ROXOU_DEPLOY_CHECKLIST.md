# 🚀 Roxou — Checklist de Deploy

Siga **na ordem**. Não pule etapas em alterações que tocam Home, IA, Transporte ou banco.

## 1. Antes de começar
- [ ] Criar branch dedicada (uma feature por branch)
- [ ] Reler a área crítica em `ROXOU_CRITICAL_AREAS.md`
- [ ] Definir escopo mínimo da mudança (1 prompt = 1 alteração)

## 2. Durante a alteração
- [ ] Aplicar **uma mudança por vez**
- [ ] Não misturar Home + IA + Transporte no mesmo prompt
- [ ] Não misturar UI + migration no mesmo prompt
- [ ] Preservar tokens semânticos do design system
- [ ] Não editar `src/integrations/supabase/client.ts` ou `types.ts`

## 3. Validações técnicas
- [ ] Build passou sem erro
- [ ] Sem erros TypeScript novos
- [ ] Sem erros de console críticos no preview
- [ ] Migrations Supabase revisadas (sem `ALTER DATABASE`, sem mexer em `auth/storage/realtime`)
- [ ] RLS aplicada nas tabelas novas
- [ ] Timezone America/Sao_Paulo validada

## 4. Validações visuais
- [ ] Preview mobile (375–414px) OK
- [ ] Preview desktop (≥1024px, max-w-7xl) OK
- [ ] Dark theme/glassmorphism preservados
- [ ] Layout público inalterado quando refator é só admin

## 5. Validações funcionais
- [ ] Rotas principais abrem: `/`, `/agenda`, `/ia`, `/noticias`, `/expo2026`, `/cadastro-motorista`, `/pedir-carona`, `/admin`
- [ ] Checklist de regressão (`ROXOU_REGRESSION_CHECKLIST.md`) marcado
- [ ] Edge functions afetadas testadas

## 6. Deploy
- [ ] Publicar via Lovable
- [ ] Smoke test em produção (`https://roxou.com.br`)
- [ ] Monitorar console/edge logs primeiros 10 min
