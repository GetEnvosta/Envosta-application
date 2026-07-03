-- =============================================================================
-- ENVOSTA — Supabase initial schema (0001_init.sql)
-- Apply with: supabase db push   (or psql $SUPABASE_DB_URL -f this file)
-- Sources of truth: CLAUDE.md (business facts) · ENVOSTA_REBUILD_BRIEF.md
-- Conventions: money in integer cents; all tables RLS-enabled; mirrors keep
-- provider payloads in `raw jsonb` and are written ONLY by service-role code.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
create type plan_key as enum ('minimum','basic','business','growth');
create type user_role as enum ('admin','staff','client');
create type client_status as enum ('lead','onboarding','active','paused','cancelling','churned');
create type spot_status as enum ('open','reserved','taken');
create type job_status as enum ('queued','running','blocked','failed','done');
create type provisioning_step as enum
  ('register_domain','configure_dns','create_site','map_domain','issue_ssl',
   'studio_build','gbp_setup','monitoring','go_live');
create type domain_status as enum ('pending','registered','dns_configured','transferred_out','expired','failed');
create type site_status as enum ('pending','provisioned','building','live','suspended','deleted');
create type request_channel as enum ('call','text','email','portal');
create type request_status as enum ('new','acknowledged','in_progress','qa','completed','confirmed');
create type deliverable_type as enum ('service_page','gbp_post','review_campaign','monthly_report','site_edit');
create type deliverable_status as enum ('planned','draft','qa','approved','published','skipped');
create type lead_status as enum ('new','scorecard_sent','applied','call_booked','closed_won','downsold','closed_lost');

-- ---------------------------------------------------------------------------
-- HELPERS
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- Role helpers used by RLS. Profiles table defined below.
create or replace function current_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from user_profiles where user_id = auth.uid()
$$;

create or replace function current_client_id() returns uuid
language sql stable security definer set search_path = public as $$
  select client_id from user_profiles where user_id = auth.uid()
$$;

create or replace function is_staff() returns boolean
language sql stable as $$ select current_role() in ('admin','staff') $$;

