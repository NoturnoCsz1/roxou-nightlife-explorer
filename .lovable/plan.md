# Refatoração premium da página /jogos

Objetivo: transformar `/jogos` numa central brasileira de futebol da Roxou, priorizando Seleção, Série A, copas continentais e Copa do Mundo. Ligas internacionais e Série B saem do topo e vão para abas dedicadas.

## Escopo

- `src/pages/Jogos.tsx` (reescrita da estrutura visual + filtros)
- `src/lib/theSportsDb.ts` (novos helpers de classificação — sem remover existentes)
- `src/components/jogos/MatchCard.tsx` (variante premium "placar")
- `src/components/jogos/HomeJogosCard.tsx` (bloco da Home reduzido a Brasil/Copa)
- Novo: `src/components/jogos/MatchVenuesInline.tsx` (linha "X bares transmitem · Ver bares" + accordion)
- Novo: `src/components/jogos/OtherLeaguesAccordion.tsx` (agrupa por liga)

Fora do escopo: rotas, timezone, edge functions de sync, schema do Supabase.

## Classificação de prioridade (novos helpers em `theSportsDb.ts`)

Adicionar funções puras, reutilizáveis:

- `isBrazilSelecao(m)` — detecta Seleção Brasileira (home/away contém "brasil" + liga tipo "amistoso", "eliminator", "world cup", "copa america").
- `isSerieA(m)` — `league_label` casa `/brasileir[ãa]o\s*s[eé]rie\s*a|^brasileir[ãa]o$|brazilian serie a/i` (sem Série B).
- `isSerieB(m)` — `/s[eé]rie\s*b|brasileir[ãa]o\s*s[eé]rie\s*b/i`.
- `isCopaDoBrasil`, `isLibertadores`, `isSulAmericana`, `isMundialClubes`, `isCopaDoMundo`/eliminatórias.
- `isBrazilPriority(m)`: união de Seleção + Série A + copas BR + continentais + Copa do Mundo. **Usado como base do topo.**
- `getMatchBucket(m)`: retorna `"selecao" | "copa_mundo" | "serie_a" | "copa_brasil" | "libertadores" | "sul_americana" | "mundial_clubes" | "serie_b" | "outras"`.
- `groupByLeague(list)`: `Record<league_label, NormalizedMatch[]>` para o accordion.

Regex novas aceitam acentos/variações já vistas no projeto (Brasileirão, Brasileirao, Serie A, Série A, etc).

## Nova estrutura da página `/jogos`

```text
┌─ SEO (title/desc/keywords novos) ──────────────────────────┐
├─ HERO compacto                                              │
│   h1 "Jogos do Brasil, Copa do Mundo e onde assistir"       │
│   subtítulo + 4 chips: Hoje · Copa do Mundo · Tabelas ·     │
│                         Bares que transmitem                │
│   (links âncora p/ seções da página)                        │
├─ KPI strip (mantém: ao vivo, bares, chats)                  │
├─ Busca + chips de times (mantém)                            │
├─ FILTROS PRINCIPAIS (substitui FILTERS atual):              │
│   [Hoje] [Ao vivo] [Brasil] [Série A] [Copa do Brasil]      │
│   [Libertadores] [Sul-Americana] [Copa do Mundo]            │
│   [Série B] [Outras ligas]                                  │
│   default = "brasil"                                        │
├─ DESTAQUES DO BRASIL (sempre visível, exceto em "Outras")   │
│   topN 6 ordenados por isBrazilPriority + sortByRelevance   │
├─ AO VIVO AGORA (somente jogos Brasil-relevantes)            │
│   se vazio → não renderiza                                  │
├─ JOGOS DE HOJE (apenas buckets BR-relevantes)               │
│   + botão "Ver jogos de outras ligas hoje" → expande        │
├─ Conteúdo conforme filtro ativo (lista agrupada por data)   │
├─ Aba "Série B" (renderiza só quando filter=serie_b)         │
│   jogos + tabela + resultados (lazy)                        │
├─ Aba "Outras ligas" (renderiza só quando filter=outras)     │
│   OtherLeaguesAccordion: agrupado por league_label          │
├─ Tabelas (mantém, reordena): Brasileirão A → Libertadores  │
│   → Sul-Americana → Copa do Mundo. Série B só dentro da aba │
├─ Bares que transmitem (mantém seção #bares-esportivos)      │
└─ Empty states condicionais                                  │
```

