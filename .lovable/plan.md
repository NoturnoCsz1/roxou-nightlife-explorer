## Objetivo

Eliminar Soft 404 e páginas "Rastreada mas não indexada" no Google Search Console, garantindo que toda URL pública da Roxou retorne conteúdo SEO-rico mesmo quando o banco não tem evento/local correspondente.

---

## Bloco 1 — Landing pages de categoria sempre com conteúdo

**Arquivo:** `src/pages/SEOLanding.tsx`

Cobertura: `/funk-em-presidente-prudente`, `/sertanejo-em-presidente-prudente`, `/pagode-em-presidente-prudente`, `/baladas-em-presidente-prudente`, `/musica-ao-vivo-em-presidente-prudente` (novo slug), `/o-que-fazer-em-presidente-prudente-hoje` (novo slug).

Mudanças:

1. Cada `LandingConfig` ganha um campo `evergreen` com 4 blocos sempre renderizados (independente de haver eventos): História/contexto, Locais típicos da categoria, Como acompanhar pela Roxou, CTA final para `/agenda`.
2. Remover o estado de "Nenhum evento encontrado." isolado. Quando `filtered.length === 0`, o componente exibe os blocos evergreen + FAQ + Eventos relacionados (lista de links para outras categorias) + CTA, sem mensagem de erro.
3. Adicionar 2 novas entradas em `LANDING_CONFIGS`:
  - `musica-ao-vivo-em-presidente-prudente`: filtro por keywords `música ao vivo|show ao vivo|banda`.
  - `o-que-fazer-em-presidente-prudente-hoje`: filtro = eventos de hoje (já existe `isTodaySP`).
4. Garantir JSON-LD presente em todas: `CollectionPage` + `BreadcrumbList` + `FAQPage` + `Event[]` (só quando há eventos reais).

---

## Bloco 2 — Páginas de evento encerrado

**Arquivo:** `src/pages/EventDetail.tsx`

Mudanças:

1. Quando evento existe mas `date_time < now`: continuar renderizando nome, data, local, descrição, categoria — já mostra hoje, mas adicionar abaixo:
  - "Eventos relacionados" (mesma categoria, próximos 30 dias).
  - "Próximos eventos no mesmo local" (mesmo `partner_id`, futuros).
  - CTA visível para `/agenda`.
2. Quando o slug não existe no banco (404 real): em vez de página vazia, retornar `<Navigate to="/agenda" replace />` com flag `replace` (SPA redirect). Server-side 301 não é possível na hospedagem Lovable; o redirect SPA + canonical `/agenda` no destino é o equivalente prático para crawlers que executam JS.
3. JSON-LD `Event` mantido mesmo para eventos passados (com `eventStatus: EventScheduled` ou `EventPostponed` conforme apropriado — passados ficam como ocorreram).

---

## Bloco 3 — Páginas de local (`LocalDetail`)

**Arquivo:** `src/pages/LocalDetail.tsx`

Mudanças:

1. Garantir que toda página renderiza: Nome, Categoria, Bairro, Descrição (com fallback gerado a partir de nome+categoria+cidade se o campo estiver vazio), Eventos passados (últimos 12), Eventos futuros, Locais semelhantes (mesma categoria, ordenados por proximidade ou views), CTA.
2. Slug inexistente → `<Navigate to="/parceiros" replace />`.
3. JSON-LD `LocalBusiness` + `BreadcrumbList`.

---

## Bloco 4 — Canonical único sem parâmetros de tracking

**Arquivo:** `src/components/SEO.tsx`

Hoje o componente aceita `canonical` como prop. Adicionar:

1. Quando `canonical` não é passado, derivar de `window.location.pathname` (sem search/hash) + domínio `https://roxou.com.br`.
2. Helper `stripTrackingParams(url)` removendo: `utm_*`, `fbclid`, `gclid`, `ref`, `when`, `page`. Aplicado quando o canonical é montado dinamicamente.
3. Auditar e adicionar `<SEO canonical={...}>` nas páginas que faltam: `Agenda` (V3Agenda), `Indica`/`Parceiros`, `Categorias`, `Jogos`, `RoxouNoticia`, `EventDetail`, `LocalDetail`. Cada uma fixa o canonical para a URL limpa da própria rota.

---

## Bloco 5 — Links internos automáticos

Componente novo: `src/components/InternalLinkCloud.tsx`

Renderiza, em rodapé de página, um bloco "Explorar na Roxou" com até 12 links contextuais. Integrado em:

