-- Add player_id to captures, challenge_attempts, and bonus_points tables
-- This allows us to track which individual player performed each action

alter table captures add column if not exists player_id uuid references players(id);
alter table challenge_attempts add column if not exists player_id uuid references players(id);
alter table bonus_points add column if not exists player_id uuid references players(id);

