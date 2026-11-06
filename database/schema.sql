-- LifeLink PostgreSQL foundation.
-- Run in Supabase SQL Editor. This schema is a starting point, not a substitute
-- for security review, clinical governance, or institutional verification.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('patient','donor','blood_bank','hospital','coordinator')),
  phone text,
  preferred_language text not null default 'en',
  created_at timestamptz not null default now()
);

create table if not exists public.donors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  blood_group text not null check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  city text not null,
  area text,
  is_available boolean not null default false,
  consent_to_alerts boolean not null default false,
  screening_status text not null default 'pending' check (screening_status in ('pending','centre_reviewed','expired')),
  created_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  organization_type text not null check (organization_type in ('hospital','blood_bank')),
  name text not null,
  registration_number text,
  address text not null,
  city text not null,
  phone text,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected','expired')),
  created_at timestamptz not null default now()
);

create table if not exists public.blood_inventory (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  blood_group text not null check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  units_available integer not null default 0 check (units_available >= 0),
  last_confirmed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(organization_id,blood_group)
);

create table if not exists public.emergency_requests (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  requester_id uuid not null references public.profiles(id),
  patient_name text,
  blood_group text not null check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  units integer not null check (units between 1 and 4),
  hospital_name text not null,
  area text not null,
  city text not null,
  contact_phone text not null,
  urgency text not null check (urgency in ('urgent','within_24h','planned')),
  status text not null default 'request_submitted' check (status in ('request_submitted','verification_pending','alerts_sent','donor_responded','blood_bank_confirmed','request_completed','request_cancelled')),
  verified_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.donor_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.emergency_requests(id) on delete cascade,
  donor_id uuid not null references public.donors(id),
  response text not null check (response in ('accepted','declined')),
  created_at timestamptz not null default now(),
  unique(request_id,donor_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.emergency_requests(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete cascade,
  channel text not null check (channel in ('in_app','push','sms')),
  delivery_status text not null default 'queued' check (delivery_status in ('queued','sent','delivered','failed','acknowledged')),
  provider_reference text,
  attempt_count integer not null default 0,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz
);

create table if not exists public.donation_history (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid not null references public.donors(id),
  organization_id uuid not null references public.organizations(id),
  donation_date date not null,
  verified_by uuid references public.profiles(id),
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.verification_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  reviewed_by uuid references public.profiles(id),
  document_reference text,
  status text not null check (status in ('pending','verified','rejected','expired')),
  notes text,
  reviewed_at timestamptz
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  created_at timestamptz not null default now()
);

-- Enable RLS. Add narrowly scoped policies only after the production auth
-- workflow and role claims have been implemented and security-tested.
alter table public.profiles enable row level security;
alter table public.donors enable row level security;
alter table public.organizations enable row level security;
alter table public.blood_inventory enable row level security;
alter table public.emergency_requests enable row level security;
alter table public.donor_responses enable row level security;
alter table public.notifications enable row level security;
alter table public.donation_history enable row level security;
alter table public.verification_records enable row level security;
alter table public.audit_logs enable row level security;

-- Intentionally no permissive policies are created here. With RLS enabled,
-- access is denied until reviewed policies are added. Do not disable RLS
-- for a public demo. Keep privileged keys on trusted server infrastructure.