- `EventDetail`: links para categoria, local, agenda, outras 3 categorias musicais.
- `LocalDetail`: links para categoria, agenda, locais semelhantes, notícias relacionadas.
- `RoxouNoticia`: links para agenda, categorias mencionadas no corpo, locais citados.
- `V3Agenda`: links para todas as landings de categoria + locais com mais eventos.
- `SEOLanding`: já tem `relatedLinks` — apenas garantir presença do bloco mesmo em estado vazio.

---

## Bloco 6 — Sitemap

**Arquivo:** `supabase/functions/sitemap/index.ts`

Adicionar 2 novos slugs SEO: `musica-ao-vivo-em-presidente-prudente` e `o-que-fazer-em-presidente-prudente-hoje`. Manter o restante intacto.

---

## Detalhes técnicos

- **301 vs SPA redirect**: hospedagem Lovable não permite `_redirects`/`netlify.toml`. Soluções:
  - Slug inválido: redirect cliente via `<Navigate replace />` para `/agenda` (evento) ou `/parceiros` (local). Crawlers JS-capable seguem; o canonical do destino fixa a URL final.
  - Quando o usuário migrar para domínio próprio (`roxou.com.br`) num servidor com nginx, os 301 reais entram via NGINX (já documentado em `NGINX_ROXOU.conf.example`). Adicionarei comentário no arquivo .conf.example listando os padrões de 301 sugeridos (`/evento/* não encontrado → /agenda`).
- **Canonical**: domínio `https://roxou.com.br` (memória do projeto).
- **Conteúdo evergreen**: 400-800 palavras escritos como texto estático em PT-BR no próprio config, dividido em 3-4 parágrafos por categoria. Sem dados fictícios — só contexto/educacional sobre a cena local.

---

## Arquivos tocados (estimativa)

```
src/pages/SEOLanding.tsx              (evergreen + 2 novas configs)
src/pages/EventDetail.tsx             (relacionados + redirect)
src/pages/LocalDetail.tsx             (fallback + redirect)
src/components/SEO.tsx                (canonical limpo)
src/components/InternalLinkCloud.tsx  (novo)
src/pages/v3/V3Agenda.tsx             (links internos + canonical)
src/pages/RoxouNoticia.tsx            (links + canonical)
src/pages/Categorias.tsx              (canonical)
src/pages/Jogos.tsx                   (canonical)
src/pages/Indica.tsx ou V3Parceiros   (canonical)
supabase/functions/sitemap/index.ts   (2 novos slugs)
NGINX_ROXOU.conf.example              (regras 301 documentadas)
```

---

## Validação

- `bun run typecheck` + build.
- Abrir cada landing nova/atualizada no preview (mobile 360px) e conferir presença de H1, H2 e blocos evergreen quando `filtered.length === 0`.
- Verificar JSON-LD no DOM com `document.querySelectorAll('script[type="application/ld+json"]')`.
- Conferir canonical sem `?utm_...` ao acessar com tracking params.

## Pergunta antes de executar

Confirmar:

1. Posso criar os 2 novos slugs `/musica-ao-vivo-em-presidente-prudente` e `/o-que-fazer-em-presidente-prudente-hoje`?
2. Para slug de evento/local inexistente, OK usar `<Navigate replace />` (SPA) + deixar 301 real documentado no NGINX para quando rodar fora do Lovable?

# PROMPT LOVABLE — CORRIGIR SOFT 404 E “RASTREADA, MAS NÃO INDEXADA” NA ROXOU

&nbsp;

Objetivo:

Eliminar Soft 404 e reduzir páginas “Rastreada, mas não indexada” no Google Search Console, garantindo que toda URL pública da Roxou retorne conteúdo útil, SEO-rico, indexável e com contexto local de Presidente Prudente, mesmo quando não houver eventos cadastrados para aquela categoria ou quando um evento já estiver encerrado.

&nbsp;

IMPORTANTE:

- Não alterar backend.

- Não alterar Supabase.

- Não alterar RLS.

- Não alterar RPCs.

- Não alterar migrations.

- Não alterar Partner Pro.

- Não alterar Reservas.

- Não alterar Lista VIP.

- Não alterar Conta Roxou.

- Não alterar Validador QR.

- Não alterar Analytics.

- Não criar dados fictícios.

- Usar somente eventos, locais e parceiros reais da base.

- Foco apenas em SEO, renderização e experiência pública.

&nbsp;

====================================================

BLOCO 1 — LANDING PAGES DE CATEGORIA SEMPRE COM CONTEÚDO

====================================================

&nbsp;

Arquivo principal:

