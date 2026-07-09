create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null unique,
  full_name text,
  role text not null default 'admin',
  password_hash text not null,
  is_active boolean not null default true,
  invite_token_hash text,
  invite_expires_at timestamptz,
  invited_at timestamptz,
  invite_accepted_at timestamptz
);

create index if not exists app_users_email_idx
  on public.app_users (lower(email));

create index if not exists app_users_is_active_idx
  on public.app_users (is_active);

alter table public.app_users
  add column if not exists invite_token_hash text;

alter table public.app_users
  add column if not exists invite_expires_at timestamptz;

alter table public.app_users
  add column if not exists invited_at timestamptz;

alter table public.app_users
  add column if not exists invite_accepted_at timestamptz;

create index if not exists app_users_invite_token_hash_idx
  on public.app_users (invite_token_hash);

create table if not exists public.shutdowns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null unique,
  start_date date,
  end_date date,
  description text,
  is_active boolean not null default true,
  break_in_requires_planner boolean not null default true,
  break_in_requires_coordinator boolean not null default true,
  break_in_requires_superintendent boolean not null default true,
  break_in_requires_manager boolean not null default true,
  late_work_requires_planner boolean not null default true,
  late_work_requires_coordinator boolean not null default true,
  late_work_requires_superintendent boolean not null default true,
  late_work_requires_manager boolean not null default false,
  work_removal_requires_planner boolean not null default true,
  work_removal_requires_coordinator boolean not null default true,
  work_removal_requires_superintendent boolean not null default true,
  work_removal_requires_manager boolean not null default true
);

alter table public.shutdowns
  add column if not exists updated_at timestamptz not null default now();

alter table public.shutdowns
  add column if not exists start_date date;

alter table public.shutdowns
  add column if not exists end_date date;

alter table public.shutdowns
  add column if not exists description text;

alter table public.shutdowns
  add column if not exists is_active boolean not null default true;

alter table public.shutdowns
  add column if not exists break_in_requires_planner boolean not null default true;

alter table public.shutdowns
  add column if not exists break_in_requires_coordinator boolean not null default true;

alter table public.shutdowns
  add column if not exists break_in_requires_superintendent boolean not null default true;

alter table public.shutdowns
  add column if not exists break_in_requires_manager boolean not null default true;

alter table public.shutdowns
  add column if not exists late_work_requires_planner boolean not null default true;

alter table public.shutdowns
  add column if not exists late_work_requires_coordinator boolean not null default true;

alter table public.shutdowns
  add column if not exists late_work_requires_superintendent boolean not null default true;

alter table public.shutdowns
  add column if not exists late_work_requires_manager boolean not null default false;

alter table public.shutdowns
  add column if not exists work_removal_requires_planner boolean not null default true;

alter table public.shutdowns
  add column if not exists work_removal_requires_coordinator boolean not null default true;

alter table public.shutdowns
  add column if not exists work_removal_requires_superintendent boolean not null default true;

alter table public.shutdowns
  add column if not exists work_removal_requires_manager boolean not null default true;

create unique index if not exists shutdowns_name_idx
  on public.shutdowns (lower(name));

create index if not exists shutdowns_start_date_idx
  on public.shutdowns (start_date desc);

create index if not exists shutdowns_is_active_idx
  on public.shutdowns (is_active);

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  shutdown_id uuid references public.shutdowns(id) on delete set null,
  request_type text not null,
  request_id uuid not null,
  subject text,
  recipient_count integer not null default 0,
  provider_id text
);

alter table public.email_events
  add column if not exists shutdown_id uuid references public.shutdowns(id) on delete set null;

alter table public.email_events
  add column if not exists request_type text;

alter table public.email_events
  add column if not exists request_id uuid;

alter table public.email_events
  add column if not exists subject text;

alter table public.email_events
  add column if not exists recipient_count integer not null default 0;

alter table public.email_events
  add column if not exists provider_id text;

create index if not exists email_events_shutdown_id_idx
  on public.email_events (shutdown_id);

create index if not exists email_events_created_at_idx
  on public.email_events (created_at desc);

create table if not exists public.request_activity_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  shutdown_id uuid references public.shutdowns(id) on delete set null,
  request_type text not null,
  request_id uuid not null,
  action text not null,
  actor text,
  details text
);

alter table public.request_activity_events
  add column if not exists shutdown_id uuid references public.shutdowns(id) on delete set null;

alter table public.request_activity_events
  add column if not exists request_type text;

alter table public.request_activity_events
  add column if not exists request_id uuid;

alter table public.request_activity_events
  add column if not exists action text;

alter table public.request_activity_events
  add column if not exists actor text;

alter table public.request_activity_events
  add column if not exists details text;

create index if not exists request_activity_events_shutdown_id_idx
  on public.request_activity_events (shutdown_id);

create index if not exists request_activity_events_created_at_idx
  on public.request_activity_events (created_at desc);

create table if not exists public.break_in_requests (
  id uuid primary key default gen_random_uuid(),
  shutdown_id uuid references public.shutdowns(id) on delete set null,
  created_at timestamptz not null default now(),
  wo_number text not null,
  wo_title text,
  reason text,
  consequence text,
  area text,
  priority text default 'P2',
  workgroup text,
  photo_name text,
  photo_data_url text,
  status text not null default 'SUBMITTED',
  progress_percent integer not null default 0,
  requestor_name text,
  requestor_email text,
  planner_comment text,
  coordinator_comment text,
  superintendent_comment text,
  manager_comment text
);

