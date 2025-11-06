-- Create profiles table to track email verification status
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  verified boolean not null default false,
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Public profile data including email verification flag';
comment on column public.profiles.verified is 'Whether the user has verified their email';

-- Enable Row Level Security and define policies for self-access
alter table public.profiles enable row level security;

-- Clean up existing policies if they exist
drop policy if exists "Profiles are viewable by owners" on public.profiles;
drop policy if exists "Profiles can be created by owners" on public.profiles;
drop policy if exists "Profiles can be updated by owners" on public.profiles;

-- Owners (auth.uid()) can view their own profile
create policy "Profiles are viewable by owners"
  on public.profiles for select
  using (auth.uid() = id);

-- Owners can insert their own profile row
create policy "Profiles can be created by owners"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Owners can update their own profile row
create policy "Profiles can be updated by owners"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);