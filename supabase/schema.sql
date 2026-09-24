create table if not exists game_state (
  id int primary key,
  version int not null,
  data jsonb not null
);

insert into game_state (id, version, data)
values (
  1,
  0,
  '{
    "settings": {
      "stage": "prep",
      "roundLengthSec": 65,
      "breakSec": 10,
      "nextGroupSize": null,
      "includeLeadersNextRound": false
    },
    "players": [],
    "rounds": [],
    "groups": [],
    "submissions": []
  }'::jsonb
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;