alter table public.break_in_requests
  add column if not exists photo_name text;

alter table public.break_in_requests
  add column if not exists shutdown_id uuid references public.shutdowns(id) on delete set null;

alter table public.break_in_requests
  add column if not exists photo_data_url text;

alter table public.break_in_requests
  alter column requestor_email drop not null;

alter table public.break_in_requests
  add column if not exists planner_comment text;

alter table public.break_in_requests
  add column if not exists coordinator_comment text;

alter table public.break_in_requests
  add column if not exists superintendent_comment text;

alter table public.break_in_requests
  add column if not exists manager_comment text;

alter table public.break_in_requests
  add column if not exists planner_decided_by text;

alter table public.break_in_requests
  add column if not exists planner_decided_at timestamptz;

alter table public.break_in_requests
  add column if not exists coordinator_decided_by text;

alter table public.break_in_requests
  add column if not exists coordinator_decided_at timestamptz;

alter table public.break_in_requests
  add column if not exists superintendent_decided_by text;

alter table public.break_in_requests
  add column if not exists superintendent_decided_at timestamptz;

alter table public.break_in_requests
  add column if not exists manager_decided_by text;

alter table public.break_in_requests
  add column if not exists manager_decided_at timestamptz;

create table if not exists public.break_in_resources (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.break_in_requests(id) on delete cascade,
  resource_type text not null,
  hours numeric(10,1) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.break_in_resources
  add column if not exists created_at timestamptz not null default now();

create index if not exists break_in_requests_created_at_idx
  on public.break_in_requests (created_at desc);

create index if not exists break_in_requests_status_idx
  on public.break_in_requests (status);

create index if not exists break_in_requests_shutdown_id_idx
  on public.break_in_requests (shutdown_id);

create index if not exists break_in_resources_request_id_idx
  on public.break_in_resources (request_id);

create table if not exists public.work_removal_requests (
  id uuid primary key default gen_random_uuid(),
  shutdown_id uuid references public.shutdowns(id) on delete set null,
  created_at timestamptz not null default now(),
  wo_number text not null,
  wo_title text,
  reason text,
  consequence text,
  area text,
  priority text default 'P2',
  workgroup text,
  status text not null default 'SUBMITTED',
  requestor_name text,
  requestor_email text,
  planner_comment text,
  coordinator_comment text,
  superintendent_comment text,
  manager_comment text
);

alter table public.work_removal_requests
  add column if not exists shutdown_id uuid references public.shutdowns(id) on delete set null;

alter table public.work_removal_requests
  add column if not exists planner_decided_by text;

alter table public.work_removal_requests
  add column if not exists planner_decided_at timestamptz;

alter table public.work_removal_requests
  add column if not exists coordinator_decided_by text;

alter table public.work_removal_requests
  add column if not exists coordinator_decided_at timestamptz;

alter table public.work_removal_requests
  add column if not exists superintendent_decided_by text;

alter table public.work_removal_requests
  add column if not exists superintendent_decided_at timestamptz;

alter table public.work_removal_requests
  add column if not exists manager_decided_by text;

alter table public.work_removal_requests
  add column if not exists manager_decided_at timestamptz;

create table if not exists public.work_removal_resources (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.work_removal_requests(id) on delete cascade,
  resource_type text not null,
  hours numeric(10,1) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.work_removal_resources
  add column if not exists created_at timestamptz not null default now();

create index if not exists work_removal_requests_created_at_idx
  on public.work_removal_requests (created_at desc);

create index if not exists work_removal_requests_status_idx
  on public.work_removal_requests (status);

create index if not exists work_removal_requests_shutdown_id_idx
  on public.work_removal_requests (shutdown_id);

create index if not exists work_removal_resources_request_id_idx
  on public.work_removal_resources (request_id);

create table if not exists public.late_work_requests (
  id uuid primary key default gen_random_uuid(),
  shutdown_id uuid references public.shutdowns(id) on delete set null,
  created_at timestamptz not null default now(),
  wo_number text not null,
  wo_title text,
  reason text,
  consequence text,
  area text,
  priority text default 'P2',
  workgroup text,
  status text not null default 'SUBMITTED',
  requestor_name text,
  requestor_email text,
  planner_comment text,
  coordinator_comment text,
  superintendent_comment text
);

alter table public.late_work_requests
  add column if not exists shutdown_id uuid references public.shutdowns(id) on delete set null;

alter table public.late_work_requests
  add column if not exists planner_decided_by text;

alter table public.late_work_requests
  add column if not exists planner_decided_at timestamptz;

alter table public.late_work_requests
  add column if not exists coordinator_decided_by text;

alter table public.late_work_requests
  add column if not exists coordinator_decided_at timestamptz;

alter table public.late_work_requests
  add column if not exists superintendent_decided_by text;

alter table public.late_work_requests
  add column if not exists superintendent_decided_at timestamptz;

create table if not exists public.late_work_resources (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.late_work_requests(id) on delete cascade,
  resource_type text not null,
  hours numeric(10,1) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.late_work_resources
  add column if not exists created_at timestamptz not null default now();

create index if not exists late_work_requests_created_at_idx
  on public.late_work_requests (created_at desc);

create index if not exists late_work_requests_status_idx
  on public.late_work_requests (status);

create index if not exists late_work_requests_shutdown_id_idx
  on public.late_work_requests (shutdown_id);

create index if not exists late_work_resources_request_id_idx
  on public.late_work_resources (request_id);
