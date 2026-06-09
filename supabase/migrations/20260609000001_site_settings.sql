-- Global site/brand settings as a key-value JSONB store. Server-only access
-- (service role); no anon/authenticated RLS policies are granted. First use:
-- brand social-media links, read by the marketing footer.
create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
-- Intentionally NO policies: only the service role (server) may read/write.

comment on table public.site_settings is 'Global site/brand settings (key-value JSONB). Server-only via service role.';

insert into public.site_settings (key, value)
values ('social_links', '{}'::jsonb)
on conflict (key) do nothing;
