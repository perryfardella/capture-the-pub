-- Fix foreign key constraints on player_id columns to allow player deletion
-- When a player is deleted, we want to keep the historical records but set player_id to NULL
-- This preserves the game history (captures, challenges, etc.) while allowing player cleanup

-- Drop existing foreign key constraints
alter table captures drop constraint if exists captures_player_id_fkey;
alter table challenge_attempts drop constraint if exists challenge_attempts_player_id_fkey;
alter table bonus_points drop constraint if exists bonus_points_player_id_fkey;

-- Re-add foreign key constraints with ON DELETE SET NULL
-- This allows deleting players while preserving historical game data
alter table captures
  add constraint captures_player_id_fkey
  foreign key (player_id)
  references players(id)
  on delete set null;

alter table challenge_attempts
  add constraint challenge_attempts_player_id_fkey
  foreign key (player_id)
  references players(id)
  on delete set null;

alter table bonus_points
  add constraint bonus_points_player_id_fkey
  foreign key (player_id)
  references players(id)
  on delete set null;
