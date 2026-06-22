Implementar correção definitiva do fluxo de descrição automática + arquivamento operacional de eventos passados no Admin/Partner Roxou.

OBJETIVO:

1. Corrigir o problema de eventos que já possuem descrição continuarem aparecendo como "Falta descrição".

2. Evitar gasto desnecessário de créditos de IA.

3. Melhorar velocidade dos botões "Gerar descrição", "Injetar hype" e "Adicionar descrição".

4. Arquivar/ocultar eventos passados das telas operacionais, mantendo acesso em Histórico, Relatórios e Analytics.

NÃO ALTERAR:

- Supabase RLS

- Auth

- Schema do banco

- Edge functions existentes

- Partner público

- VIP

- Expo

- Search

- Páginas públicas

- SEO

- Timezone SP/dateUtils

━━━━━━━━━━━━━━━━━━━━━━

1. HELPER CENTRAL DE DESCRIÇÃO

━━━━━━━━━━━━━━━━━━━━━━

Criar arquivo:

src/lib/eventDescription.ts

Funções:

hasEventDescription(event)

getEventDescriptionText(event)

stripHtml(value)

hasEventDescription deve retornar true se qualquer um destes campos tiver pelo menos 20 caracteres úteis após stripHtml + trim:

- description

- short_description

- generated_description

- ai_description

- caption

- social_caption

- metadata.description

