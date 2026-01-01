-- Add media_url to bonus_points to store evidence for global challenges
alter table bonus_points add column if not exists media_url text;

