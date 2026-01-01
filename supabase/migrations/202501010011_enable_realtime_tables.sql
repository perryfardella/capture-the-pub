-- Enable realtime for pubs, captures, and bonus_points tables
alter publication supabase_realtime add table pubs;
alter publication supabase_realtime add table captures;
alter publication supabase_realtime add table bonus_points;

