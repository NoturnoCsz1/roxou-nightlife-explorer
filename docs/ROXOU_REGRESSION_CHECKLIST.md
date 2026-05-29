# ✅ Roxou — Checklist de Regressão

Use **antes** e **depois** de cada alteração relevante. Marque `[x]` quando validado.

## 🏠 Home & Navegação
- [ ] Home mobile carrega sem erro de console (`/`)
- [ ] Home desktop carrega (largura ≥ 1024px)
- [ ] Hero/carrossel de eventos renderiza
- [ ] Seção "Eventos de Hoje" aparece OU mostra estado vazio elegante
- [ ] Bottom nav (mobile) e top nav (desktop) funcionam
- [ ] Pills de data (Hoje / Amanhã / Semana) filtram corretamente

## 📅 Agenda & Eventos
- [ ] `/agenda` carrega lista de eventos futuros
- [ ] Filtros de data funcionam (timezone SP)
- [ ] Página de evento `/evento/:slug` abre
- [ ] Botões de WhatsApp, calendário (.ics) e Google Maps funcionam
- [ ] Sugestões de eventos relacionados aparecem

## 🤖 IA (Aura)
- [ ] `/ia` abre o chat
- [ ] Aura responde com modelos Lovable AI
- [ ] Sugestões rápidas funcionam

## 📰 Notícias & Expo
- [ ] `/noticias` lista notícias
- [ ] `/noticia/:slug` abre matéria
- [ ] `/expo2026` carrega hot site
- [ ] `/expo2026/shows`, `/programacao`, `/ingressos` abrem

## 🚗 Transporte (Carona)
- [ ] `/pedir-carona` redireciona para `/agenda` quando sem evento
- [ ] Com `eventId`/`eventSlug`, formulário abre
- [ ] GPS pede permissão e mostra fallback manual em caso de erro
- [ ] Mensagem de erro de overlay Android é clara
- [ ] `/cadastro-motorista` valida CPF, telefone, placa
- [ ] Cadastro exige selfie + foto do veículo + foto da placa
- [ ] Motorista entra como `pending`

## 🛠 Admin
- [ ] `/admin/login` autentica
- [ ] `/admin/dashboard` carrega métricas
- [ ] `/admin/eventos` lista eventos
- [ ] `/admin/eventos/novo` e `/novo/lote` abrem
- [ ] Upload em lote com IA gera descrições
- [ ] `/admin/instagram?tab=estudio` (Roxou Studio) gera story 9:16
- [ ] Story preserva: badge "AURA INDICA", branding Roxou, CTA, dia da semana

## 🌎 Timezone
- [ ] Datas exibidas em America/Sao_Paulo (-03:00)
- [ ] Filtros "Hoje" usam helpers de `@/lib/dateUtils`
- [ ] Nenhum `getDay()`/`toISOString()` introduzido para lógica de dia civil

## 🔐 Auth & Segurança
- [ ] Login Google funciona
- [ ] RLS via `public.has_role()` intacta
- [ ] Editores com `allowed_city` veem apenas sua cidade
