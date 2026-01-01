-- Enable RLS
alter table teams enable row level security;
alter table players enable row level security;
alter table pubs enable row level security;
alter table captures enable row level security;
alter table challenges enable row level security;
alter table challenge_attempts enable row level security;
alter table bonus_points enable row level security;
alter table game_state enable row level security;

-- Public read policies (MVP)
create policy "public read teams"
on teams for select using (true);

create policy "public read players"
on players for select using (true);

create policy "public read pubs"
on pubs for select using (true);

create policy "public read captures"
on captures for select using (true);

create policy "public read challenges"
on challenges for select using (true);

create policy "public read challenge attempts"
on challenge_attempts for select using (true);

create policy "public read bonus points"
on bonus_points for select using (true);

create policy "public read game state"
on game_state for select using (true);