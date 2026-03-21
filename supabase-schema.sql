create extension if not exists pgcrypto;

create table if not exists public.break_in_requests (
  id uuid primary key default gen_random_uuid(),
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

create table if not exists public.break_in_resources (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.break_in_requests(id) on delete cascade,
  resource_type text not null,
  hours numeric(10,1) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists break_in_requests_created_at_idx
  on public.break_in_requests (created_at desc);

create index if not exists break_in_requests_status_idx
  on public.break_in_requests (status);

create index if not exists break_in_resources_request_id_idx
  on public.break_in_resources (request_id);
