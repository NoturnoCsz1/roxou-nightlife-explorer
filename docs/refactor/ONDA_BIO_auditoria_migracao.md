# Roxou Bio — auditoria comparativa e plano de migração (opção 1)

Data: 12/09/2026 · Somente leitura nos dois bancos. Nenhuma migration executada.

- Banco antigo (referência): `bapdgykghciiyvlqdrqx`
- Banco OFICIAL (fonte única de verdade): `foteitrhbfwbzzeanxve`

## 1. Tabelas antigas usadas pela Bio

| Tabela antiga | Papel | Linhas hoje |
|---|---|---|
| `bio_profiles` | perfil/slug/tema/toggles | 2 |
| `bio_links` | links manuais da Bio | 5 |
| `bio_qr_codes` | QR persistido | 0 |
| `menu_categories` / `menu_items` | cardápio | 0 / 0 |
| `bio_analytics_events` | cliques/visitas | 4 |

## 2. Equivalentes no banco oficial (verificados via API)

| Necessidade da Bio | Estrutura oficial existente | Situação |
|---|---|---|
| Estabelecimento, logo, capa, contatos, endereço, descrição | `venues` (31 colunas, inclui `logo_url`, `cover_image`, `instagram`, `whatsapp`, `website`, `latitude/longitude`) | existe |
| Slug público | `venues.slug` (ex.: `cultura`) | existe |
| Tenancy | `organizations` + `organization_members` | existe |
| Eventos | `events` (`venue_id`, `status`, `published_at`) | existe |
| Reservas | `reservations` / `reservation_types` | existe |
| Lista VIP | `vip_lists` / `vip_list_entries` | existe |
| Sorteios | `giveaways` / `giveaway_participants` | existe |
| Links | `short_links` (roxou.click) + `short_link_clicks` | existe |
| Métricas | `analytics_events` + `short_link_clicks` | existe |
| Cardápio | **não existe** módulo oficial | ausente (e vazio no antigo) |
| QR Code | — | não precisa de tabela: gerado da URL pública |

## 3. O que é reaproveitado (sem cópia)

Tudo acima. A Bio não guarda evento, reserva, VIP, sorteio, link, métrica nem
dados do estabelecimento — apenas referencia.

`venues.slug` passa a ser o slug público da Bio, então não existe segundo slug.

## 4. O que realmente não existe

1. Configuração de apresentação da Bio (título de chamada, texto, tema, cor,
   quais módulos aparecem, publicada ou não).
2. Uma forma de dizer **quais** links do encurtador aparecem na Bio de **qual**
   estabelecimento — hoje `short_links` não tem `venue_id`.

## 5. Migrations mínimas — `supabase/migrations-official/0005_venue_bio.sql`

- 1 tabela nova: `venue_bio_profiles` (1 linha por venue), com RLS por
  `organization_id` e GRANTs explícitos; `anon` sem acesso direto.
- 4 colunas em `short_links`: `venue_id`, `organization_id`, `show_on_bio`,
  `bio_position` (reaproveita o encurtador, não cria tabela de links).
- 1 RPC pública `public_get_venue_bio(slug)` — só Bio publicada de venue ativo.
- 1 RPC de escrita `partner_upsert_venue_bio(caller, venue, patch)` — valida o
  chamador em `organization_members` (owner/manager), igual ao padrão já usado
  em `partner_update_venue_profile`.

Nada além disso. Nenhuma tabela de eventos, cardápio, QR, métricas ou links.

## 6. Dados existentes a migrar

Auditoria do banco antigo:

| Bio | slug | tipo | ativa | vínculo |
|---|---|---|---|---|
| Bio Teste Roxou | `teste` | roxou_official | sim | nenhum (teste) |
| Cultura Prudente | `cultura-prudente` | partner | **não** | partner legado Cultura |

Os 5 links pertencem todos à Bio da Cultura e são rascunhos inválidos
(`#ingresso`, `#motorista`, três cópias duplicadas, 0 cliques).

Conteúdo real aproveitável da Cultura (Instagram, WhatsApp, cidade, logo) **já
está** no venue oficial `Cultura` (`slug: cultura`, organização vinculada).

**Recomendação: migração de dados = zero.** Não há conteúdo legítimo a
transportar; migrar traria lixo e links quebrados. A Bio da Cultura é criada
publicada no oficial, já apontando para os módulos reais.

## 7. Desligamento da base antiga

1. Aplicar `0005_venue_bio.sql` no oficial.
2. Reescrever o módulo Bio do Partner Pro para o cliente dedicado
   (`partnerSupabase`) e para as RPCs acima; remover `services/bio.ts` do fluxo
   do Partner Pro.
3. Publicar a Bio da Cultura e conferir `/{slug}`.
4. Marcar `bio_profiles`/`bio_links`/`bio_qr_codes` do banco antigo como
   somente leitura (uso histórico); o Partner Pro deixa de consultá-las.
5. Rotas públicas antigas de Bio permanecem servidas pelo site atual até a
   virada de domínio; nenhuma escrita nova acontece lá.

## 8. parceiro.click (após implementar rota por slug)

- DNS: registro `A`/`CNAME` de `parceiro.click` e `www.parceiro.click` para o
  mesmo servidor do Partner Pro.
- Nginx: `server_name parceiro.click;` servindo o build `dist-partner`, com
  fallback SPA (`try_files $uri /index.html`) e certificado TLS (Let's Encrypt).
- A rota `/{slug}` é pública e não passa pelo gate de login.
