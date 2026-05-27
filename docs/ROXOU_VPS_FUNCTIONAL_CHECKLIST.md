# Roxou — Checklist Funcional Pós-Migração

Validar 100% destes itens em `beta.roxou.com.br` antes do swap DNS.
Reexecutar em `roxou.com.br` 1h após swap e 24h depois.

## Público
- [ ] Home (`/`) — hero, agenda, popular venues, ads
- [ ] Agenda (`/hoje`, `/semana`)
- [ ] Busca (filtros, debounce, categorias)
- [ ] Evento individual (`/evento/:slug`) — OG, .ics, WhatsApp share, Google Maps embed
- [ ] Local (`/local/:slug`, `/local/:slug/eventos` paginado)
- [ ] Expo2026 (home, programação, shows, ingressos, contato, notícia)
- [ ] Jogos (`/jogos`, `/jogo/:slug`, tabelas, locais de transmissão)
- [ ] Indica (`/indica`)
- [ ] Notícias (`/noticias`, `/noticia/:slug`)
- [ ] SEO Landing (`/seo/:cidade`)
- [ ] Perto de mim (geo)
- [ ] Sitemap (`/sitemap.xml`) — todas as URLs
- [ ] Robots.txt
- [ ] OG image 1200x630 renderizando no WhatsApp/Twitter/Facebook
- [ ] Footer (NT Aplicações + nav mobile com padding)

## Auth
- [ ] Signup email + verificação
- [ ] Login email/senha
- [ ] Login Google
- [ ] HIBP password check ativo
- [ ] Reset de senha
- [ ] Logout

## Transporte (V3)
- [ ] Solicitar carona (passageiro)
- [ ] Cadastro motorista
- [ ] Dashboard motorista
- [ ] Chat realtime carona
- [ ] Validação event_date + capacidade

## Comunidade
- [ ] Listar salas
- [ ] Enviar mensagem (rate-limit 5s)
- [ ] Realtime entre clientes
- [ ] Denúncia → flag
- [ ] Mute/ban (admin)

## Admin
- [ ] Login admin (contato@roxou.com.br)
- [ ] Dashboard (KPIs, alertas)
- [ ] Lista de eventos (filtros, periodo)
- [ ] Criar evento individual
- [ ] **Bulk flyers** — upload em lote sem travar UI
- [ ] OCR + extração de metadata
- [ ] Geração de legenda variada (não repete "Em breve")
- [ ] Geração de arte (story 9:16)
- [ ] Auto-duplicação detectada
- [ ] Lista de parceiros + alertas dormência 30d
- [ ] Eventou import
- [ ] Instagram Studio + Covers + Agenda + Publishing Hub
- [ ] Radar IA — filtros Arquivados/Histórico/Duplicados
- [ ] Aura Command Center
- [ ] AutoReels (geração de prompts)
- [ ] Editores (city_editor + allowed_city)
- [ ] Sugestões públicas
- [ ] Audit estabelecimentos

## IA
- [ ] `prudente-ai` modos: home, chat, studio
- [ ] `generate-description` em lote (10 eventos, sem texto repetido)
- [ ] `generate-art` story Roxou (sem texto poluído)
- [ ] `extract-flyer-metadata` OCR + IA
- [ ] `aura-organize-event`

## Crons (verificar logs `roxou-cron`)
- [ ] `aura-pulse` — cada 10min
- [ ] `aura-home-curation` — cada 15min
- [ ] `automatic-event-hunter` — 13h e 18h
- [ ] `partner-instagram-sync` — diário 4h
- [ ] `sync-football-matches` / `standings`
- [ ] `radar-ia-archiving` (DB function `archive_old_radar_scans`)

## Webhooks
- [ ] `instagram-webhook` validando `X-Hub-Signature-256` com `META_APP_SECRET`
- [ ] Meta dashboard apontando para URL nova

## Storage / Mídia
- [ ] Upload de flyer → bucket `uploads/events/`
- [ ] Upload de logo parceiro → `uploads/partners/`
- [ ] Renders Roxou Cortes → `/var/www/roxou/storage/renders/`
- [ ] Thumbnails geradas (webp)
- [ ] FFmpeg responde em `/api/ffmpeg/health`

## Mapas
- [ ] `RoxouVenueMap` (dark theme #1a1025)
- [ ] `RoxouNearbyEventsMap`
- [ ] `RoxouEventsHeatmap`
- [ ] `RoxouRideMap` (transporte)
- [ ] Maps key servida via `/api/maps/key` (autenticado)

## SEO / Performance
- [ ] Lighthouse mobile ≥ 90 (perf, SEO, a11y)
- [ ] JSON-LD WebSite/Event/LocalBusiness presente
- [ ] Title <60 chars, meta desc <160 chars
- [ ] H1 único por página
- [ ] Canonical em todas as páginas públicas
- [ ] Sem console.error
- [ ] Sem 404 em assets

## Segurança
- [ ] `https://api.roxou.com.br/api/env-check` (admin) — todas as flags `true`
- [ ] Tentativa anônima em qualquer Edge/`/api` admin → 401/403
- [ ] `/.env`, `/.git` bloqueados pelo Nginx → 404
- [ ] Logs sem tokens
- [ ] fail2ban ativo
- [ ] UFW: apenas 22/80/443

## Timezone
- [ ] Datas exibidas em `America/Sao_Paulo`
- [ ] `getStartOfTodaySP`, `isTodaySP`, `getDateKeySP` em uso
- [ ] Nenhum `toISOString()` / `setHours()` em código de filtro de data