src/pages/SEOLanding.tsx

&nbsp;

Cobertura obrigatória das rotas:

&nbsp;

/pagode-em-presidente-prudente

/funk-em-presidente-prudente

/sertanejo-em-presidente-prudente

/baladas-em-presidente-prudente

/musica-ao-vivo-em-presidente-prudente

/o-que-fazer-em-presidente-prudente-hoje

&nbsp;

Essas páginas nunca podem parecer vazias para o Google.

&nbsp;

----------------------------------------------------

1.1 — Adicionar campo evergreen em cada LandingConfig

----------------------------------------------------

&nbsp;

Cada LandingConfig deve ganhar:

&nbsp;

evergreen: {

  contextTitle: string;

  contextText: string[];

  placesTitle: string;

  placesText: string[];

  howToFollowTitle: string;

  howToFollowText: string[];

  finalCtaTitle: string;

  finalCtaText: string[];

}

&nbsp;

Renderizar SEMPRE esses blocos, independente de haver eventos.

&nbsp;

Os blocos obrigatórios são:

&nbsp;

1. História / contexto da categoria em Presidente Prudente

2. Locais típicos que costumam receber esse tipo de programação

3. Como acompanhar novos eventos pela Roxou

4. CTA final para acessar /agenda

&nbsp;

Exemplo de estrutura visual:

&nbsp;

H2: História e contexto

Texto longo contextualizado.

&nbsp;

H2: Locais que costumam receber esse tipo de evento

Texto sobre bares, casas noturnas, restaurantes, festas e eventos da cidade, sem inventar nomes se não vierem da base.

&nbsp;

H2: Como acompanhar pela Roxou

Texto explicando que a agenda é atualizada diariamente.

&nbsp;

H2: Veja a agenda completa

CTA para /agenda.

&nbsp;

----------------------------------------------------

1.2 — Remover estado vazio fraco

----------------------------------------------------

&nbsp;

Remover qualquer estado isolado como:

&nbsp;

"Nenhum evento encontrado."

&nbsp;

ou

&nbsp;

"Nada encontrado no momento."

&nbsp;

Quando filtered.length === 0, renderizar:

&nbsp;

- Blocos evergreen;

- FAQ;

- Links para outras categorias;

- CTA para /agenda;

- Seção “Você também pode gostar”;

- Texto:

  “Ainda não encontramos eventos desta categoria cadastrados para hoje, mas a agenda da Roxou é atualizada constantemente. Confira outras opções de bares, shows, festas e eventos em Presidente Prudente.”

&nbsp;

Essa mensagem nunca deve ser a única coisa da página.

&nbsp;

----------------------------------------------------

1.3 — Adicionar novas LandingConfig

----------------------------------------------------

&nbsp;

Adicionar ao LANDING_CONFIGS:

&nbsp;

A) musica-ao-vivo-em-presidente-prudente

&nbsp;

Rota:

/musica-ao-vivo-em-presidente-prudente

&nbsp;

Title:

Música ao Vivo em Presidente Prudente Hoje | Bares e Eventos | Roxou

&nbsp;

Description:

Veja onde tem música ao vivo em Presidente Prudente hoje. Descubra bares, restaurantes, eventos e casas noturnas com programação atualizada diariamente.

&nbsp;

H1:

Música ao Vivo em Presidente Prudente Hoje

&nbsp;

Keywords/filtro:

música ao vivo

musica ao vivo

show ao vivo

banda

voz e violão

ao vivo

rock ao vivo

samba ao vivo

sertanejo ao vivo

&nbsp;

B) o-que-fazer-em-presidente-prudente-hoje

&nbsp;

Rota:

/o-que-fazer-em-presidente-prudente-hoje

&nbsp;

Title:

O Que Fazer em Presidente Prudente Hoje? | Agenda de Eventos e Rolês | Roxou

&nbsp;

Description:

Descubra o que fazer em Presidente Prudente hoje. Encontre bares, baladas, shows, música ao vivo, festas universitárias, eventos, futebol ao vivo e muito mais na agenda atualizada da Roxou.

&nbsp;

H1:

O Que Fazer em Presidente Prudente Hoje?

&nbsp;

Filtro:

Eventos de hoje usando isTodaySP já existente.

Também incluir categorias amplas:

bares

baladas

shows

música ao vivo

jogos

futebol

restaurantes

festas

eventos

&nbsp;

----------------------------------------------------

1.4 — JSON-LD obrigatório em todas as landing pages

----------------------------------------------------

&nbsp;

Garantir que todas as landings tenham:

