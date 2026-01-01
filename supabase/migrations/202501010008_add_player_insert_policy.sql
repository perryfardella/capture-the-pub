-- Allow public inserts to players table (for joining the game)
-- In production, you may want to restrict this to authenticated users
create policy "public insert players"
on players for insert with check (true);

-- Allow public inserts to captures table (for capturing pubs)
create policy "public insert captures"
on captures for insert with check (true);

-- Allow public updates to pubs table (for updating ownership and drink count)
create policy "public update pubs"
on pubs for update using (true);

