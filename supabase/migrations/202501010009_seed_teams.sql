-- Seed 4 teams with distinct colors
insert into teams (name, color) values
  ('Red Team', '#ef4444'),
  ('Blue Team', '#3b82f6'),
  ('Green Team', '#10b981'),
  ('Yellow Team', '#f59e0b')
on conflict do nothing;