## Cards "placar premium" (MatchCard)

Refinos visuais (sem quebrar API atual: mesmas props):

- Escudos 56px, nomes truncados em 2 linhas centralizadas.
- Horário grande no centro com "×" neon roxo (dourado em Copa, vermelho em ao vivo).
- Badge de campeonato no topo-esquerdo, status no topo-direito.
- Glass: `bg-card/50 backdrop-blur-md`. Borda neon condicional:
  - Brasil (Série A, copas BR): borda `from-emerald-400/40 to-yellow-400/40`.
  - Copa do Mundo: borda dourada já existente.
  - Ao vivo: ring vermelho pulsante já existente.
  - Demais: borda padrão muted.
- Substitui o rodapé "X bares transmitem" pelo novo `MatchVenuesInline` (1 linha + accordion ao clique, em vez de lista renderizada sempre).

## Bares colapsados (`MatchVenuesInline`)

Linha única: `🍻 3 bares cadastrados transmitem este jogo · [Ver bares]`. Botão abre `<details>` com `MatchVenuesQuickList` interno. Substitui o uso atual de `<MatchVenuesQuickList>` renderizado sempre embaixo dos cards prioritários em `PriorityMatchBlock` e demais lugares.

## Home (`HomeJogosCard`)

- Filtra `data` por `isBrazilPriority(m) || m.is_world_cup || isBrazilSelecao(m)`.
- Mostra no máx. 3: próximo BR relevante + ao vivo nacional + Copa do Mundo (se houver).
- Esconde se a lista filtrada ficar vazia (não exibe ligas aleatórias).
- Título: "Futebol na Roxou". Subtítulo: "Jogos do Brasil, Copa do Mundo e onde assistir em Prudente." CTA: "Ver calendário de jogos →".

## SEO

`SEO` da rota /jogos:
- title: `Jogos do Brasil, Copa do Mundo e Futebol Hoje | Roxou`
- description conforme spec
- keywords conforme spec
- canonical mantém

## Empty states

- Sem jogos BR no filtro ativo → "Nenhum jogo brasileiro encontrado agora. Você ainda pode ver outras ligas internacionais abaixo." + atalho p/ aba "Outras ligas".
- Sem Copa do Mundo → mensagem dedicada na seção Copa.
- Sem Série B → mensagem dedicada na aba.

## Garantias / não-quebra

- Rota `/jogos` preservada.
- Timezone: continua usando helpers de `@/lib/dateUtils` (`todayKeySP`, `weekRange`, etc.).
- Nenhum dado removido — apenas reorganização/filtros de exibição.
- Sem invenções: se a fonte não retornar dados, mostra empty state.
- Sem loading infinito: mantém `isLoading = loadingApi || loadingDb` + skeletons já existentes; nenhum `await` novo bloqueante.
- Visual dark/neon Roxou mantido (tokens, glassmorphism, sombras existentes).
- Build (`tsc --noEmit` + Vite) é validado no fim; ajuste de erros sem mudar regra funcional.

## Detalhes técnicos

- Migração de `FilterKey` para incluir os novos buckets brasileiros + `serie_b` + `outras`. Os antigos `amanha`/`semana`/`fds` ficam disponíveis em sub-controle dentro de "Hoje" (chip secundário) para não perder funcionalidade.
- `relevantBase` é recomputado para priorizar `isBrazilPriority` e excluir Série B/outras do topo (Série B aparece só na aba dedicada; outras só na aba "Outras ligas").
- `OtherLeaguesAccordion`: `Object.entries(groupByLeague(others)).sort((a,b)=>a[0].localeCompare(b[0]))`, cada grupo é um `<details>` com cards compactos.
- Performance: nenhuma nova query Supabase; só re-uso de `matches`/`metaMap`/`enrichMap`.

## Validação final

1. `bunx tsc --noEmit` limpa.
2. Smoke manual: `/jogos` carrega, default "Brasil" mostra Destaques do Brasil; "Série B" só aparece ao clicar; "Outras ligas" agrupado por liga; Home só mostra bloco se houver jogo BR/Copa.
3. Console sem erros novos.
