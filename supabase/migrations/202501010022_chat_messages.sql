-- Chat messages table for global player chat
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id),
  team_id uuid not null references teams(id),
  content text,
  media_url text,
  created_at timestamptz default now(),
  -- At least one of content or media_url must be present
  constraint content_or_media check (content is not null or media_url is not null)
);

-- Index for efficient pagination (newest first, then by id for stable cursor)
create index idx_chat_messages_created_at_desc on chat_messages(created_at desc, id desc);

-- Index for player lookups
create index idx_chat_messages_player_id on chat_messages(player_id);

-- Enable RLS
alter table chat_messages enable row level security;

-- Public read policy (matches existing pattern)
create policy "public read chat messages"
on chat_messages for select using (true);

-- Enable realtime
alter publication supabase_realtime add table chat_messages;
