-- Allow public updates to game_state (for admin panel)
-- In production, you may want to restrict this to authenticated admin users
create policy "public update game state"
on game_state for update using (true);

