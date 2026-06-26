# Roxou Bio V1.1 — Refatoração Premium (SaaS)

## Objetivo

Transformar o módulo **Roxou Bio** em um produto premium SaaS totalmente integrado ao ecossistema Roxou.

**Prioridade máxima:** reutilizar tudo o que já existe no projeto.

O objetivo não é criar um novo sistema, mas evoluir o atual aproveitando Eventos, Reservas, Lista VIP, Excursões, Transportes, Notícias, CRM, Partner Pro e componentes compartilhados.

---

# ETAPA 0 — AUDITORIA OBRIGATÓRIA

Antes de escrever qualquer linha de código, realizar uma auditoria completa do projeto.

Mapear obrigatoriamente:

- componentes reutilizáveis
- hooks existentes
- services existentes
- utilitários
- providers
- contexto global
- consultas Supabase
- tabelas existentes
- RPCs existentes
- páginas semelhantes
- componentes de UI compartilhados
- animações
- gráficos
- sistema de QR
- analytics
- design system

Ao final da auditoria apresentar um resumo contendo:

- componentes reaproveitados
- hooks reaproveitados
- services reaproveitados
- queries reaproveitadas
- tabelas utilizadas
- arquivos que realmente precisarão ser alterados

Somente após essa auditoria iniciar a implementação.

---

# REGRAS GERAIS

## Não criar

- novas tabelas
- novas migrations
- novas RPCs
- novos services equivalentes
- novas consultas se já existir service
- novas APIs
- novas estruturas duplicadas

## Antes de criar qualquer código

Sempre verificar:

src/components

src/hooks

src/services

src/lib

src/utils

src/features

src/providers

Se existir algo parecido:

Reutilizar.

Nunca duplicar.

---

# ECONOMIA DE CRÉDITOS

Objetivo:

Modificar o menor número possível de arquivos.

Evitar:

- renomeações
- refatorações cosméticas
- mover arquivos
- reescrever páginas inteiras
- alterar código fora do escopo

Sempre preferir:

pequenas alterações incrementais.

---

# DEPENDÊNCIAS

Não instalar nenhuma biblioteca nova sem necessidade.

Antes verificar se já existe equivalente.

Somente instalar quando não houver absolutamente nenhuma solução existente.

Caso seja necessária uma dependência, justificar.

---

# CONSULTAS SUPABASE

Nunca escrever consultas diretamente nos componentes quando já existir um Service.

Sempre reutilizar:

src/services

Caso um service precise de pequena adaptação:

alterar o service existente.

Não criar outro.

---

# IMPACTO

Antes de alterar qualquer componente compartilhado:

verificar onde ele é utilizado.

Garantir que nenhuma funcionalidade existente será quebrada.

---

# BUILD

Todo código precisa terminar com:

bunx tsgo --noEmit

bun run build

Sem warnings novos.

Sem erros.

Sem regressões.

---

# PRINCÍPIOS

- Mobile First
- Glassmorphism Roxou
- Space Grotesk + Inter
- Design consistente
- Performance
- SEO
- Zero overflow
- Zero scroll horizontal
- Zero regressão

---

# ESCOPO

## A. Partner Bio Hub

Refatorar o PartnerBioHubPage.tsx em componentes menores.

Estrutura:

src/apps/partner/bio/

PartnerBioHubPage.tsx

components/

BioLivePreview.tsx

BioHomeDashboard.tsx

BioProfileEditor.tsx

BioLinksManager.tsx

BioMenuManager.tsx

BioAnalyticsPanel.tsx

BioQrStudio.tsx

BioCtaTemplates.tsx

BioSharePanel.tsx

hooks/

useBioPreview.ts

useBioAnalytics.ts

A primeira aba deixa de ser Perfil.

Agora será:

Home.

---

## B. Dashboard

Reutilizar analytics existentes.

Mostrar:

- visitas hoje
- visitas 7 dias
- cliques
- WhatsApp
- reservas
- lista VIP
- eventos ativos
- excursões
- cardápio
- gráfico 30 dias
- origem
- conversão

Tudo reutilizando os services existentes.

---

## C. Preview

Preview em tempo real.

Desktop:

Editor + celular lado a lado.

Mobile:

Bottom Sheet.

Atualização instantânea.

Sem reload.

---

## D. Perfil

Agrupar em:

Informações

Contato

Visual

Sem novas colunas.

Caso necessário usar metadata existente.

---

## E. Links

Transformar em cards.

Permitir:

- editar
- mover
- ocultar
- duplicar
- excluir

Ícones automáticos.

Sem alterar estrutura do banco.

---

## F. Cardápio

Layout inspirado no iFood.

Categorias.

Busca.

Fotos.

Preço.

Badges.

Tudo usando menu_categories e menu_items existentes.

---

## G. Analytics

Filtros:

Hoje

7 dias

30 dias

Mostrar:

- origem
- dispositivo
- horário
- CTR
- conversões
- links mais clicados
- WhatsApp
- reservas
- VIP
- transporte

Tudo processado no frontend.

---

## H. QR Studio

Reutilizar QR existente.

Modelos:

Bio

Menu

Reserva

Lista VIP

Evento

WhatsApp

Instagram

PIX

Mesa

Persistir usando bio_qr_codes.

---

## I. Templates

Criar templates rápidos.

Reserva

Lista VIP

Ingressos

Motorista

Cardápio

WhatsApp

PIX

Sem nova tabela.

---

## J. Bio Pública

Consumir automaticamente:

Eventos

Reservas

Lista VIP

Excursões

Transportes

Cardápio

Notícias

Nunca duplicar lógica.

Consumir apenas services existentes.

---

## K. UX

Adicionar:

Skeleton

Micro animações

Preview

Helmet

SEO

Open Graph

JSON-LD

Share nativo

Download QR

WhatsApp

Instagram

Sem instalar bibliotecas desnecessárias.

---

## L. Performance

React Query.

Memoização.

Lazy Loading.

Evitar renders desnecessários.

---

# FORA DO ESCOPO

Não implementar:

- pagamentos
- PIX automático
- motorista
- GPS
- embarque
- CRM novo
- caronas
- backend novo
- novas migrations

---

# RELATÓRIO FINAL

Ao concluir, informar obrigatoriamente:

## Reutilização

- componentes reutilizados
- hooks reutilizados
- services reutilizados
- queries reutilizadas
- utilitários reutilizados

## Alterações

- arquivos criados
- arquivos alterados
- dependências adicionadas

## Economia

Explicar quais partes foram reaproveitadas e quanto código deixou de ser criado por reutilização.

## Validação

Executar:

bunx tsgo --noEmit

bun run build

Realizar smoke test completo:

- Partner Bio
- Preview
- Bio pública
- Menu
- Analytics
- QR
- Compartilhamento
- Responsividade
- SEO

Entregar somente após confirmar que todo o fluxo funciona sem regressões.