-- ---------------------------------------------------------------------------
-- CONFIG MIRRORS (single source of truth lives in /config; these tables let
-- the DB enforce integrity and let dashboards join. Seeded below; app syncs.)
-- ---------------------------------------------------------------------------
create table plans (
  key             plan_key primary key,
  name            text not null,
  visible         boolean not null,
  setup_cents     integer not null default 0,
  monthly_cents   integer not null,
  currency        text not null default 'USD',          -- Open Decision: CAD/USD flag
  contents        jsonb not null default '{}'::jsonb,   -- structured plan contents
  stripe_product_id        text,
  stripe_price_monthly_id  text,
  stripe_price_setup_id    text,
  stripe_price_annual_id   text,                        -- 13 months for price of 12
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger t_plans_u before update on plans for each row execute function set_updated_at();

create table industries (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,                     -- 'hvac','roofing','legal',...
  name        text not null,
  family      text not null default 'construction',     -- 'construction','legal','professional'
  vocabulary  jsonb not null default '{}'::jsonb,       -- copy tokens per industry
  growth_cap  integer not null default 12,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger t_industries_u before update on industries for each row execute function set_updated_at();

-- Exclusivity ledger: one Growth client per industry per city. Real scarcity.
create table industry_spots (
  id           uuid primary key default gen_random_uuid(),
  industry_id  uuid not null references industries(id),
  city         text not null,
  region       text not null default 'AB',
  country      text not null default 'CA',
  status       spot_status not null default 'open',
  client_id    uuid,                                    -- fk added after clients
  reserved_until timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (industry_id, city, region, country)
);
create trigger t_spots_u before update on industry_spots for each row execute function set_updated_at();

-- Enforce the hard cap of taken Growth spots per industry.
create or replace function enforce_growth_cap() returns trigger
language plpgsql as $$
declare cap int; taken int;
begin
  if new.status = 'taken' then
    select growth_cap into cap from industries where id = new.industry_id;
    select count(*) into taken from industry_spots
      where industry_id = new.industry_id and status = 'taken'
        and id <> new.id;
    if taken >= cap then
      raise exception 'Growth cap (% spots) reached for this industry', cap;
    end if;
  end if;
  return new;
end $$;
create trigger t_spots_cap before insert or update on industry_spots
  for each row execute function enforce_growth_cap();

-- ---------------------------------------------------------------------------
-- CORE
-- ---------------------------------------------------------------------------
create table clients (
  id            uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name  text not null,
  email         text not null,
  phone         text,
  industry_id   uuid not null references industries(id),
  city          text not null,
  region        text not null default 'AB',
  plan_key      plan_key not null references plans(key),
  status        client_status not null default 'onboarding',
  stripe_customer_id text unique,
  baseline_calls_6mo integer,          -- powers the Growth Booked-Calls Make-Good
  guarantee_start_at timestamptz,      -- 6-month clock for the make-good
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_clients_industry on clients(industry_id);
create index idx_clients_plan on clients(plan_key);
create trigger t_clients_u before update on clients for each row execute function set_updated_at();

alter table industry_spots
  add constraint fk_spot_client foreign key (client_id) references clients(id);

-- Auth profile: maps Supabase auth.users to a role and (for clients) a client.
create table user_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       user_role not null default 'client',
  client_id  uuid references clients(id),
  full_name  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_role_needs_client check (role <> 'client' or client_id is not null)
);
create trigger t_profiles_u before update on user_profiles for each row execute function set_updated_at();

-- Scorecard funnel leads.
create table leads (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  business     text not null,
  email        text not null,
  phone        text,
  industry_id  uuid references industries(id),
  city         text,
  website_url  text,
  source       text,                                   -- warm/cold/content/dream100
  status       lead_status not null default 'new',
  baseline_calls_6mo integer,                          -- captured on application
  scorecard    jsonb,                                  -- filled audit payload
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger t_leads_u before update on leads for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- STRIPE MIRRORS (written only by the webhook/service code; raw kept verbatim)
-- ---------------------------------------------------------------------------
create table stripe_events (          -- idempotency ledger: process each once
  id          text primary key,       -- evt_...
  type        text not null,
  payload     jsonb not null,
  processed   boolean not null default false,
  error       text,
  received_at timestamptz not null default now()
);

create table stripe_customers (
  id          text primary key,       -- cus_...
  client_id   uuid references clients(id),
  email       text,
  raw         jsonb not null,
  synced_at   timestamptz not null default now()
);

create table stripe_subscriptions (
  id                  text primary key,   -- sub_...
  client_id           uuid references clients(id),
  stripe_customer_id  text references stripe_customers(id),
  plan_key            plan_key,
  status              text not null,      -- stripe-native status string
  current_period_end  timestamptz,
  cancel_at           timestamptz,
  canceled_at         timestamptz,
  raw                 jsonb not null,
  synced_at           timestamptz not null default now()
);
create index idx_subs_client on stripe_subscriptions(client_id);

create table stripe_invoices (
  id                 text primary key,    -- in_...
  client_id          uuid references clients(id),
  subscription_id    text references stripe_subscriptions(id),
  status             text,
  amount_due_cents   integer,
  amount_paid_cents  integer,
  hosted_invoice_url text,
  raw                jsonb not null,
  created_at         timestamptz,
  synced_at          timestamptz not null default now()
);
create index idx_invoices_client on stripe_invoices(client_id);

-- ---------------------------------------------------------------------------
-- OPENSRS MIRRORS
-- ---------------------------------------------------------------------------
create table domains (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references clients(id),
  domain           text not null unique,
  registrar        text not null default 'opensrs',
  status           domain_status not null default 'pending',
  registrant       jsonb,                 -- client legal details (client owns)
  nameservers      text[] not null default '{}',
  opensrs_order_id text,
  expires_at       timestamptz,
  auto_renew       boolean not null default true,
  raw              jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_domains_client on domains(client_id);
create trigger t_domains_u before update on domains for each row execute function set_updated_at();

create table opensrs_events (
  id         uuid primary key default gen_random_uuid(),
  domain_id  uuid references domains(id),
  action     text not null,               -- lookup/sw_register/set_ns/...
  request    jsonb,                       -- REDACTED: never store credentials
  response   jsonb,
  success    boolean not null,
  dry_run    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- WP.CLOUD MIRRORS
-- ---------------------------------------------------------------------------
create table sites (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id),
  domain_id       uuid references domains(id),
  wpcloud_site_id text unique,
  status          site_status not null default 'pending',
  primary_domain  text,
  ssl_active      boolean not null default false,
  php_version     text,
  raw             jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_sites_client on sites(client_id);
create trigger t_sites_u before update on sites for each row execute function set_updated_at();

create table wpcloud_events (
  id         uuid primary key default gen_random_uuid(),
  site_id    uuid references sites(id),
  action     text not null,
  request    jsonb,
  response   jsonb,
  success    boolean not null,
  dry_run    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- PROVISIONING ORCHESTRATOR (idempotent, resumable state machine)
-- ---------------------------------------------------------------------------
create table provisioning_jobs (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id),
  status        job_status not null default 'queued',
  current_step  provisioning_step not null default 'register_domain',
  steps         jsonb not null default '[]'::jsonb,  -- [{step,status,at,detail}]
  attempts      integer not null default 0,
  error         text,
  dry_run       boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_jobs_status on provisioning_jobs(status);
create trigger t_jobs_u before update on provisioning_jobs for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- SERVICE PROMISE: intake loop + SLA clock (this table IS the ticket system)
-- ---------------------------------------------------------------------------
create table service_requests (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id),
  channel         request_channel not null,
  description     text not null,
  status          request_status not null default 'new',
  sla_ack_due_at  timestamptz not null default now() + interval '4 hours',
  sla_done_due_at timestamptz,                -- set from plan on insert (below)
  acknowledged_at timestamptz,
  completed_at    timestamptz,
  confirmed_at    timestamptz,                -- confirmation sent back = loop closed
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_requests_client on service_requests(client_id);
create index idx_requests_status on service_requests(status);
create trigger t_requests_u before update on service_requests for each row execute function set_updated_at();

-- SLA per plan: basic <2 business days, business <1 business day (approximated
-- in interval form here; business-day math is refined app-side).
create or replace function set_request_sla() returns trigger
language plpgsql as $$
declare p plan_key;
begin
  select plan_key into p from clients where id = new.client_id;
  new.sla_done_due_at :=
    case p
      when 'business' then now() + interval '1 day'
      when 'growth'   then now() + interval '1 day'
      else now() + interval '2 days'
    end;
  return new;
end $$;
create trigger t_requests_sla before insert on service_requests
  for each row execute function set_request_sla();

-- ---------------------------------------------------------------------------
-- MONTHLY ENGINE: deliverables + VA QA queue
-- ---------------------------------------------------------------------------
create table deliverables (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id),
  type          deliverable_type not null,
  title         text not null,
  period        date not null,               -- first of month
  status        deliverable_status not null default 'planned',
  qa_user_id    uuid references auth.users(id),
  published_url text,
  due_at        timestamptz,
  published_at  timestamptz,
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_deliv_client_period on deliverables(client_id, period);
create index idx_deliv_status on deliverables(status);
create trigger t_deliv_u before update on deliverables for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- GATE METRICS (charter §5) — monthly snapshots + CAC ledger + live MRR view
-- ---------------------------------------------------------------------------
create table cac_entries (
  id             uuid primary key default gen_random_uuid(),
  month          date not null,
  spend_cents    integer not null default 0,
  hours          numeric not null default 0,
  hourly_cents   integer not null default 0,
  closed_clients integer not null default 0,
  notes          text,
  created_at     timestamptz not null default now()
);

create table gate_snapshots (
  id                 uuid primary key default gen_random_uuid(),
  month              date not null unique,
  mrr_cents_by_plan  jsonb not null,
  churn_pct          numeric,
  tickets_per_client numeric,
  cac_cents          integer,
  cac_payback_months numeric,
  gate               integer,               -- current gate number
  kill_flags         jsonb not null default '[]'::jsonb,
  created_at         timestamptz not null default now()
);

create or replace view live_mrr as
select c.plan_key,
       count(*)                             as active_clients,
       sum(p.monthly_cents)                 as mrr_cents
from clients c
join plans p on p.key = c.plan_key
where c.status = 'active'
group by c.plan_key;

create table audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor      text not null,                 -- user id / 'system' / 'webhook'
  action     text not null,
  entity     text not null,
  entity_id  text,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Model: service_role (server code, webhooks, orchestrator) bypasses RLS.
-- Staff/admin read-write via role. Clients read ONLY their own rows on the
-- tables that power the customer dashboard. Anon gets nothing (public site
-- reads plans/industries through server routes using service role).
-- ---------------------------------------------------------------------------
alter table plans              enable row level security;
alter table industries         enable row level security;
alter table industry_spots     enable row level security;
alter table clients            enable row level security;
alter table user_profiles      enable row level security;
alter table leads              enable row level security;
alter table stripe_events      enable row level security;
alter table stripe_customers   enable row level security;
alter table stripe_subscriptions enable row level security;
alter table stripe_invoices    enable row level security;
alter table domains            enable row level security;
alter table opensrs_events     enable row level security;
alter table sites              enable row level security;
alter table wpcloud_events     enable row level security;
alter table provisioning_jobs  enable row level security;
alter table service_requests   enable row level security;
alter table deliverables       enable row level security;
alter table cac_entries        enable row level security;
alter table gate_snapshots     enable row level security;
alter table audit_log          enable row level security;

-- Staff/admin: full read; write on operational tables.
create policy staff_read_all  on plans            for select using (is_staff());
create policy staff_read_ind  on industries       for select using (is_staff());
create policy staff_rw_spots  on industry_spots   for all    using (is_staff()) with check (is_staff());
create policy staff_rw_clients on clients         for all    using (is_staff()) with check (is_staff());
create policy staff_rw_profiles on user_profiles  for all    using (is_staff()) with check (is_staff());
create policy staff_rw_leads  on leads            for all    using (is_staff()) with check (is_staff());
create policy staff_read_sc   on stripe_customers for select using (is_staff());
create policy staff_read_ss   on stripe_subscriptions for select using (is_staff());
create policy staff_read_si   on stripe_invoices  for select using (is_staff());
create policy staff_read_dom  on domains          for select using (is_staff());
create policy staff_read_oe   on opensrs_events   for select using (is_staff());
create policy staff_read_sites on sites           for select using (is_staff());
create policy staff_read_we   on wpcloud_events   for select using (is_staff());
create policy staff_rw_jobs   on provisioning_jobs for all   using (is_staff()) with check (is_staff());
create policy staff_rw_req    on service_requests for all    using (is_staff()) with check (is_staff());
create policy staff_rw_deliv  on deliverables     for all    using (is_staff()) with check (is_staff());
create policy staff_rw_cac    on cac_entries      for all    using (is_staff()) with check (is_staff());
create policy staff_rw_gate   on gate_snapshots   for all    using (is_staff()) with check (is_staff());
create policy staff_read_audit on audit_log       for select using (is_staff());
create policy staff_read_sev  on stripe_events    for select using (is_staff());

-- Clients: own-row reads for the customer dashboard.
create policy client_own_profile on user_profiles for select using (user_id = auth.uid());
create policy client_own_client  on clients          for select using (id = current_client_id());
create policy client_own_subs    on stripe_subscriptions for select using (client_id = current_client_id());
create policy client_own_inv     on stripe_invoices  for select using (client_id = current_client_id());
create policy client_own_domains on domains          for select using (client_id = current_client_id());
create policy client_own_sites   on sites            for select using (client_id = current_client_id());
create policy client_own_req     on service_requests for select using (client_id = current_client_id());
create policy client_insert_req  on service_requests for insert with check (client_id = current_client_id());
create policy client_own_deliv   on deliverables     for select using (client_id = current_client_id());

-- ---------------------------------------------------------------------------
-- SEED — locked numbers from CLAUDE.md §2 (charter Rev 1.3+). DO NOT EDIT.
-- ---------------------------------------------------------------------------
insert into plans (key,name,visible,setup_cents,monthly_cents,contents) values
 ('minimum','Minimum', false,      0,   3600, '{"note":"hidden retention floor"}'),
 ('basic',  'Basic',   true,  150000,  29700, '{"layer":"hosting+site base"}'),
 ('business','Business',true, 150000,  59700, '{"layer":"marketing layer","pages_per_month":2}'),
 ('growth', 'Growth',  true,  250000, 347200, '{"layer":"full program","pages_per_month":4,"cap":12}');

insert into industries (slug,name,family) values
 ('hvac','HVAC','construction'),
 ('roofing','Roofing','construction');
