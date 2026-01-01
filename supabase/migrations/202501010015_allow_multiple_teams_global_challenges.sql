-- Allow multiple teams to complete the same global challenge
-- Remove the unique constraint on challenge_id
alter table bonus_points drop constraint if exists bonus_points_challenge_id_key;

-- Add unique constraint on (challenge_id, team_id) to prevent same team from completing twice
alter table bonus_points add constraint bonus_points_challenge_team_unique unique (challenge_id, team_id);

