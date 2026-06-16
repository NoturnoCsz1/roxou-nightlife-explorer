# Roxou — Roadmap

Última atualização: 16/06/2026

## ✅ Concluído

### Refactor estrutural (Fases 0–8)
- **00–02** Baseline, aliases `@/`, camada `services/`
- **03A–C** Auditoria de estabelecimentos, lista e formulário de eventos consolidados
- **04** Cover renderer (templates: agenda, banner, cta, destaque, flyer, partners, storyV3, topRoles, weekend)
- **05–05B** V3 Home cinematográfica + consolidação
- **06A–H** Migração de páginas para `src/apps/admin/`
- **07** Otimização de bundle
- **08A–B** Remoção de shims de admin

### Partner Pro (Fases 9–10F)
- **09A–M** Scaffold, RLS, auth, dashboard MVP, edição de perfil, eventos, reservas, listas VIP, beta interno/fechado, subdomínio
- **10A–D** Onboarding, piloto admin, login email/senha, check-in + promoters
- **10E** Links públicos VIP + QR Code
- **10F** Experiência pública profissional + leads + LGPD
- **10F Complement** Vinculação a eventos + fechamento automático
- **FIX 10F** Auto-close real, abas de histórico, mobile

### Fixes recentes
- Performance da geração em lote por flyers (compressão + cache)
- Analytics do Partner Pro com métricas reais
- Navegação / ações de perfil do parceiro
- Overflow mobile na home pública
- Rota pública VIP 404

---

## 🎯 Fase 11 — Crescimento do Partner Pro

### 11A — Onboarding self-service
- Cadastro público de parceiro com verificação por email/WhatsApp
- Wizard de 4 passos (perfil → fotos → primeiro evento → publicação)
- Plano free vs. pro com gating de features

### 11B — Marketing automation (CRM de leads)
- Segmentação automática de leads (frequência, ticket médio estimado, recência)
- Disparo de WhatsApp via API oficial (template-based)
- Campanhas de reengajamento (30/60/90 dias)
- Opt-out LGPD nativo

### 11C — Financeiro do parceiro
- Cobrança de cover via Pix (integração com gateway)
- Repasse e relatório de fechamento por evento
- Histórico de transações + exportação CSV/PDF

### 11D — Programa de promoters 2.0
- Comissionamento por check-in (% configurável por lista)
- Ranking público mensal
- Link único de promoter com UTM próprio

---

## 🎯 Fase 12 — App público (V3) consolidação

### 12A — Conversão & retenção
- Push notifications (PWA + FCM) para eventos salvos/seguidos
- "Seguir parceiro" com feed cronológico
- Recomendação personalizada baseada em histórico

### 12B — Social
- Stories de eventos (24h) criados pelos parceiros
- Check-in social ("Quem vai")
- Avaliações pós-evento

### 12C — Monetização
- Eventos em destaque pago (boost)
- Anúncios nativos (`AdBanner` já existente) com inventário próprio
- Pacote "Roxou Indica Premium" para parceiros

---

## 🎯 Fase 13 — Expansão multi-cidade

- Onboarding de 3 novas cidades-alvo (Bauru, Marília, Araçatuba)
- SEO local por cidade (landing pages dinâmicas já existentes)
- Sistema de city manager (já existe `city_editor`, expandir UI)
- Dashboard executivo por cidade

---

## 🎯 Fase 14 — IA & automação avançada

- **Aura Predict** — previsão de público por evento (ML)
- **Aura Pricing** — sugestão dinâmica de preço de cover/mesa
- **Radar IA v2** — captação automática de eventos do Instagram com publicação 1-click
- Chat IA público ("o que rolar hoje em Prudente?")

---

## 🛠 Débitos técnicos

- Migração final dos shims de admin restantes (auditoria pós-08B)
- Cobertura de testes (vitest) em `services/` e `partner/services/`
- Storybook para componentes do Partner Pro
- Lighthouse mobile ≥ 90 em todas as rotas públicas
- Edge function `sitemap` com cache mais agressivo

---

## ❌ Fora de escopo (rejeitado)

- Migrar para Next.js / Remix (mantido Vite + React Router)
- Backend próprio em Node.js (mantido Lovable Cloud / Supabase)
- App nativo iOS/Android (foco em PWA)
