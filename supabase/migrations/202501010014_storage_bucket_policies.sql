-- Enable storage bucket policies for direct client uploads
-- This allows authenticated users (via anon key) to upload files directly
-- to the evidence bucket, bypassing API route size limits

-- Create the evidence bucket if it doesn't exist (idempotent)
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', true)
on conflict (id) do nothing;

-- Allow public uploads to the evidence bucket
-- Note: In production, you may want to restrict this further with RLS policies
drop policy if exists "Allow public uploads to evidence bucket" on storage.objects;
create policy "Allow public uploads to evidence bucket"
on storage.objects for insert
with check (bucket_id = 'evidence');

-- Allow public reads from the evidence bucket
drop policy if exists "Allow public reads from evidence bucket" on storage.objects;
create policy "Allow public reads from evidence bucket"
on storage.objects for select
using (bucket_id = 'evidence');

-- Allow public deletes (for cleanup if needed)
drop policy if exists "Allow public deletes from evidence bucket" on storage.objects;
create policy "Allow public deletes from evidence bucket"
on storage.objects for delete
using (bucket_id = 'evidence');

