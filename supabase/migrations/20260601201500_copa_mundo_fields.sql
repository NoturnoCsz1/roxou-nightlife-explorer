-- Campos opcionais para Copa do Mundo e transmissões alternativas
-- Todos os campos são nullable e opcionais — nenhum dado existente é alterado.

alter table sports_matches
  add column if not exists world_cup_phase text,
  add column if not exists alternative_stream_url text;

-- Índice para facilitar filtro de jogos da Copa por fase
create index if not exists idx_sports_matches_world_cup_phase
  on sports_matches (world_cup_phase)
  where world_cup_phase is not null;

comment on column sports_matches.world_cup_phase is
  'Fase da Copa do Mundo: grupos | oitavas | quartas | semifinal | terceiro | final';
comment on column sports_matches.alternative_stream_url is
  'Link alternativo de transmissão (ex: Cazé TV, outro canal)';