&nbsp;

- CollectionPage

- BreadcrumbList

- FAQPage

- Event[]

&nbsp;

Regras:

- Event[] só deve ser gerado para eventos reais da base.

- Se não houver eventos reais, não criar Event fictício.

- FAQPage sempre presente.

- BreadcrumbList sempre presente.

- CollectionPage sempre presente.

&nbsp;

----------------------------------------------------

1.5 — Links internos entre categorias

----------------------------------------------------

&nbsp;

Adicionar seção:

&nbsp;

“Você também pode gostar”

&nbsp;

Com links para:

&nbsp;

/pagode-em-presidente-prudente

/funk-em-presidente-prudente

/sertanejo-em-presidente-prudente

/baladas-em-presidente-prudente

/musica-ao-vivo-em-presidente-prudente

/o-que-fazer-em-presidente-prudente-hoje

/shows-em-presidente-prudente

/bares-em-presidente-prudente

&nbsp;

Exibir apenas links existentes no SEO_LANDING_SLUGS.

&nbsp;

====================================================

BLOCO 2 — PÁGINAS DE EVENTO ENCERRADO

====================================================

&nbsp;

Arquivo:

src/pages/EventDetail.tsx

&nbsp;

Objetivo:

Evitar Soft 404 em páginas de eventos passados ou antigos.

&nbsp;

----------------------------------------------------

2.1 — Evento existe, mas já passou

----------------------------------------------------

&nbsp;

Quando o evento existir no banco e date_time < now:

&nbsp;

Continuar renderizando normalmente:

&nbsp;

- Nome do evento

- Data

- Horário

- Local

- Descrição

- Categoria

- Imagem, se existir

- Informações do local, se existir

&nbsp;

Adicionar abaixo:

&nbsp;

A) Bloco “Evento encerrado”

Texto:

“Este evento já aconteceu, mas a Roxou mantém esta página como registro da agenda de eventos em Presidente Prudente. Confira abaixo outras opções parecidas ou acesse a agenda atualizada.”

&nbsp;

B) Eventos relacionados

Buscar/renderizar eventos reais futuros da mesma categoria nos próximos 30 dias.

&nbsp;

C) Próximos eventos no mesmo local

Buscar/renderizar eventos reais futuros com o mesmo partner_id/local.

&nbsp;

D) CTA para agenda

Botão:

“Ver agenda atualizada”

&nbsp;

Link:

/agenda

&nbsp;

E) Links internos

Adicionar links para:

- /agenda

- /eventos

- /o-que-fazer-em-presidente-prudente-hoje

- landing da categoria quando fizer sentido.

&nbsp;

----------------------------------------------------

2.2 — Evento não existe no banco

----------------------------------------------------

&nbsp;

Quando o slug não existir:

&nbsp;

Não renderizar página vazia.

Não renderizar “evento não encontrado” com 200 OK e pouco conteúdo.

&nbsp;

Como server-side 301 não é possível na hospedagem atual/Lovable, implementar redirecionamento SPA:

&nbsp;

<Navigate to="/agenda" replace />

&nbsp;

Antes de redirecionar, garantir que não seja exibida uma página vazia.

&nbsp;

A página destino /agenda já deve ter canonical correto para:

https://roxou.com.br/agenda

&nbsp;

----------------------------------------------------

2.3 — JSON-LD para eventos passados

----------------------------------------------------

&nbsp;

Manter JSON-LD Event quando o evento existir, mesmo se já passou.

&nbsp;

Adicionar:

eventStatus: "https://schema.org/EventScheduled"

&nbsp;

Não criar status falso.

Não marcar como cancelado se não houver informação real de cancelamento.

&nbsp;

====================================================

BLOCO 3 — PÁGINAS DE LOCAL / ESTABELECIMENTO

====================================================

&nbsp;

Arquivo provável:

src/pages/LocalDetail.tsx

ou equivalente usado por /local/:slug

&nbsp;

Objetivo:

Evitar Soft 404 em locais com poucos dados.

&nbsp;

----------------------------------------------------

3.1 — Local existe

----------------------------------------------------

&nbsp;

Sempre renderizar:

&nbsp;

- Nome do local

- Categoria/tipo

- Cidade: Presidente Prudente/SP

- Descrição do local, se existir

- Endereço, se existir

- Próximos eventos no local

- Eventos passados no local

- Locais semelhantes, se existirem

- CTA para /agenda

&nbsp;

Se o local não tiver eventos futuros, renderizar conteúdo evergreen:

&nbsp;