- [metadata.ai](http://metadata.ai)_description

Ignorar como inválido:

- null

- undefined

- ""

- espaços

- "<p></p>"

- "<br>"

- "null"

- "undefined"

getEventDescriptionText(event) deve retornar a primeira descrição válida encontrada.

Logs apenas em DEV:

if ([import.meta.env.DEV](http://import.meta.env.DEV)) console.debug(...)

━━━━━━━━━━━━━━━━━━━━━━

2. DIFERENCIAR "TEM DESCRIÇÃO" DE "DESCRIÇÃO RICA"

━━━━━━━━━━━━━━━━━━━━━━

Hoje getChecklist(e).description exige:

- 80+ caracteres

- HTML rico

- marcador "O QUE VOCÊ PRECISA SABER" ou lista

Manter essa lógica apenas como:

descriptionRich

Uso:

- critério de "pronto para publicar"

- qualidade editorial

Para "Falta descrição", usar apenas:

hasEventDescription(event)

Substituir regra em:

src/apps/admin/eventos/list/helpers.ts

src/apps/admin/eventos/list/selectors.ts

src/apps/admin/eventos/list/EventosListBulkActions.tsx

src/apps/admin/eventos/list/EventosListRow.tsx

src/apps/admin/eventos/list/EventosListCompactRow.tsx

Também ajustar:

getMissingFields(event)

para não retornar "descrição" quando hasEventDescription(event) for true.

━━━━━━━━━━━━━━━━━━━━━━

3. OPTIMISTIC UPDATE

━━━━━━━━━━━━━━━━━━━━━━

Após gerar descrição com IA ou salvar manualmente:

- atualizar setEvents local imediatamente;

- remover badge "Falta descrição" sem reload;

- atualizar contador "Sem descrição";

- invalidar cache/query correta, se existir;

- sincronizar descrição principal em event.description quando possível.

Se IA gerar em outro campo, a UI deve passar a ler getEventDescriptionText(event).

━━━━━━━━━━━━━━━━━━━━━━

4. EVITAR GASTO DESNECESSÁRIO DE IA

━━━━━━━━━━━━━━━━━━━━━━

Antes de chamar IA:

- verificar hasEventDescription(event);

- se já existir descrição válida, mostrar confirmação:

  "Este evento já possui descrição. Deseja substituir?"

Não chamar IA antes da confirmação.

Bulk IA:

- processar apenas eventos sem descrição válida;

- ignorar automaticamente eventos que já possuem descrição;

- mostrar resumo final:

  geradas

  ignoradas

  falhas

Confirmação antes do bulk:

"Isso pode consumir créditos de IA. Apenas eventos sem descrição válida serão processados."

━━━━━━━━━━━━━━━━━━━━━━

5. FILA CLIENT-SIDE DE IA

━━━━━━━━━━━━━━━━━━━━━━

Criar:

src/apps/admin/eventos/list/useAiQueue.ts

Recursos:

- enqueue(eventId, action)

- cancel(eventId)

- retry(eventId)

- status por evento:

  idle

  queued

  running

  success

  error

Concorrência máxima:

2

Timeout:

45 segundos

Se falhar:

- não travar a fila inteira;

- permitir retry manual.

━━━━━━━━━━━━━━━━━━━━━━

6. BOTÕES RÁPIDOS

━━━━━━━━━━━━━━━━━━━━━━

Gerar descrição:

- se não tiver descrição, gera base;

- se já tiver descrição, pede confirmação para substituir.

Injetar hype:

- usar getEventDescriptionText(event) como entrada;

- se não houver descrição, gerar descrição base primeiro;

- não duplicar texto.

Adicionar descrição:

- criar QuickDescriptionDialog;

- modal leve com Textarea;

- salvar sem sair da lista;

- aplicar optimistic update.

Feedback no card:

running:

"Gerando descrição..."

success:

"Descrição adicionada"

error:

"Falhou — tentar novamente"

━━━━━━━━━━━━━━━━━━━━━━

7. BULK IA COM PROGRESSO

━━━━━━━━━━━━━━━━━━━━━━

Atualizar handleBulkGenerateDescriptions em:

src/apps/admin/eventos/list/useEventosListActions.ts

Comportamento:

- filtrar eventos com hasEventDescription === false;

- enfileirar via useAiQueue;

- mostrar progresso:

  "3 de 20 descrições geradas"

- concorrência 2;

- se uma falhar, continuar;

- ao final:

  "5 geradas, 15 ignoradas, 0 falhas"

━━━━━━━━━━━━━━━━━━━━━━

8. HELPER DE CICLO DE VIDA DO EVENTO

━━━━━━━━━━━━━━━━━━━━━━

Criar:

src/lib/eventLifecycle.ts

Funções:

isPastEvent(event)

isArchivedEvent(event)

isOperationalEvent(event)

getEventArchiveAge(event)

Regras:

isPastEvent:

- end_date < now()

OU

- date_time < now() - 1h

OU

- status === "completed"

isArchivedEvent:

- status === "archived"

OU

- archived_at definido

OU

- evento passado há mais de 30 dias

isOperationalEvent:

- não é passado

- não é arquivado

- status !== "archived"

getEventArchiveAge:

- retornar dias desde encerramento/data final.

Sem chamadas de banco.

Sem migrations.

Usar campos existentes:

date_time

start_date

end_date

status

completed_at

archived_at

━━━━━━━━━━━━━━━━━━━━━━

9. APLICAR ARQUIVAMENTO NO ADMIN

━━━━━━━━━━━━━━━━━━━━━━

Em selectors.ts:

Ocultar eventos passados/arquivados por padrão em:

- Dashboard

- Pendências

- Cards de Hoje

- Próximos 7 dias

- Ações rápidas

- Revisão operacional

- Contadores principais

- draftEvents

- featuredTodayEvents

- todayEvents

- upcomingEvents

- reviewInFiltered

Manter acessível em:

- chip "Mostrar arquivados/passados"

- dateFilter === "passados"

- collapsible "Eventos Passados"

- Analytics

- Logs

Adicionar badge visual:

"Arquivado · Encerrado em DD/MM/YYYY"

Para eventos antigos.

Regra 180 dias:

- eventos passados há mais de 180 dias só aparecem quando o usuário ativar:

  "Mostrar todos os arquivados"

Adicionar toggle no sheet de filtros avançados.

━━━━━━━━━━━━━━━━━━━━━━

10. APLICAR ARQUIVAMENTO NO PARTNER

━━━━━━━━━━━━━━━━━━━━━━

Filtrar via isOperationalEvent nas áreas operacionais:

PartnerHomePage:

- próxima reserva

- KPIs do dia

- alertas

- operação em tempo real

PartnerReservationsPage:

- ativas

- pendentes

- check-in

PartnerFilaPage:

- abertas

- fechadas

PartnerEventsPage:

- próximos

- em andamento

Manter acesso completo em:

- Histórico

- Relatórios

- Analytics

- Dashboard antigo

- Ferramentas antigas

━━━━━━━━━━━━━━━━━━━━━━

11. LOGS DEV

━━━━━━━━━━━━━━━━━━━━━━

Adicionar console.debug apenas em DEV para:

hasEventDescription:

- event_id

- campos detectados

- resultado

IA queue:

- event_id

- action

- tempo da chamada

- status final

Não logar em produção.

━━━━━━━━━━━━━━━━━━━━━━

12. ARQUIVOS NOVOS

━━━━━━━━━━━━━━━━━━━━━━

Criar:

src/lib/eventDescription.ts

src/lib/eventLifecycle.ts

src/apps/admin/eventos/list/useAiQueue.ts

src/apps/admin/eventos/list/QuickDescriptionDialog.tsx

Editar principais:

src/apps/admin/eventos/list/helpers.ts

src/apps/admin/eventos/list/selectors.ts

src/apps/admin/eventos/list/useEventosListActions.ts

src/apps/admin/eventos/list/EventosListBulkActions.tsx

src/apps/admin/eventos/list/EventosListRow.tsx

src/apps/admin/eventos/list/EventosListCompactRow.tsx

src/apps/admin/eventos/list/EventosListFilters.tsx

src/apps/partner/pages/PartnerHomePage.tsx

src/apps/partner/pages/PartnerReservationsPage.tsx

src/apps/partner/pages/PartnerFilaPage.tsx

src/apps/partner/pages/PartnerEventsPage.tsx

━━━━━━━━━━━━━━━━━━━━━━

13. VALIDAÇÃO

━━━━━━━━━━━━━━━━━━━━━━

Testar:

1. Evento com:

description = "Festa boa, venha curtir com sua turma."

→ não aparece como "Falta descrição".

2. Evento com HTML simples sem marcador:

<p>Show especial hoje à noite.</p>

→ não aparece como "Falta descrição".

3. Evento com:

<p></p>

→ continua como falta descrição.

4. Clicar "Gerar descrição" em evento já preenchido:

→ mostra confirmação "Substituir?"

→ não chama IA antes.

5. Bulk IA em 20 eventos, 15 já com descrição:

→ processa apenas 5.

→ toast: "5 geradas, 15 ignoradas, 0 falhas".

6. Evento de ontem:

→ some do Dashboard Admin e Home Partner.

→ aparece em Eventos Passados / Histórico / Relatórios.

7. Evento encerrado há mais de 180 dias:

→ aparece apenas com "Mostrar todos os arquivados".

8. Typecheck e build:

bun run typecheck

bun run build

Resultado esperado:

- "Falta descrição" fantasma corrigido.

- IA mais rápida e econômica.

- Botões não travam.

- Eventos passados saem das áreas operacionais.

- Dados históricos continuam acessíveis.