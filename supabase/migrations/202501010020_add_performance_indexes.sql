-- Add performance indexes for frequently queried columns
-- These indexes will speed up queries during active gameplay

-- Index for filtering captures by team (used in activity feed and team stats)
create index if not exists idx_captures_team_id on captures(team_id);

-- Index for filtering challenge attempts by team
create index if not exists idx_challenge_attempts_team_id on challenge_attempts(team_id);

-- Composite index for bonus points lookups by team and challenge
create index if not exists idx_bonus_points_team_challenge on bonus_points(team_id, challenge_id);

-- Index for finding push subscriptions by player (used for cleanup)
create index if not exists idx_push_subscriptions_player_id on push_subscriptions(player_id);

-- Index for finding players by team (used in scoreboard and admin panel)
create index if not exists idx_players_team_id on players(team_id);
