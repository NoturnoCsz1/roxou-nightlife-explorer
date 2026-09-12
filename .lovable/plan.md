# Partner Pro — auditoria e finalização das ferramentas operacionais

Auditoria feita direto na base oficial (`foteitrhbfwbzzeanxve`, acesso público) e no código.
Nada foi alterado, nenhuma migration criada, nenhum deploy.

## 1. Mapa por módulo

| Módulo | Estrutura oficial existente | O que funciona | O que está quebrado/faltando | Precisa migration? |
| --- | --- | --- | --- | --- |
| Reservas | `reservations`, `reservation_types`, `reservation_settings`, enums de status/pagamento/depósito | Leitura (listas, tipos, configurações) | **Todas as ações de escrita falham**: o app chama funções que não existem na base oficial (criar, editar, mudar status, check-in, pagamento, liberar mesa, salvar configurações e tipos, disponibilidade). Só existem de verdade `partner_reservation_set_status` e `partner_reservation_checkin` | Sim (mínima) |
| Atendimento / fila | `reservation_waitlist` (nome, telefone, pessoas, tipo, status, avisado em, expira em) | Leitura da fila | Não existe ação de adicionar, chamar, atender, cancelar ou converter em reserva; tela só mostra estado vazio | Sim (mínima) |
| Equipe e acessos | `organizations`, `organization_members`, `organization_invitations`, `users`, papéis oficiais | Sessão e permissões já resolvidas | Tela sem listagem real, sem criar acesso, sem revogar, sem trocar função; "Revogar tudo" sem confirmação forte | A confirmar (provavelmente só leitura/escrita direta com as regras já existentes) |
| Eventos | `public.events` (venue_id, status, start_date, end_date) | Leitura por estabelecimento | Carrega no máximo 300 registros numa lista única, sem separação Próximos / Acontece agora / Pendentes / Passados e sem paginação | Não |
| Eventos na Bio | `venue_bio_profiles` + `public_get_venue_bio` | Próximos eventos publicados | Não há separação de "acontece agora" nem opção de exibir eventos anteriores | Sim (1 coluna de preferência) |
| Sorteios | `giveaways`, `giveaway_participants`, `giveaway_draws`, `giveaway_referrals` (com `venue_id`, prêmio, período, data do sorteio, evento) | Listagem básica e resultado | Sem visão por situação, sem contagem de participantes clara, sem link público/copiar, sem caminho para pedir um sorteio novo | Sim, se você quiser o pedido registrado no banco |
| Lista VIP | `vip_lists`, `vip_list_entries`, `promoter_profiles`, enums de situação | Leitura de listas, participantes e promoters; check-in e mudança de situação de participante | **Criar lista, editar lista, abrir/encerrar, adicionar participante, criar/editar promoter e métricas de promoter chamam funções inexistentes**; fluxo espalhado em 9 telas | Sim (mínima) |

## 2. Causa raiz principal

Quando o Partner Pro migrou para a base oficial, os serviços continuaram chamando as funções do banco antigo
(`partner_create_reservation`, `partner_create_vip_list`, `partner_add_vip_entry`, `partner_upsert_promoter_profile`, etc.).
Essas funções **não existem** na base oficial — por isso "Criar reserva manual", fila, criação de lista VIP e promoters
simplesmente não funcionam. As leituras funcionam porque são consultas diretas às tabelas.

Na base oficial existem hoje apenas: `partner_reservation_set_status`, `partner_reservation_checkin`,
`partner_vip_entry_set_status`, `partner_vip_entry_checkin`, `partner_promoter_set_active`,
`partner_update_venue_profile`, `partner_upsert_venue_bio`, `public_get_venue_bio`, `execute_giveaway_draw`.

## 3. Como pretendo corrigir (sem duplicar nada)

**Escritas que faltam:** as tabelas oficiais já têm regras de acesso por organização, então a maior parte das ações
passa a ser gravação direta na tabela oficial correspondente, respeitando exatamente as mesmas regras — sem
funções novas, sem tabelas novas, sem banco paralelo. Onde a regra oficial exigir função (mudança de situação e
check-in), uso as que já existem.

**Migrations realmente necessárias (proposta mínima, entregue para você aprovar antes de rodar):**
1. Uma coluna de preferência em `venue_bio_profiles` para exibir eventos anteriores na Bio.
2. Opcional: registro de "pedido de sorteio" reaproveitando estrutura existente — só se você quiser o pedido
   gravado; caso contrário o botão abre contato direto com a equipe Roxou.

## 4. Entrega proposta, em ondas

- **Onda A — Reservas + Fila:** ações funcionando (criar reserva manual, confirmar, check-in, liberar mesa,
  adicionar/chamar/atender/cancelar na fila, converter fila em reserva), tela principal focada em hoje,
  próximas chegadas, pendentes, ocupação e próxima reserva; menus reagrupados em Reservas / Operação / Configuração.
- **Onda B — Equipe e acessos:** lista real de acessos, criar, revogar (com confirmação forte) e trocar função.
- **Onda C — Eventos:** histórico completo com abas Próximos / Acontece agora / Pendentes / Passados e carregamento
  por páginas; publicado continua só leitura.
- **Onda D — Bio:** blocos Próximos eventos / Acontece agora / Eventos anteriores (opcional pelo parceiro).
- **Onda E — Sorteios:** painel útil por situação, com participantes, link público, copiar e CTA "Solicitar novo sorteio".
- **Onda F — Lista VIP simplificada:** uma tela principal com listas abertas, criação em um fluxo único e tudo o mais
  dentro da própria lista (participantes, promoters, check-in, link, histórico).

Cada onda termina com verificação de tipos, testes (incluindo novos dos fluxos corrigidos) e build do Partner.
Sem deploy.

## 5. Depende de decisão sua

1. Aprovar o caminho de escrita direta nas tabelas oficiais (em vez de criar funções novas no banco).
2. "Solicitar novo sorteio": registro no banco ou apenas contato direto com a equipe Roxou?
3. Confirmar a ordem das ondas (sugiro A → B → C → D → E → F) ou pedir que eu faça tudo de uma vez.
