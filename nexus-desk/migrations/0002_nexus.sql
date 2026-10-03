create table if not exists profiles (
  user_id text primary key,
  display_name text not null default '',
  bio text not null default '',
  handle text not null default '',
  theme text not null default 'paper',
  created_at timestamptz not null default now()
);

create table if not exists connections (
  id text primary key,
  user_id text not null,
  platform text not null,
  handle text not null,
  display_name text not null default '',
  instance text not null default '',
  mode text not null default 'demo',
  status text not null default 'active',
  last_error text not null default '',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, platform, handle)
);

create index if not exists connections_user_idx on connections (user_id);

create table if not exists feed_posts (
  id text primary key,
  user_id text not null,
  connection_id text,
  platform text not null,
  external_id text not null,
  author_handle text not null,
  author_name text not null,
  content text not null,
  media_urls text not null default '[]',
  like_count integer not null default 0,
  repost_count integer not null default 0,
  reply_count integer not null default 0,
  liked boolean not null default false,
  bookmarked boolean not null default false,
  reposted boolean not null default false,
  is_own boolean not null default false,
  reply_to text,
  posted_at timestamptz not null default now(),
  unique (user_id, platform, external_id)
);

create index if not exists feed_posts_user_time_idx on feed_posts (user_id, posted_at desc);

create table if not exists publish_jobs (
  id text primary key,
  user_id text not null,
  content text not null,
  media_urls text not null default '[]',
  variants text not null default '{}',
  scheduled_at timestamptz,
  status text not null default 'sent',
  idempotency_key text,
  created_at timestamptz not null default now()
);

create unique index if not exists publish_jobs_idem_idx
  on publish_jobs (user_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists publish_targets (
  id text primary key,
  job_id text not null,
  user_id text not null,
  platform text not null,
  status text not null default 'pending',
  external_id text not null default '',
  error text not null default '',
  latency_ms integer not null default 0
);

create index if not exists publish_targets_job_idx on publish_targets (job_id);

create table if not exists drafts (
  id text primary key,
  user_id text not null,
  content text not null,
  platforms text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists lenses (
  id text primary key,
  user_id text not null,
  name text not null,
  platform text not null default '',
  query text not null default '',
  bookmarks_only boolean not null default false,
  created_at timestamptz not null default now()
);