“Este local faz parte da agenda da Roxou em Presidente Prudente. A programação pode variar conforme a semana. Acompanhe a agenda atualizada para ver novos eventos, shows, transmissões e experiências na cidade.”

&nbsp;

----------------------------------------------------

3.2 — Local não existe

----------------------------------------------------

&nbsp;

Se o slug não existir no banco:

&nbsp;

Redirecionar via SPA:

&nbsp;

<Navigate to="/agenda" replace />

&nbsp;

Não deixar página vazia com 200 OK.

&nbsp;

====================================================

BLOCO 4 — CANONICAL E PARÂMETROS

====================================================

&nbsp;

Garantir canonical único para páginas públicas:

&nbsp;

/agenda

/eventos

/noticias

/jogos

/evento/:slug

/local/:slug

/noticia/:slug

/jogo/:slug

/landing-pages-seo

&nbsp;

Ignorar no canonical:

&nbsp;

utm_source

utm_medium

utm_campaign

utm_content

utm_term

fbclid

gclid

ref

source

when

page

q

&nbsp;

Exemplo:

&nbsp;

/agenda?utm_source=instagram

&nbsp;

Canonical:

https://roxou.com.br/agenda

&nbsp;

====================================================

BLOCO 5 — SITEMAP

====================================================

&nbsp;

Não criar sitemap novo.

&nbsp;

Atualizar o sitemap existente para incluir apenas URLs que retornam conteúdo útil.

&nbsp;

Garantir que estas rotas estejam no sitemap:

&nbsp;

/pagode-em-presidente-prudente

/funk-em-presidente-prudente

/sertanejo-em-presidente-prudente

/baladas-em-presidente-prudente

/musica-ao-vivo-em-presidente-prudente

/o-que-fazer-em-presidente-prudente-hoje

&nbsp;

Não incluir no sitemap:

&nbsp;

/reserva/sucesso/*

/vip/*/sucesso/*

/cliente/*

/partner/*

/admin/*

/validator/*

/dashboard/*

/preview/*

/beta/*

/dev/*

&nbsp;

====================================================

BLOCO 6 — ROBOTS

====================================================

&nbsp;

Manter robots.txt existente.

&nbsp;

Garantir bloqueio:

&nbsp;

Disallow: /admin/

Disallow: /partner/

Disallow: /validator/

Disallow: /cliente/

Disallow: /conta/

Disallow: /configuracoes/

Disallow: /reserva/sucesso/

Disallow: /preview/

Disallow: /beta/

Disallow: /dashboard/

Disallow: /dev/

&nbsp;

Garantir:

&nbsp;

Sitemap: https://roxou.com.br/sitemap.xml

&nbsp;

====================================================

BLOCO 7 — VALIDAÇÃO

====================================================

&nbsp;

Executar:

&nbsp;

bun run typecheck

bun run build

&nbsp;

Testar manualmente:

&nbsp;

1. /funk-em-presidente-prudente

Deve ter conteúdo mesmo sem eventos.

&nbsp;

2. /sertanejo-em-presidente-prudente

Deve ter conteúdo mesmo sem eventos.

&nbsp;

3. /pagode-em-presidente-prudente

Deve ter conteúdo e eventos reais quando existirem.

&nbsp;

4. /musica-ao-vivo-em-presidente-prudente

Nova rota funcionando.

&nbsp;

5. /o-que-fazer-em-presidente-prudente-hoje

Nova rota funcionando e filtrando eventos de hoje.

&nbsp;

6. /evento/slug-antigo-existente

Deve mostrar evento encerrado + relacionados + CTA.

&nbsp;

7. /evento/slug-inexistente

Deve redirecionar para /agenda.

&nbsp;

8. /local/slug-existente-sem-eventos

Deve mostrar conteúdo evergreen + CTA.

&nbsp;

9. /local/slug-inexistente

Deve redirecionar para /agenda.

&nbsp;

10. /sitemap.xml

Deve continuar XML válido, sem HTML.

&nbsp;

11. /sitemap.xml/

Deve não quebrar. Se possível, redirecionar para /sitemap.xml sem barra final.

&nbsp;

====================================================

RESULTADO ESPERADO

====================================================

&nbsp;

- Reduzir Soft 404.

- Reduzir “Rastreada, mas não indexada”.

- Aumentar páginas úteis indexadas.

- Melhorar autoridade local da Roxou em Presidente Prudente.

- Fortalecer SEO para eventos, bares, baladas, pagode, funk, sertanejo, música ao vivo e agenda local.

- Não quebrar nenhuma funcionalidade existente.