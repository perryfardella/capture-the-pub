-- Push notification subscriptions table
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  subscription jsonb not null,
  endpoint text not null unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (player_id)
);

create index if not exists idx_push_subscriptions_player_id
on push_subscriptions(player_id);

create index if not exists idx_push_subscriptions_endpoint
on push_subscriptions(endpoint);

-- Update updated_at timestamp
create or replace function update_push_subscription_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_push_subscriptions_updated_at
before update on push_subscriptions
for each row
execute function update_push_subscription_updated_at();

