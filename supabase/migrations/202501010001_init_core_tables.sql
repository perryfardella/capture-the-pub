-- Teams
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null
);

-- Players
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  team_id uuid not null references teams(id),
  created_at timestamptz default now()
);

-- Pubs
create table if not exists pubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  controlling_team_id uuid references teams(id),
  drink_count int not null default 0,
  is_locked boolean not null default false,
  locked_by_team_id uuid references teams(id)
);