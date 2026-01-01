-- Captures (append-only, authoritative log)
create table if not exists captures (
  id uuid primary key default gen_random_uuid(),
  pub_id uuid not null references pubs(id),
  team_id uuid not null references teams(id),
  drink_count int not null,
  media_url text not null,
  created_at timestamptz default now()
);

create index if not exists idx_captures_pub_created
on captures(pub_id, created_at);

-- Challenges
create table if not exists challenges (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('pub', 'global')),
  pub_id uuid references pubs(id),
  description text not null,
  is_consumed boolean default false,
  completed_by_team_id uuid references teams(id),
  created_at timestamptz default now()
);

-- Challenge attempts (two-step flow)
create table if not exists challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id),
  team_id uuid not null references teams(id),
  step text not null check (step in ('start', 'result')),
  success boolean,
  media_url text not null,
  created_at timestamptz default now()
);

-- Bonus points (global challenges only)
create table if not exists bonus_points (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id),
  challenge_id uuid not null references challenges(id),
  created_at timestamptz default now(),
  unique (challenge_id)
);