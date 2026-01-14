-- Create admin_actions table for audit logging
create table if not exists admin_actions (
  id uuid primary key default gen_random_uuid(),
  action_type text not null, -- 'challenge_complete', 'challenge_reset', 'capture_undo', 'player_delete', 'player_reassign', 'pub_lock', 'pub_unlock', etc.
  description text not null, -- Human-readable description
  team_id uuid references teams(id), -- Team involved (if applicable)
  player_id uuid references players(id), -- Player involved (if applicable)
  pub_id uuid references pubs(id), -- Pub involved (if applicable)
  challenge_id uuid references challenges(id), -- Challenge involved (if applicable)
  metadata jsonb, -- Additional data about the action
  created_at timestamptz default now()
);

-- Enable RLS
alter table admin_actions enable row level security;

-- Public read policy (everyone can see admin actions for transparency)
create policy "public read admin actions"
on admin_actions for select using (true);

-- Create index for performance
create index if not exists idx_admin_actions_created_at on admin_actions(created_at desc);
create index if not exists idx_admin_actions_type on admin_actions(action_type);
