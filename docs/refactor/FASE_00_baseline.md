# Fase 0 — Baseline (Roxou, 15/06/2026)

Snapshot pré-refatoração. Sem alterações de código nesta fase.

## Stack
React 18.3 · Vite 5 · TS 5 · Tailwind 3 · shadcn · React Router 6.30 · Supabase 2.98 · vite-plugin-pwa · recharts · leaflet · jszip · dompurify · react-markdown · date-fns 3.6 (+ camada SP em `src/lib/dateUtils.ts`).

## Inventário de LOC
- Total auditável (sem `ui/`, `test/`, `integrations/`): **55.746 linhas** em ~229 arquivos TS/TSX.

### Arquivos > 500 LOC (precisam quebrar para atingir teto 500)

| LOC | Arquivo |
|----:|---------|
| 2445 | `src/pages/v3/V3Home.tsx` |
| 1767 | `src/pages/admin/EventoBulkForm.tsx` |
| 1610 | `src/pages/admin/RadarIA.tsx` |
| 1557 | `src/pages/admin/EstabelecimentosAudit.tsx` |
| 1441 | `src/lib/coverRenderer.ts` |
| 1256 | `src/pages/admin/EventosList.tsx` |
| 1093 | `src/components/admin/InstagramStudio.tsx` |
| 1051 | `src/pages/admin/EventoForm.tsx` |
|  990 | `src/pages/Jogos.tsx` |
|  986 | `src/pages/admin/JogosAdmin.tsx` |
|  978 | `src/components/admin/InstagramAgenda.tsx` |
|  974 | `src/pages/admin/StoryAgendaDoDia.tsx` |
|  960 | `src/pages/v3/V3RideRequest.tsx` |
|  896 | `src/pages/v3/V3LocalDetail.tsx` |
|  896 | `src/components/admin/InstagramCovers.tsx` |
|  876 | `src/pages/admin/EventouAdmin.tsx` |
|  822 | `src/lib/theSportsDb.ts` |
|  771 | `src/pages/admin/InstagramAdmin.tsx` |
|  732 | `src/pages/admin/Sugestoes.tsx` |
|  685 | `src/pages/EventDetail.tsx` |
|  685 | `src/components/admin/ReelGenerator.tsx` |
|  646 | `src/components/admin/InstagramContentGenerator.tsx` |
|  610 | `src/pages/admin/Dashboard.tsx` |
|  606 | `src/pages/v3/V3Discover.tsx` |
|  557 | `src/pages/CadastroMotorista.tsx` |
|  541 | `src/pages/PertoDeMim.tsx` |
|  530 | `src/components/admin/AnalyticsHero.tsx` |
|  525 | `src/pages/JogoDetail.tsx` |
|  512 | `src/pages/v3/V3Agenda.tsx` |
|  508 | `src/lib/eventIngestionGuard.ts` |

→ **30 arquivos** acima do teto de 500 LOC.

## Lint (estado atual)
`npm run lint` reporta **798 errors / 62 warnings** pré-existentes em todo o repo (Edge Functions inclusas). **Nenhum é introduzido pela Fase 0.** A Fase 10 incluirá uma varredura para reduzi-los.

## Bundle / Web Vitals
Coleta de bundle report (rollup-plugin-visualizer) e Web Vitals (LCP/FCP/INP) será adicionada como pré-requisito da Fase 7 (Bundle). Nesta fase, ficam registrados apenas os comandos a executar antes daquela:

```bash
npm run build           # produz dist/
# Métricas vivas: Lighthouse mobile na rota /
```

## Aliases / Diretórios
Estado atual: `@/*` único. **A Fase 1 introduz aliases adicionais sem mover nada.**

## Riscos identificados (referência para próximas fases)
1. **Megafiles** acima — qualquer mudança transversal é arriscada antes da Fase 3.
2. **Sem camada `services/` e `types/`** — lógica de dados misturada com UI.
3. **Telemetria dupla** (`analytics_events` + `page_views` + `visitor_sessions` + GA4).
4. **Admin e público no mesmo build** — afeta bundle.
5. **`coverRenderer.ts` (1441 LOC)** carregado mesmo em rotas públicas.

## Checkpoint
Snapshot inicial deve ser feito via **History tab** da Lovable antes da Fase 1.
