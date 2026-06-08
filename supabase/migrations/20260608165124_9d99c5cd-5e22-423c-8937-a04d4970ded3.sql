-- Realtime: allowlist explicit para tópicos community_%, presence_event_%, transport_%, aura_%
-- (apenas authenticated). Não altera a policy existente que cobre chat-%, football_chat_%
-- e aura_alerts_admin. Nenhum canal anônimo é liberado.

CREATE POLICY "Authenticated community/presence/transport/aura topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  topic LIKE 'community_%'
  OR topic LIKE 'presence_event_%'
  OR topic LIKE 'transport_%'
  OR (topic LIKE 'aura_%' AND topic <> 'aura_alerts_admin')
);