create table if not exists game_state (
  id boolean primary key default true,
  is_active boolean not null
);

insert into game_state (id, is_active)
values (true, false)
on conflict (id) do nothing;