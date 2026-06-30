# Onda 4 — Plano de execução

Sem novas tabelas, RPCs ou colunas. Reuso máximo. Comportamento preservado.

## 1. Quebrar `BioTabs.tsx` (1358 linhas)

Extrair cada aba para arquivo próprio em `src/apps/partner/bio/tabs/`, mantendo `BioTabs.tsx` como orquestrador (~150 linhas):

```text
src/apps/partner/bio/
├── BioTabs.tsx                  # container + shadcn Tabs + roteamento
└── tabs/
    ├── BioHomeTab.tsx           # já existe inline → mover
    ├── BioProfileTab.tsx
    ├── BioLinksTab.tsx
    ├── BioMenuTab.tsx           # alvo da etapa 4
    ├── BioAnalyticsTab.tsx
    ├── BioQrTab.tsx             # alvo da etapa 3
    ├── BioShareTab.tsx          # nova (extrai painel Compartilhar)
    └── BioSettingsTab.tsx
```

Sem mudança de props, sem mudança de UX. Apenas split físico + imports.

## 2. Refatorar `PartnerAnalyticsPage.tsx` (441 linhas)

Quebrar em sub-componentes lazy:

```text
src/apps/partner/analytics/
├── AnalyticsKpis.tsx           # KPIs topo (sync)
├── AnalyticsFunnel.tsx         # funil de conversão (lazy)
├── AnalyticsSources.tsx        # origem/UTM (lazy)
├── AnalyticsDevice.tsx         # dispositivo/SO/browser (lazy)
└── AnalyticsHourly.tsx         # horários de pico (lazy)
```

`PartnerAnalyticsPage` vira shell de tabs com `React.lazy` + `Suspense`.

## 3. QR Studio unificado

Em `BioQrTab` adicionar sub-abas de geração com tipos:

- **Bio** (já existe)
- **Reserva** (link `/r/:partnerSlug`)
- **Lista VIP** (link `/lista/:listId`)
- **Evento** (link `/eventos/:slug`)
- **WhatsApp** (`https://wa.me/<num>?text=…`)
- **PIX** (payload BR Code copia-e-cola, gerado client-side a partir de chave/valor)

Tudo client-side com a lib `qrcode` já instalada. Sem tabelas. Helper novo: `src/apps/partner/bio/qr/qrTargets.ts` com builders.

## 4. Cardápio premium (sem novas tabelas)

Aproveitar campos existentes em `menu_items` (`is_featured`, `is_active`, `price`, `description`, `image_url`) e flags derivadas em runtime. O que adicionar visualmente em `BioMenuTab` + página pública `PublicBioMenuPage`:

- **Destaque**: filtro por `is_featured`.
- **Mais vendidos**: ranking via `bio_analytics` (eventos `menu_item_click`); fallback ordem manual.
- **Promoções**: heurística — itens com `description` contendo "promo"/"oferta" OU preço riscado via convenção `compare_at` em metadata (se presente). Se ausente, esconder seção.
- **Complete seu pedido**: bloco final com 3 itens da mesma categoria do último clicado (estado local).
- **Cross-sell simples**: ao abrir detalhe de um item, sugerir 2 itens da categoria "Bebidas" se item for "Comida" e vice-versa.

Tudo derivado, sem migração.

## 5. Performance

- `vite.config.ts` — `manualChunks` para isolar `recharts` e `qrcode`.
- `React.lazy` nos sub-componentes do Analytics (etapa 2).
- `loading="lazy"` + `decoding="async"` nas imagens de menu e bio.
- Remover imports estáticos de Recharts no shell do Analytics.

## 6. Revisão mobile

Checklist visual via Playwright (375×800) nas rotas:

- `/bio` (todas as 8 abas — overflow, sticky, FAB)
- `/analytics` (tabs colapsadas, gráficos lazy)
- `/bio/qr` (sub-abas + preview QR centralizado)
- `/configuracoes` (acordeão dos 6 grupos)

Correções pontuais apenas onde houver overflow ou sobreposição.

## Validação final

```bash
bunx tsgo --noEmit
bun run build
```

Confirmar redução do chunk `recharts` para fora do bundle principal e ausência de regressões.

## Fora de escopo

- Novas tabelas, colunas, RPCs ou edge functions.
- Mudanças em CRM, Transportes, GPS, Pagamentos.
- Redesign das páginas — apenas split, lazy e features visuais aditivas no cardápio.

Aprovado para executar a Onda 4.

&nbsp;

Ajustes obrigatórios antes da implementação:

&nbsp;

1. QR Studio:

Antes de criar builders fixos, auditar as rotas públicas reais de Reserva, Lista VIP, Evento, WhatsApp e PIX.

Usar somente rotas canônicas existentes.

Não inventar rota nova.

&nbsp;

2. PIX:

Se já existir helper de BR Code no projeto, reutilizar.

Se não existir, nesta fase gerar apenas QR simples com chave PIX/texto informado.

Não implementar regra complexa de Pix copia-e-cola agora.

&nbsp;

3. Escopo:

Sem novas tabelas, colunas, RPCs, edge functions ou dependências.

Sem mudança de comportamento.

Apenas split, lazy loading, QR Studio, cardápio premium visual e ajustes mobile.

&nbsp;

Executar Onda 4 com:

- BioTabs quebrado por abas

- Analytics lazy/refatorado

- QR Studio unificado

- Cardápio premium sem schema novo

- Manual chunks para Recharts/QRCode

- Revisão mobile

&nbsp;

Finalizar com:

bunx tsgo --noEmit

bun run build

&nbsp;

E entregar relatório com:

- arquivos criados/alterados

- chunk principal antes/depois, se disponível

- validação mobile

- pendências que ficaram fora de escopo