-- Create a function to toggle game state
-- This avoids the issue with boolean primary key filtering in PostgREST
create or replace function toggle_game_state()
returns game_state
language plpgsql
security definer
as $$
declare
  result game_state;
begin
  update game_state
  set is_active = not is_active
  where id = true
  returning * into result;
  
  return result;
end;
$$;

-- Grant execute permission to anon users (for admin panel)
grant execute on function toggle_game_state() to anon;

